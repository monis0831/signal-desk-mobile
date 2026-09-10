/**
 * StalePill.tsx — "12s ago" in the header, going amber and saying "stale"
 * past 60s. DESIGN.md is specific about the thresholds and that this reuses
 * --armed rather than inventing a new "warning" colour.
 *
 * Fresh data says "now", never "live": that word already means "armed for
 * real orders" on the segmented control directly beneath this pill, and a
 * header reading "live" over a bot that has just been switched Off is exactly
 * the misread this screen exists to prevent.
 */

import { useEffect, useState } from "react";
import { secondsAgo } from "../lib/format";

export function StalePill({ at }: { at: number | null }) {
  const [, force] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (at === null) return null;
  const seconds = secondsAgo(at) ?? 0;
  const stale = seconds > 60;

  return (
    <span className={`stale-pill${stale ? " stale" : ""}`}>
      {stale ? "stale" : seconds < 3 ? "now" : `${seconds}s ago`}
    </span>
  );
}
