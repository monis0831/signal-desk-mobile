import type { ReactNode } from "react";
import { ViewHeader } from "./ViewHeader";
import { DisconnectedBanner } from "./DisconnectedBanner";

/**
 * Screen.tsx — the chrome every top-level view and pushed sub-view shares:
 * sticky header, the honest-state banner right under it, then a scrolling
 * body. Centralising this is what keeps five+ views from re-implementing
 * (and drifting on) the same three lines.
 */
export function Screen({
  title,
  onBack,
  action,
  children,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      <ViewHeader title={title} onBack={onBack} action={action} />
      <DisconnectedBanner />
      <div className="stack gap-4 pb-6" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
