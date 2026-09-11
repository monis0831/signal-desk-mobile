/**
 * api.ts — typed access to the Signal Desk engine's HTTP + SSE bridge.
 *
 * Every shape here mirrors `api_server.py` and the desktop app's own
 * `lib/api.ts` field for field — that file is generated from the same
 * server, so re-deriving the types independently would only be a chance to
 * drift from the real contract. What's different from the desktop client:
 *
 *   - The base URL is not `http://127.0.0.1:<port>`. It is whatever the user
 *     typed into the pairing screen, because this app runs on a phone that
 *     is not the machine the engine lives on. See lib/pairing.ts. When the
 *     engine moves to a Windows VPS behind HTTPS, only that stored value
 *     changes — nothing in this file needs to.
 *   - There is no Electron preload bridge, so token acquisition, arm
 *     confirmation, etc. are handled in the UI layer instead of `window.desk`.
 */

export type Connection = { baseUrl: string; token: string };

/* -------------------------------------------------------------------------- */
/* Types mirroring api_server.py's serialisers                                */
/* -------------------------------------------------------------------------- */

export type LogLevel = "raw" | "signal" | "trade" | "warn" | "error" | "info";

export type ParsedSignal = {
  channel: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  entry_low: number | null;
  entry_high: number | null;
  sl: number | null;
  tps: number[];
  ordered_tps: number[];
  order_type: string;
  is_pending: boolean;
  warnings: string[];
  summary: string;
  fingerprint: string;
  raw_text: string;
  broker_symbol?: string | null;
  symbol_mapped?: boolean;
};

export type TradeEvent = {
  ok: boolean;
  action: "sent" | "queued" | "dry_run" | "rejected" | "error" | string;
  reason: string;
  symbol: string;
  broker_symbol: string | null;
  direction: "BUY" | "SELL";
  channel: string;
  volume: number | null;
  price: number | null;
  sl: number | null;
  tp: number | null;
  ticket: number | null;
  retcode: number | null;
  order_kind: string;
  summary: string;
  latency: {
    received_ms: number | null;
    prepare_ms: number | null;
    send_ms: number | null;
    total_ms: number | null;
  };
  signal: ParsedSignal;
};

export type TradeAttempt = TradeEvent & {
  origin?: "desk";
  error?: string;
};

export type TradeRequest = {
  symbol: string;
  direction: "BUY" | "SELL";
  order_type: string;
  volume: number | null;
  entry: number | null;
  sl: number;
  tps: number[];
};

export type ClosedTrade = {
  position_id: number;
  origin?: string;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  open_time: string | null;
  close_time: string | null;
  open_price: number | null;
  close_price: number | null;
  profit: number;
  commission: number;
  swap: number;
  fee: number;
  net: number;
  won: boolean;
  duration: string;
  comment: string;
};

export type ChannelScan = {
  channel: string;
  messages: number;
  signals: number;
  with_sl: number;
  with_tp: number;
  pending: number;
  tradeable: number;
  symbols: { symbol: string; count: number; mapped: boolean }[];
  unmapped: { symbol: string; count: number; suggestions: string[] }[];
  rejects: { reason: string; count: number }[];
  parsed_samples: {
    summary: string; symbol: string; direction: string;
    sl: number | null; tps: number[]; text: string; date: string | null;
  }[];
  reject_samples: { reason: string; text: string; date: string | null }[];
  verdict: string;
};

export type Stats = {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate: number;
  profit_factor: number | null;
  profit_factor_text: string;
  gross_profit: number;
  gross_loss: number;
  net: number;
  average: number;
  best: number;
  worst: number;
  volume: number;
  by_symbol: Record<string, number>;
};

export type HistoryPayload = {
  days: number;
  trades: ClosedTrade[];
  stats: Stats;
  starting_balance: number;
  current_balance: number;
  curve: { t: string | null; v: number }[];
  max_drawdown: { absolute: number; percent: number };
};

/** A configured MT5 account (one terminal, one broker) and its live state.
 *  Distinct from `Account` below, which is the raw account_info() snapshot. */
export type TradingAccountStatus =
  | "connected" | "connecting" | "stopped" | "disabled" | "error";

export type TradingAccount = {
  id: string;
  label: string;
  enabled: boolean;
  server: string;
  login: number;
  lot_size: number;
  max_lot_size: number;
  max_open_trades: number;
  status: TradingAccountStatus;
  detail: string;
  /** "" until the worker has connected and read it from the terminal. */
  margin_mode: string;
  balance: number | null;
  equity: number | null;
  restarts: number;
};

