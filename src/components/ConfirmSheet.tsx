/**
 * ConfirmSheet.tsx — the one shape every destructive action uses.
 *
 * PRODUCT.md: "Friction where money moves. Arming, closing, placing, and
 * editing use bottom sheets that name the exact consequence, and require a
 * deliberate confirm — never a modal with 'Are you sure?'." `consequence` is
 * therefore not optional copy, it's the point: "Close GOLD 0.04 SELL at
 * market?", not "Are you sure?".
 */

import { useState } from "react";
import { Sheet } from "./Sheet";

export function ConfirmSheet({
  open,
  onClose,
  title,
  consequence,
  tone = "danger",
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  consequence: string;
  tone?: "danger" | "armed";
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} dismissable={!busy}>
      <p className={`sheet-consequence tone-${tone}`}>{consequence}</p>
      <div className="btn-row" style={{ marginBottom: "var(--s-4)" }}>
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${tone === "armed" ? "armed" : "danger"}`}
          onClick={confirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
