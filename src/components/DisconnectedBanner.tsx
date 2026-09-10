/**
 * DisconnectedBanner.tsx — "Honest states" from the brief: connection lost,
 * token expired, and offline each get their own full-width banner under the
 * header, never a toast and never a spinner that just sits there forever.
 */

import { useDesk } from "../lib/store";
import { StatusDot } from "./StatusDot";

export function DisconnectedBanner() {
  const { status, online, unauthorizedReason } = useDesk();

  if (!online) {
    return (
      <div className="banner">
        <StatusDot tone="error" />
        No internet connection. Showing the last data this phone received.
      </div>
    );
  }
  if (status === "unauthorized") {
    return (
      <div className="banner">
        <StatusDot tone="error" />
        {unauthorizedReason ?? "This app's token was rejected. Re-pair from More → Pairing."}
      </div>
    );
  }
  if (status === "unreachable") {
    return (
      <div className="banner warn">
        <StatusDot tone="error" />
        Can't reach the engine right now. It may be off, asleep, or the
        address has changed. Showing the last known state.
      </div>
    );
  }
  return null;
}
