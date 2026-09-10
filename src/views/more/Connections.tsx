/**
 * Connections — MT5 and Telegram, each with a status row and a reconnect
 * action. Telegram's login code prompt is handled globally (see
 * AuthPromptSheet in App.tsx) because it can arrive while any screen is open.
 */

import { useState } from "react";
import { useDesk } from "../../lib/store";
import { Screen } from "../../components/Screen";
import { ListSection, Row } from "../../components/List";
import { StatusDot } from "../../components/StatusDot";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import type { DotTone } from "../../components/StatusDot";

function toneFor(status: string): DotTone {
  if (status === "connected") return "ok";
  if (status === "error") return "error";
  if (status === "connecting") return "connecting";
  return "idle";
}

export function Connections({ onBack }: { onBack: () => void }) {
  const { state, api, run, refresh } = useDesk();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const tg = state?.telegram;
  const mt5 = state?.mt5;

  return (
    <Screen title="Connections" onBack={onBack}>
      <ListSection label="MetaTrader 5">
        <Row
          leading={<StatusDot tone={toneFor(mt5?.status ?? "idle")} />}
          title={mt5?.status ?? "idle"}
          subtitle={mt5?.detail || undefined}
        />
        <Row
          title="Reconnect"
          onClick={() => run(() => api!.connectMt5(), "Reconnecting to MetaTrader 5…")}
          disabled={!api}
          chevron
        />
      </ListSection>

      <ListSection label="Telegram">
        <Row
          leading={<StatusDot tone={toneFor(tg?.status ?? "idle")} />}
          title={tg?.status ?? "idle"}
          subtitle={tg?.detail || undefined}
        />
        <Row
          title="Reconnect"
          onClick={() => run(() => api!.connectTelegram(), "Reconnecting to Telegram…")}
          disabled={!api}
          chevron
        />
        <Row title="Sign out of Telegram" onClick={() => setConfirmLogout(true)} disabled={!api} chevron />
      </ListSection>

      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Sign out of Telegram?"
        confirmLabel="Sign out"
        consequence="This deletes the session file. The bot stops reading every channel until Telegram is signed back in and re-authorised with a new code."
        onConfirm={async () => {
          if (!api) return;
          await run(() => api.logoutTelegram(), "Signed out of Telegram.");
          await refresh();
          setConfirmLogout(false);
        }}
      />
    </Screen>
  );
}