export type Account = {
  login: number;
  server: string;
  name: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  margin_free: number;
  margin_level: number;
  profit: number;
  leverage: number;
  trade_allowed: boolean;
} | null;

export type Channel = {
  name: string;
  url: string;
  enabled: boolean;
  notes: string;
  /**
   * Set only for channels added from the picker. A private channel has no
   * username, so its numeric id is the only thing that resolves it; channels
   * added before the picker existed carry a url instead and still work.
   */
  chat_id?: number;
};

/** One row in the channel picker: a chat this Telegram account has joined. */
export type TelegramDialog = {
  chat_id: number;
  title: string;
  username: string | null;
  /** No public username — addable only by id, which is why the picker exists. */
  private: boolean;
  broadcast: boolean;
  url: string;
  /** Already watched; shown but not addable again — a duplicate doubles signals. */
  configured: boolean;
  /**
   * Name of the configured channel this dialog already is, or null. The engine
   * resolves the match (by id, handle, or title) so both clients agree; join on
   * it to reach the entry and read whether trading is on for it.
   */
  channel_name: string | null;
};

export type AppConfig = {
  telegram: {
    api_id: number;
    api_hash: string;
    api_hash_set: boolean;
    api_hash_source: "env" | "store" | "file" | "unset";
    phone: string;
    session_name: string;
    channels: Channel[];
  };
  mt5: {
    login: number;
    password: string;
    password_set: boolean;
    password_source: "env" | "store" | "file" | "unset";
    server: string;
    terminal_path: string;
  };
  trading: Record<string, unknown> & {
    symbol_map: Record<string, string>;
    bot_enabled?: boolean;
    dry_run?: boolean;
    lot_size?: number;
    max_open_trades?: number;
    entry_mode?: string;
  };
  reporting: {
    enabled: boolean;
    channel: string;
    post_trades: boolean;
    post_summary: boolean;
    summary_hours: number;
    summary_days: number;
    include_chart: boolean;
    poll_seconds: number;
  };
  logging: { dir: string; level: string };
};

export type ConfigSaveResult = {
  applied: string[];
  restart_required: string[];
  reconnect_required: string[];
  config: AppConfig;
};

export type SymbolLimits = {
  symbol: string;
  broker: string;
  digits: number;
  point: number;
  tick_size: number;
  volume_min: number;
  volume_max: number;
  volume_step: number;
  stops_level: number;
  freeze_level: number;
};

export type LadderRung = {
  price: number;
  volume: number;
  done: boolean;
  closed_at: number | null;
};

export type Ladder = {
  ticket: number;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  original_volume: number;
  final_tp: number | null;
  breakeven_after: number;
  breakeven_done: boolean;
  targets: LadderRung[];
  viable: boolean;
  reason: string;
};

export type LadderPlan = {
  symbol: string;
  direction: string;
  volume: number;
  targets: number[];
  final_tp: number | null;
  rungs: LadderRung[];
  slice_volume: number;
  viable: boolean;
  reason: string;
  volume_min: number;
  volume_step: number;
};

export type LadderStatus = {
  enabled: boolean;
  running: boolean;
  count: number;
  viable: number;
  state_file: string;
  ladders: Ladder[];
};

export type ReportingStatus = {
  enabled: boolean;
  channel: string;
  running: boolean;
  seeded: boolean;
  reported_count: number;
  last_summary: number | null;
  telegram_connected: boolean;
  chart_available: boolean;
  state_file: string;
};

export type EngineState = {
  version: string;
  uptime: number;
  data_dir: string;
  log_dir: string;
  engine: { running: boolean; mt5_package: boolean };
  telegram: { status: string; detail: string; login_pending: string };
  mt5: { status: string; detail: string };
  accounts: TradingAccount[];
  trading: {
    bot_enabled: boolean;
    dry_run: boolean;
    entry_mode: string;
    lot_size: number;
    max_open_trades: number;
  };
  reporting: ReportingStatus | null;
  ladders: Ladder[];
  account: Account;
  equity_series: { ts: number; equity: number }[];
  channels: Channel[];
  config: AppConfig;
  seq: number;
};

export type Position = {
  /** Which configured account this row belongs to. */
  account_id?: string;
  ticket: number;
  symbol: string;
  direction: "BUY" | "SELL";
  volume: number;
  open_price: number;
  current_price: number;
  sl: number | null;
  tp: number | null;
  profit: number;
  swap: number;
  open_time: number;
  comment: string;
  magic: number;
  manual: boolean;
};

