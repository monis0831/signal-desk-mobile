/**
 * ArmControl.tsx — the Off / Dry run / Live segmented control from
 * DESIGN.md, sitting on top of the engine's two independent flags
 * (`trading.bot_enabled`, `trading.dry_run`). Selecting Live is the one
 * transition that opens a confirmation sheet naming the account; every other
 * transition is immediate, because — per the desktop app's own rule — going
 * back to safety never needs a confirmation, only going live does.
 */

import { useState } from "react";
import { useDesk } from "../lib/store";
import { Segmented } from "./Segmented";
import { ConfirmSheet } from "./ConfirmSheet";
import type { Account } from "../lib/api";

type ArmSegment = "off" | "dry" | "live";

function segmentFor(botEnabled: boolean, dryRun: boolean): ArmSegment {
  if (!botEnabled) return "off";
  return dryRun ? "dry" : "live";
}

export function ArmControl({ account }: { account: Account }) {
  const { state, api, run, refresh } = useDesk();
  const [confirming, setConfirming] = useState(false);

  const botEnabled = state?.trading.bot_enabled ?? false;
  const dryRun = state?.trading.dry_run ?? true;
  const current = segmentFor(botEnabled, dryRun);

  const apply = async (next: ArmSegment) => {
    if (!api) return;
    if (next === "off") {
      await run(() => api.setFlags({ bot_enabled: false }));
    } else if (next === "dry") {
      await run(
        () => api.setFlags({ bot_enabled: true, dry_run: true }),
        botEnabled && !dryRun ? "Dry run is back on. Nothing will be sent." : undefined,
      );
    } else {
      await run(
        () => api.setFlags({ bot_enabled: true, dry_run: false }),
        "Live trading armed. The next signal places a real order.",
      );
    }
    await refresh();
  };

  const onChange = (next: ArmSegment) => {
    if (next === "live") {
      setConfirming(true);
      return;
    }
    void apply(next);
  };

  return (
    <>
      <Segmented
        value={current}
        onChange={onChange}
        segments={[
          { value: "off", label: "Off" },
          { value: "dry", label: "Dry run" },
          { value: "live", label: "Live", tone: "armed" },
        ]}
      />
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Arm live trading?"
        tone="armed"
        confirmLabel="Arm live trading"
        consequence={
          account
            ? `Real orders will be sent to account ${account.login} on ${account.server}. Every enabled channel can place a trade the moment it posts a signal.`
            : "Real orders will be sent to the connected MT5 account. Every enabled channel can place a trade the moment it posts a signal."
        }
        onConfirm={async () => {
          await apply("live");
          setConfirming(false);
        }}
      />
    </>
  );
}
