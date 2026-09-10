/**
 * NewTradeSheet.tsx — placing a trade by hand, the one workbench feature the
 * brief calls out by name ("everything the desktop app can do"). The engine
 * applies every guard a signal gets (lot cap, open-trade limit, the no-stop
 * refusal, dry-run), so a refusal here is a normal, informative answer —
 * `ok:false` with a reason — not an HTTP error, and the sheet stays open and
 * shows it rather than closing on a trade that didn't happen.
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import type { SymbolInfo, TradeAttempt } from "../../lib/api";
import { Sheet } from "../../components/Sheet";
import { ConfirmSheet } from "../../components/ConfirmSheet";

const ORDER_TYPES = [
  { value: "market", label: "Market" },
  { value: "buy_limit", label: "Buy limit" },
  { value: "sell_limit", label: "Sell limit" },
  { value: "buy_stop", label: "Buy stop" },
  { value: "sell_stop", label: "Sell stop" },
];

export function NewTradeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api, run } = useDesk();
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState("market");
  const [volume, setVolume] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tps, setTps] = useState<string[]>([""]);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<TradeAttempt | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !api) return;
    api.symbols().then((r) => {
      const available = r.symbols.filter((s) => s.available);
      setSymbols(available);
      if (!symbol && available.length) setSymbol(available[0].normalised);
    }).catch(() => setSymbols([]));
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, api]);

  const send = async () => {
    if (!api) return;
    setSending(true);
    const payload = {
      symbol,
      direction,
      order_type: orderType,
      volume: volume.trim() ? Number(volume) : null,
      entry: orderType !== "market" && entry.trim() ? Number(entry) : null,
      sl: Number(sl),
      tps: tps.map((t) => Number(t)).filter((n) => Number.isFinite(n) && n > 0),
    };
    const attempt = await run(() => api.placeTrade(payload));
    setSending(false);
    setConfirming(false);
    if (attempt) {
      setResult(attempt);
      if (attempt.ok) {
        setTimeout(onClose, 900);
      }
    }
  };

  const canSubmit = symbol && sl.trim() && (orderType === "market" || entry.trim());

  return (
    <>
      <Sheet open={open} onClose={onClose} title="New trade" description="Placed by hand, outside any channel. Every guard a signal gets still applies.">
        <div className="field">
          <label htmlFor="nt-symbol">Symbol</label>
          <select id="nt-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {symbols.map((s) => (
              <option key={s.normalised} value={s.normalised}>{s.normalised}{s.description ? ` — ${s.description}` : ""}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="nt-dir">Direction</label>
            <select id="nt-dir" value={direction} onChange={(e) => setDirection(e.target.value as "BUY" | "SELL")}>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="nt-type">Order type</label>
            <select id="nt-type" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              {ORDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="nt-volume">Volume (lots)</label>
            <input id="nt-volume" className="mono" inputMode="decimal" placeholder="default lot size" value={volume} onChange={(e) => setVolume(e.target.value)} />
          </div>
          {orderType !== "market" ? (
            <div className="field">
              <label htmlFor="nt-entry">Entry price</label>
              <input id="nt-entry" className="mono" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
            </div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="nt-sl">Stop loss (required)</label>
          <input id="nt-sl" className="mono" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} />
          <span className="field-hint">Trading unprotected is refused — a stop is always required.</span>
        </div>

        <div className="field">
          <label>Targets</label>
          {tps.map((t, i) => (
            <div className="field-row" key={i} style={{ marginBottom: "var(--s-2)" }}>
              <input
                className="mono"
                inputMode="decimal"
                placeholder={`target ${i + 1}`}
                value={t}
                onChange={(e) => setTps((cur) => cur.map((v, idx) => (idx === i ? e.target.value : v)))}
              />
              <button type="button" className="btn auto" style={{ width: 44 }} aria-label="Remove target" onClick={() => setTps((cur) => cur.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => setTps((cur) => [...cur, ""])}>Add target</button>
        </div>

        {result ? (
          <p className={`sheet-consequence ${result.ok ? "" : "tone-danger"}`} style={{ marginTop: "var(--s-4)" }}>
            {result.ok ? `Sent: ${result.summary}` : `Refused: ${result.error || result.reason}`}
          </p>
        ) : null}

        <button
          type="button"
          className="btn primary"
          style={{ marginTop: "var(--s-4)", marginBottom: "var(--s-4)" }}
          disabled={!canSubmit}
          onClick={() => setConfirming(true)}
        >
          Review trade
        </button>
      </Sheet>

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Send this order?"
        confirmLabel={sending ? "Sending…" : "Send order"}
        consequence={`${orderType === "market" ? "Fill" : "Rest"} ${direction} ${volume || "default lot size"} lots of ${symbol}${orderType !== "market" ? ` at ${entry}` : " at market"}, stop at ${sl}.`}
        onConfirm={send}
      />
    </>
  );
}
