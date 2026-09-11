/**
 * store.tsx — one context holding everything the views read.
 *
 * Three sources feed it, same division of responsibility as the desktop
 * app's store:
 *
 *   1. Pairing (lib/pairing.ts) — the base URL and token typed in once.
 *   2. A Server-Sent Events stream carries everything that happens live:
 *      messages, parses, skips, fills, status changes, equity samples.
 *   3. Ordinary GETs (`/api/state`, polled) fill in durable state — the
 *      things that survive a restart and must come from MT5, not from this
 *      app's own optimistic record of what it asked for.
 *
 * What's different from the desktop version: there is no Electron process to
 * report "the engine crashed" — on a phone, "can't reach it" and "it isn't
 * running" and "it's a different engine now and the token is stale" all look
 * identical from the network's point of view, so `ConnectionStatus` names
 * them as precisely as an HTTP response allows and the UI is responsible for
 * telling the user which one it probably is.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  createApi,
  type Api,
  type EngineState,
  type LogLevel,
  type ParsedSignal,
  type Position,
  type TradeEvent,
  type TradingAccount,
} from "./api";
import { clearPairing, loadPairing, savePairing, type Pairing } from "./pairing";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type ConnectionStatus =
  | "unpaired"
  | "connecting"
  | "online"
  | "unauthorized"
  | "unreachable";

export type LogLine = { id: number; ts: number; level: LogLevel; text: string };

export type FeedItem =
  | { kind: "message"; id: number; ts: number; channel: string; text: string }
  | { kind: "signal"; id: number; ts: number; signal: ParsedSignal }
  | { kind: "skip"; id: number; ts: number; channel: string; reason: string }
  | { kind: "no_signal"; id: number; ts: number; channel: string; reason: string }
  | { kind: "trade"; id: number; ts: number; trade: TradeEvent };

export type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };

type Ctx = {
  status: ConnectionStatus;
  unauthorizedReason: string | null;
  pairing: Pairing | null;
  api: Api | null;
  state: EngineState | null;
  stateAt: number | null;
  streaming: boolean;
  online: boolean;
  logs: LogLine[];
  feed: FeedItem[];
  trades: TradeEvent[];
  livePositions: Position[] | null;
  authPrompt: string | null;
  toasts: Toast[];
  /** Every configured account, newest state from /api/state. */
  accounts: TradingAccount[];
  /** The account the user is looking at, or null for "all accounts". */
  focusedAccount: string | null;
  setFocusedAccount: (id: string | null) => void;
  refresh: () => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  clearAuthPrompt: () => void;
  pair: (next: Pairing) => Promise<{ ok: boolean; message?: string }>;
  unpair: () => void;
  run: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
};

const DeskContext = createContext<Ctx | null>(null);

const MAX_LOGS = 800;
const MAX_FEED = 400;
const MAX_TRADES = 200;
const SNAPSHOT_INTERVAL_MS = 10_000;

