/**
 * Sheet.tsx — the one dialog primitive this app uses.
 *
 * DESIGN.md bans centred modals outright: every edit, confirm, and the
 * pairing flow itself is a bottom sheet. Centralising it here means the
 * slide-up animation, the backdrop, the drag handle and the safe-area
 * padding are defined exactly once.
 */

import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  description,
  dismissable = true,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** false for the first-run pairing sheet, which has nowhere else to go. */
  dismissable?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock the page behind the sheet so a long sheet body doesn't reveal the
    // list scrolling underneath — iOS Safari happily double-scrolls otherwise.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="sheet-backdrop"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {dismissable ? (
          <button
            type="button"
            className="sheet-handle"
            aria-label="Close"
            onClick={onClose}
          />
        ) : (
          <div className="sheet-handle" aria-hidden="true" />
        )}
        <div className="sheet-head">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </>
  );
}
