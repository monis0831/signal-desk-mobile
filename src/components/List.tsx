/**
 * List.tsx — the iOS inset-grouped-list primitives every screen is built
 * from. Positions, signals, and channels are lists of rows, not cards —
 * PRODUCT.md principle 2 — so this file is imported almost everywhere.
 */

import type { ReactNode } from "react";

export function ListSection({
  label,
  note,
  children,
}: {
  label?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="list-section">
      {label ? <div className="list-section-label">{label}</div> : null}
      <div className="list-group">{children}</div>
      {note ? <div className="list-section-note">{note}</div> : null}
    </div>
  );
}

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  right?: ReactNode;
  leading?: ReactNode;
};

export function Row({ title, subtitle, value, chevron, disabled, onClick, right, leading }: RowProps) {
  const inner = (
    <>
      {leading}
      <div className="row-main">
        <span className="row-title">{title}</span>
        {subtitle ? <span className="row-subtitle">{subtitle}</span> : null}
      </div>
      {value !== undefined ? <span className="row-value">{value}</span> : null}
      {chevron ? (
        <svg className="row-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
          <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );

  // `right` can itself be an interactive control (a Switch), so it must
  // never end up inside the same <button> as the navigation click handler —
  // a <button> nested in a <button> is invalid HTML and browsers silently
  // mangle the DOM to fix it, breaking both controls' click targets.
  return (
    <div className={`row${disabled ? " row-disabled" : ""}`}>
      {onClick ? (
        <button type="button" className="row-hit" onClick={onClick} disabled={disabled}>
          {inner}
        </button>
      ) : (
        <div className="row-hit row-hit-static">{inner}</div>
      )}
      {right}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-row" key={i}>
          <div className="stack gap-2" style={{ flex: 1 }}>
            <div className="skel-block" style={{ width: "55%" }} />
            <div className="skel-block" style={{ width: "35%" }} />
          </div>
          <div className="skel-block" style={{ width: 48 }} />
        </div>
      ))}
    </>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}