const EVENT_KINDS = [
  "log", "message", "signal", "skip", "no_signal", "trade",
  "mt5_status", "telegram_status", "telegram_auth", "telegram_auth_done",
  "telegram_auth_timeout", "equity", "engine", "config", "positions",
] as const;

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function DeskProvider({ children }: { children: ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(() => loadPairing());
  const [status, setStatus] = useState<ConnectionStatus>(pairing ? "connecting" : "unpaired");
  const [unauthorizedReason, setUnauthorizedReason] = useState<string | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [stateAt, setStateAt] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [livePositions, setLivePositions] = useState<Position[] | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  // Deliberately NOT persisted to localStorage: a stale focus on an account
  // that has since been deleted would show an empty screen with no reason.
  const [focusedAccount, setFocusedAccount] = useState<string | null>(null);
  const accounts = state?.accounts ?? [];
  const [toasts, setToasts] = useState<Toast[]>([]);

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  const api = useMemo(() => (pairing ? createApi(pairing) : null), [pairing]);

  /* ---- online/offline -------------------------------------------------- */

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /* ---- toasts ------------------------------------------------------------ */

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (text: string, tone: Toast["tone"] = "info") => {
      const id = nextId();
      setToasts((current) => [...current.slice(-3), { id, text, tone }]);
      if (tone !== "error") setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const handleUnauthorized = useCallback((message: string) => {
    setStatus("unauthorized");
    setUnauthorizedReason(message);
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, success?: string): Promise<T | null> => {
      try {
        const result = await action();
        if (success) toast(success, "ok");
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleUnauthorized("The engine rejected this app's token. It rotates every time the engine restarts, so re-pair with the current one.");
          return null;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Something went wrong.";
        toast(message, "error");
        return null;
      }
    },
    [toast, handleUnauthorized],
  );

  /* ---- pairing actions --------------------------------------------------- */

  const pair = useCallback(
    async (next: Pairing): Promise<{ ok: boolean; message?: string }> => {
      const probe = createApi(next);
      try {
        const health = await probe.health();
        if (!health.ok) {
          return { ok: false, message: "The engine answered but reported itself unhealthy." };
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return { ok: false, message: "That address answered, but the token was wrong." };
        }
        return {
          ok: false,
          message:
            error instanceof ApiError
              ? error.message
              : "Couldn't reach that address. Check the URL and that the phone can see the engine's network.",
        };
      }
      savePairing(next);
      setPairing(next);
      setUnauthorizedReason(null);
      setStatus("connecting");
      return { ok: true };
    },
    [],
  );

  const unpair = useCallback(() => {
    clearPairing();
    setPairing(null);
    setState(null);
    setStateAt(null);
    setStatus("unpaired");
    setUnauthorizedReason(null);
  }, []);

  /* ---- snapshot ------------------------------------------------------------ */

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      const next = await api.state();
      setState(next);
      setStateAt(Date.now());
      setStatus((current) => (current === "unpaired" ? current : "online"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized(
          "The engine rejected this app's token. It rotates every time the engine restarts, so re-pair with the current one.",
        );
        return;
      }
      // A transport failure (status 0) or 5xx: the engine is unreachable or
      // unwell. Don't clear the last-known state — showing it stale is more
      // honest than blanking a screen that was working a moment ago.
      setStatus((current) => (current === "unauthorized" ? current : "unreachable"));
    }
  }, [api, handleUnauthorized]);

  useEffect(() => {
    if (!api) return;
    void refresh();
    const timer = setInterval(refresh, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [api, refresh]);

  /* ---- live stream ----------------------------------------------------- */

  useEffect(() => {
    if (!api) {
      setStreaming(false);
      return;
    }

    const source = new EventSource(api.streamUrl(0));
    let lastSeq = 0;

    const handle = (kind: string) => (event: MessageEvent) => {
      let payload: { seq: number; ts: number; data: unknown };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.seq <= lastSeq) return;
      lastSeq = payload.seq;

      const ts = payload.ts * 1000;
      const data = payload.data as Record<string, unknown>;

      switch (kind) {
        case "log": {
          const line: LogLine = {
            id: nextId(), ts,
            level: (data.level as LogLevel) ?? "info",
            text: String(data.text ?? ""),
          };
          setLogs((current) => [...current, line].slice(-MAX_LOGS));
          break;
        }
        case "message":
          setFeed((current) => [
            ...current,
            { kind: "message" as const, id: nextId(), ts, channel: String(data.channel ?? ""), text: String(data.text ?? "") },
          ].slice(-MAX_FEED));
          break;
        case "signal":
          setFeed((current) => [
            ...current,
            { kind: "signal" as const, id: nextId(), ts, signal: data as unknown as ParsedSignal },
          ].slice(-MAX_FEED));
          break;
        case "skip":
        case "no_signal":
          setFeed((current) => [
            ...current,
            { kind: kind as "skip" | "no_signal", id: nextId(), ts, channel: String(data.channel ?? ""), reason: String(data.reason ?? "") },
          ].slice(-MAX_FEED));
          break;
        case "trade": {
          const trade = data as unknown as TradeEvent;
          setTrades((current) => [...current, trade].slice(-MAX_TRADES));
          setFeed((current) => [...current, { kind: "trade" as const, id: nextId(), ts, trade }].slice(-MAX_FEED));
          break;
        }
        case "mt5_status":
          setState((current) => current ? { ...current, mt5: { status: String(data.status ?? ""), detail: String(data.detail ?? "") } } : current);
          break;
        case "telegram_status":
          setState((current) => current ? { ...current, telegram: { ...current.telegram, status: String(data.status ?? ""), detail: String(data.detail ?? "") } } : current);
          break;
        case "telegram_auth":
          setAuthPrompt(String(data.prompt ?? "Telegram login code"));
          break;
        case "telegram_auth_done":
          setAuthPrompt(null);
          break;
        case "telegram_auth_timeout":
          setAuthPrompt(null);
          toast("The Telegram login timed out. Reconnect to request a new code.", "error");
          break;
        case "equity":
          setState((current) => current ? {
            ...current,
            equity_series: [...current.equity_series, { ts: Number(data.ts), equity: Number(data.equity) }].slice(-720),
          } : current);
          break;
        case "positions":
          setLivePositions((data.positions as unknown as Position[]) ?? []);
          break;
        case "engine":
        case "config":
          void refresh();
          break;
      }
    };

    const listeners = EVENT_KINDS.map((kind) => {
      const fn = handle(kind);
      source.addEventListener(kind, fn as EventListener);
      return [kind, fn] as const;
    });

    source.onopen = () => {
      setStreaming(true);
      setStatus((current) => (current === "unpaired" ? current : "online"));
    };
    source.onerror = () => {
      setStreaming(false);
      // EventSource retries on its own; a 401 closes it for good (the browser
      // does not expose the status code on the error event), so a snapshot
      // poll will surface the real reason within SNAPSHOT_INTERVAL_MS.
    };

    return () => {
      for (const [kind, fn] of listeners) source.removeEventListener(kind, fn as EventListener);
      source.close();
      setStreaming(false);
    };
  }, [api, refresh, toast]);

  const value = useMemo<Ctx>(
    () => ({
      status, unauthorizedReason, pairing, api, state, stateAt, streaming, online,
      logs, feed, trades, livePositions, authPrompt, toasts,
      accounts, focusedAccount, setFocusedAccount,
      refresh, toast, dismissToast,
      clearAuthPrompt: () => setAuthPrompt(null),
      pair, unpair, run,
    }),
    [
      status, unauthorizedReason, pairing, api, state, stateAt, streaming, online,
      logs, feed, trades, livePositions, authPrompt, toasts,
      accounts, focusedAccount,
      refresh, toast, dismissToast, pair, unpair, run,
    ],
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk(): Ctx {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used inside <DeskProvider>");
  return ctx;
}