export type PendingOrder = {
  /** Which configured account this row belongs to. */
  account_id?: string;
  ticket: number;
  symbol: string;
  kind: string;
  direction: "BUY" | "SELL";
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  current_price: number;
  placed_time: number;
  expiry: number;
  comment: string;
  magic: number;
  manual: boolean;
};

export type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

export type Candles = {
  symbol: string;
  broker: string;
  timeframe: string;
  digits: number;
  bars: Bar[];
  reason: string;
};

export type SymbolInfo = {
  normalised: string;
  broker: string;
  available: boolean;
  digits: number | null;
  description: string;
};

export type Quote = {
  symbol: string;
  broker: string;
  bid: number;
  ask: number;
  spread: number | null;
  digits: number;
  time: number;
};

export type ParsePreview = {
  parsed: boolean;
  reason: string;
  signal: ParsedSignal | null;
  plan?: {
    entry_mode: string;
    market_price?: number;
    order_kind?: string;
    why: string;
    tp_used?: number | null;
  };
};

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** Strip a trailing slash so callers can type either form into pairing. */
function normaliseBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function createApi(conn: Connection) {
  const base = normaliseBaseUrl(conn.baseUrl);

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${conn.token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      // fetch only rejects on a transport failure — the engine is unreachable
      // (wrong URL, phone is off Wi-Fi and the engine is LAN-only, etc.), not
      // a bad request.
      throw new ApiError(0, "Can't reach the engine at that address.");
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new ApiError(response.status, text.slice(0, 300));
      }
    }

    if (!response.ok) {
      const message =
        (payload as { error?: string } | null)?.error ??
        `Request failed (${response.status}).`;
      throw new ApiError(response.status, message);
    }
    return payload as T;
  }

  const q = (params: Record<string, string | number | undefined>) => {
    const usable = Object.entries(params).filter(([, v]) => v !== undefined);
    if (!usable.length) return "";
    return "?" + usable.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  };

  return {
    conn: { baseUrl: base, token: conn.token },
    streamUrl: (after: number) =>
      `${base}/api/events?after=${after}&token=${encodeURIComponent(conn.token)}`,

    health: () => call<{ ok: boolean; version: string; running: boolean }>("GET", "/api/health"),
    state: () => call<EngineState>("GET", "/api/state"),

    listAccounts: () =>
      call<{ accounts: TradingAccount[] }>("GET", "/api/accounts"),

    createAccount: (body: Partial<TradingAccount> & { password?: string }) =>
      call<{ accounts: TradingAccount[] }>("POST", "/api/accounts", body),

    updateAccount: (
      id: string,
      body: Partial<TradingAccount> & { password?: string },
    ) =>
      call<{ accounts: TradingAccount[] }>(
        "PATCH", `/api/accounts/${encodeURIComponent(id)}`, body),

    deleteAccount: (id: string) =>
      call<{ accounts: TradingAccount[] }>(
        "DELETE", `/api/accounts/${encodeURIComponent(id)}`),

    closePositionOn: (accountId: string, ticket: number, volume?: number) =>
      call<{ ok: boolean; detail: string }>(
        "POST",
        `/api/accounts/${encodeURIComponent(accountId)}/positions/${ticket}/close`,
        volume ? { volume } : {}),

    startEngine: () => call<{ running: boolean }>("POST", "/api/engine/start"),
    stopEngine: () => call<{ running: boolean }>("POST", "/api/engine/stop"),

    setFlags: (flags: { bot_enabled?: boolean; dry_run?: boolean }) =>
      call<{ bot_enabled: boolean; dry_run: boolean }>("POST", "/api/trading/flags", flags),

    getConfig: () => call<AppConfig>("GET", "/api/config"),
    saveConfig: (patch: Record<string, unknown>) =>
      call<ConfigSaveResult>("PUT", "/api/config", patch),

    connectMt5: () => call<{ connecting: boolean }>("POST", "/api/mt5/connect"),
    connectTelegram: () => call<{ reconnecting: boolean }>("POST", "/api/telegram/connect"),
    logoutTelegram: () => call<{ logged_out: boolean }>("POST", "/api/telegram/logout"),
    submitCode: (value: string) =>
      call<{ accepted: boolean }>("POST", "/api/telegram/code", { value }),

    /**
     * Every channel and group the logged-in Telegram account has joined.
     *
     * The only way to add a PRIVATE channel: it has no username to type, so
     * the user picks it from this list and we store its numeric chat_id.
     * Needs Telegram connected — 409 otherwise.
     */
    dialogs: () =>
      call<{ dialogs: TelegramDialog[]; message: string }>("GET", "/api/telegram/dialogs"),

    channels: () => call<{ channels: Channel[] }>("GET", "/api/channels"),
    addChannel: (channel: Partial<Channel>) =>
      call<{ channel: Channel; reconnect_required?: boolean }>("POST", "/api/channels", channel),
    patchChannel: (name: string, patch: Partial<Channel>) =>
      call<{ channel: Channel }>("PATCH", `/api/channels/${encodeURIComponent(name)}`, patch),
    scanChannel: (name: string, limit = 200) =>
      call<ChannelScan>("POST", `/api/channels/${encodeURIComponent(name)}/scan`, { limit }),
    mapSymbol: (symbol: string, broker: string) =>
      call<{ symbol: string; broker: string }>("POST", "/api/symbols/map", { symbol, broker }),
    removeChannel: (name: string) =>
      call<{ removed: string }>("DELETE", `/api/channels/${encodeURIComponent(name)}`),

    history: (days: number) => call<HistoryPayload>("GET", `/api/history${q({ days })}`),
    positions: (all = false) =>
      call<{ positions: Position[] }>("GET", `/api/positions${all ? "?all=1" : ""}`),
    orders: (all = false) =>
      call<{ orders: PendingOrder[] }>("GET", `/api/orders${all ? "?all=1" : ""}`),
    cancelOrder: (ticket: number) =>
      call<{ ticket: number; message: string }>("POST", `/api/orders/${ticket}/cancel`),
    closePosition: (ticket: number, volume?: number) =>
      call<{ ticket: number; message: string }>(
        "POST", `/api/positions/${ticket}/close`, volume ? { volume } : {},
      ),

    streamSymbol: (symbol: string) =>
      call<{ symbol: string }>("POST", "/api/stream/symbol", { symbol }),

    placeTrade: (payload: TradeRequest) => call<TradeAttempt>("POST", "/api/trade", payload),

    limits: (symbol: string) => call<SymbolLimits>("GET", `/api/limits${q({ symbol })}`),
    modifyPosition: (ticket: number, sl: number | null, tp: number | null) =>
      call<{ ticket: number; message: string }>("PATCH", `/api/positions/${ticket}`, { sl, tp }),
    modifyOrder: (
      ticket: number,
      patch: { price?: number | null; sl?: number | null; tp?: number | null },
    ) => call<{ ticket: number; message: string }>("PATCH", `/api/orders/${ticket}`, patch),

    ladders: () => call<LadderStatus>("GET", "/api/ladders"),
    ladderPlan: (symbol: string, direction: string, volume: number, targets: number[]) =>
      call<LadderPlan>("POST", "/api/ladders/plan", { symbol, direction, volume, targets }),
    setLadder: (ticket: number, targets: number[]) =>
      call<Ladder>("PUT", `/api/ladders/${ticket}`, { targets }),
    clearLadder: (ticket: number) =>
      call<{ removed: boolean; ticket: number }>("DELETE", `/api/ladders/${ticket}`),

    symbols: () =>
      call<{ symbols: SymbolInfo[]; timeframes: string[]; second_timeframes: string[] }>(
        "GET", "/api/symbols",
      ),
    candles: (symbol: string, timeframe: string, count = 300) =>
      call<Candles>("GET", `/api/candles${q({ symbol, timeframe, count })}`),
    quotes: (symbols?: string[]) =>
      call<{ quotes: Quote[] }>("GET", `/api/quotes${q({ symbols: symbols?.join(",") })}`),

    parse: (text: string) => call<ParsePreview>("POST", "/api/parse", { text }),

    reporting: () => call<ReportingStatus>("GET", "/api/reporting"),
    reportingTest: () => call<{ sent: boolean; detail: string }>("POST", "/api/reporting/test"),
    reportingSummary: () =>
      call<{ sent: boolean; detail: string }>("POST", "/api/reporting/summary"),
    reportingBackfill: (days?: number) =>
      call<{ sent: number; detail: string }>("POST", "/api/reporting/backfill", { days }),

    eventsRecent: (limit = 200, kinds?: string[]) =>
      call<{ events: { seq: number; kind: string; ts: number; data: unknown }[] }>(
        "GET", `/api/events/recent${q({ limit, kinds: kinds?.join(",") })}`,
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
