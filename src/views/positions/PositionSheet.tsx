/**
 * PositionSheet.tsx — everything "full control" means for one open position:
 * read its levels, edit stop/target, manage its take-profit ladder, close it
 * whole or in part. Every send-to-broker action here goes through
 * ConfirmSheet naming the exact consequence, per PRODUCT.md.
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import type { Ladder, Position } from "../../lib/api";
import { Sheet } from "../../components/Sheet";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import { PnL } from "../../components/PnL";
import { ago, lots, price } from "../../lib/format";

export function PositionSheet({
  position,
  ladder,
  onClose,
}: {
  position: Position | null;
  ladder: Ladder | undefined;
  onClose: () => void;
}) {
  const { api, run, refresh } = useDesk();
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [savingLevels, setSavingLevels] = useState(false);

  const [targets, setTargets] = useState<string[]>([]);
  const [savingLadder, setSavingLadder] = useState(false);
  const [confirmClose, setConfirmClose] = useState<"all" | "partial" | null>(null);
  const [partialVolume, setPartialVolume] = useState("");
  const [confirmClearLadder, setConfirmClearLadder] = useState(false);

  useEffect(() => {
    if (!position) return;
    setSl(position.sl ? String(position.sl) : "");
    setTp(position.tp ? String(position.tp) : "");
    setPartialVolume("");
  }, [position?.ticket, position?.sl, position?.tp]);

  useEffect(() => {
    setTargets(ladder ? ladder.targets.filter((t) => !t.done).map((t) => String(t.price)) : []);
  }, [ladder?.ticket, ladder?.targets.length]);

  if (!position) return null;
  const { ticket, symbol, direction, volume } = position;

  const saveLevels = async () => {
    if (!api) return;
    setSavingLevels(true);
    const slValue = sl.trim() ? Number(sl) : null;
    const tpValue = tp.trim() ? Number(tp) : null;
    await run(
      () => api.modifyPosition(ticket, slValue, tpValue),
      "Levels updated.",
    );
    await refresh();
    setSavingLevels(false);
  };

  const saveLadder = async () => {
    if (!api) return;
    const parsed = targets.map((t) => Number(t)).filter((n) => Number.isFinite(n) && n > 0);
    setSavingLadder(true);
    await run(() => api.setLadder(ticket, parsed), "Targets updated.");
    await refresh();
    setSavingLadder(false);
  };

  const doClose = async (volumeOverride?: number) => {
    if (!api) return;
    await run(
      () => api.closePosition(ticket, volumeOverride),
      volumeOverride ? `Closed ${lots(volumeOverride)} lots of ${symbol}.` : `Closed ${symbol}.`,
    );
    await refresh();
    setConfirmClose(null);
    if (!volumeOverride || volumeOverride >= volume) onClose();
  };

  return (
    <>
      <Sheet
        open={!!position}
        onClose={onClose}
        title={`${symbol} · ${direction}`}
        description={`Ticket ${ticket} · opened ${ago(position.open_time)}${position.manual ? " · placed by hand" : ""}`}
      >
        <div className="stack gap-2" style={{ paddingBottom: "var(--s-4)" }}>
          <div className="spread">
            <span className="muted">Open / current</span>
            <span className="mono">{price(position.open_price)} → {price(position.current_price)}</span>
          </div>
          <div className="spread">
            <span className="muted">Volume</span>
            <span className="mono">{lots(volume)} lots</span>
          </div>
          <div className="spread">
            <span className="muted">Floating P&L</span>
            <PnL value={position.profit} />
          </div>
          {position.swap ? (
            <div className="spread">
              <span className="muted">Swap</span>
              <span className="mono">{price(position.swap)}</span>
            </div>
          ) : null}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pos-sl">Stop loss</label>
            <input id="pos-sl" className="mono" inputMode="decimal" placeholder="none" value={sl} onChange={(e) => setSl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pos-tp">Take profit</label>
            <input id="pos-tp" className="mono" inputMode="decimal" placeholder="none" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
        </div>
        <p className="field-hint">Clearing a field and saving removes that level. Sent to the broker immediately.</p>
        <button type="button" className="btn primary" style={{ marginBottom: "var(--s-4)" }} disabled={savingLevels} onClick={saveLevels}>
          {savingLevels ? "Saving…" : "Save stop / target"}
        </button>

        {ladder ? (
          <div className="stack gap-2" style={{ marginBottom: "var(--s-4)" }}>
            <div className="spread">
              <span className="row-title">Scale-out targets</span>
              {!ladder.viable ? <span className="badge rejected">Can't split — {ladder.reason}</span> : null}
            </div>
            {targets.map((t, i) => (
              <div className="field-row" key={i}>
                <div className="field" style={{ paddingTop: 0 }}>
                  <input
                    className="mono"
                    inputMode="decimal"
                    value={t}
                    onChange={(e) => setTargets((cur) => cur.map((v, idx) => (idx === i ? e.target.value : v)))}
                  />
                </div>
                <button
                  type="button"
                  className="btn auto"
                  style={{ width: 44, flexShrink: 0 }}
                  aria-label="Remove target"
                  onClick={() => setTargets((cur) => cur.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setTargets((cur) => [...cur, ""])}>
                Add target
              </button>
              <button type="button" className="btn primary" disabled={savingLadder} onClick={saveLadder}>
                {savingLadder ? "Saving…" : "Save targets"}
              </button>
            </div>
            <button type="button" className="btn ghost" onClick={() => setConfirmClearLadder(true)}>
              Clear ladder
            </button>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="pos-partial">Close a portion (lots)</label>
          <input
            id="pos-partial"
            className="mono"
            inputMode="decimal"
            placeholder={`up to ${lots(volume)}`}
            value={partialVolume}
            onChange={(e) => setPartialVolume(e.target.value)}
          />
        </div>
        <div className="btn-row" style={{ marginBottom: "var(--s-4)" }}>
          <button
            type="button"
            className="btn danger"
            disabled={!(partialVolume.trim() && Number(partialVolume) > 0 && Number(partialVolume) < volume)}
            onClick={() => setConfirmClose("partial")}
          >
            Close partial
          </button>
          <button type="button" className="btn danger" onClick={() => setConfirmClose("all")}>
            Close all
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmClose === "all"}
        onClose={() => setConfirmClose(null)}
        title="Close position?"
        confirmLabel="Close at market"
        consequence={`Close ${symbol} ${lots(volume)} ${direction} at market? This sends a real order to the broker.`}
        onConfirm={() => doClose()}
      />
      <ConfirmSheet
        open={confirmClose === "partial"}
        onClose={() => setConfirmClose(null)}
        title="Close part of this position?"
        confirmLabel="Close partial"
        consequence={`Close ${partialVolume || "0"} of ${lots(volume)} lots on ${symbol} ${direction} at market?`}
        onConfirm={() => doClose(Number(partialVolume))}
      />
      <ConfirmSheet
        open={confirmClearLadder}
        onClose={() => setConfirmClearLadder(false)}
        title="Clear scale-out targets?"
        confirmLabel="Clear targets"
        consequence={`Remove all scale-out targets for ${symbol}. The position's stop and final target at the broker are unaffected.`}
        onConfirm={async () => {
          if (!api) return;
          await run(() => api.clearLadder(ticket), "Targets cleared.");
          await refresh();
          setConfirmClearLadder(false);
        }}
      />

    </>
  );
}
