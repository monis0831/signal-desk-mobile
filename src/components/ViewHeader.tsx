/**
 * ViewHeader.tsx — the sticky per-screen header with the connection /
 * staleness indicator DESIGN.md requires on every view: "the most important
 * pixels on every screen and are never ambiguous."
 */

import type { ReactNode } from "react";
import { useDesk } from "../lib/store";
import { StatusDot } from "./StatusDot";
import { StalePill } from "./StalePill";

export function ViewHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const { status, stateAt, state } = useDesk();
  const armed = !!state?.trading.bot_enabled && !state?.trading.dry_run;

  return (
    <header className="view-header">
      {onBack ? (
        <button type="button" className="back" onClick={onBack}>
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
            <path d="M8 1L1.5 8L8 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      ) : null}
      <h1>{title}</h1>
      <div className="header-indicator">
        {armed ? <StatusDot tone="armed" label="Live trading armed" /> : null}
        {status === "online" ? (
          <StalePill at={stateAt} />
        ) : status === "unauthorized" ? (
          <StatusDot tone="error" label="Token rejected" />
        ) : status === "unreachable" ? (
          <StatusDot tone="error" label="Can't reach engine" />
        ) : (
          <StatusDot tone="connecting" label="Connecting" />
        )}
      </div>
      {action}
    </header>
  );
}
