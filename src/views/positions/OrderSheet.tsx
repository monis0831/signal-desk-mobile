/**
 * OrderSheet.tsx — a resting (pending) order: move its entry/stop/target, or
 * cancel it. Cancelling a queued order is reversible in spirit (no money has
 * moved yet) but still gets a named-consequence confirm, because a mis-tap
 * that cancels the wrong ticket is still a mistake worth catching.
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import type { PendingOrder } from "../../lib/api";
import { Sheet } from "../../components/Sheet";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import { ago, lots, orderKind, price } from "../../lib/format";

export function OrderSheet({ order, onClose }: { order: PendingOrder | null; onClose: () => void }) {
  const { api, run, refresh } = useDesk();
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!order) return;
    setEntry(String(order.price));
    setSl(order.sl ? String(order.sl) : "");
    setTp(order.tp ? String(order.tp) : "");
  }, [order?.ticket, order?.price, order?.sl, order?.tp]);

  if (!order) return null;
  const { ticket, symbol, direction, volume, kind } = order;

  const save = async () => {
    if (!api) return;
    setSaving(true);
    await run(
      () =>
        api.modifyOrder(ticket, {
          price: entry.trim() ? Number(entry) : null,
          sl: sl.trim() ? Number(sl) : null,
          tp: tp.trim() ? Number(tp) : null,
        }),
      "Order updated.",
    );
    await refresh();
    setSaving(false);
  };

  return (
    <>
      <Sheet
        open={!!order}
        onClose={onClose}
        title={`${symbol} · ${orderKind(kind)}`}
        description={`Ticket ${ticket} · ${direction} ${lots(volume)} lots · placed ${ago(order.placed_time)}`}
      >
        <div className="spread" style={{ paddingBottom: "var(--s-3)" }}>
          <span className="muted">Current price</span>
          <span className="mono">{price(order.current_price)}</span>
        </div>

        <div className="field">
          <label htmlFor="ord-entry">Entry price</label>
          <input id="ord-entry" className="mono" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="ord-sl">Stop loss</label>
            <input id="ord-sl" className="mono" inputMode="decimal" placeholder="none" value={sl} onChange={(e) => setSl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ord-tp">Take profit</label>
            <input id="ord-tp" className="mono" inputMode="decimal" placeholder="none" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn primary" style={{ marginBottom: "var(--s-4)" }} disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button type="button" className="btn danger" style={{ marginBottom: "var(--s-4)" }} onClick={() => setConfirmCancel(true)}>
          Cancel order
        </button>
      </Sheet>

      <ConfirmSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        consequence={`Cancel the resting ${orderKind(kind)} for ${lots(volume)} lots of ${symbol} at ${price(order.price)}? It will never fill.`}
        onConfirm={async () => {
          if (!api) return;
          await run(() => api.cancelOrder(ticket), "Order cancelled.");
          await refresh();
          setConfirmCancel(false);
          onClose();
        }}
      />
    </>
  );
}
