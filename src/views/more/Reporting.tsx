/**
 * Reporting — posting results back into a Telegram channel. This screen only
 * surfaces status and the manual actions; enabling/configuring the channel
 * itself is a config edit the desktop app already handles well, and
 * reproducing its full credential form here added little for a phone.
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import type { ReportingStatus } from "../../lib/api";
import { Screen } from "../../components/Screen";
import { ListSection, Row, Empty } from "../../components/List";
import { StatusDot } from "../../components/StatusDot";

export function Reporting({ onBack }: { onBack: () => void }) {
  const { api, run } = useDesk();
  const [status, setStatus] = useState<ReportingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!api) return;
    try {
      setStatus(await api.reporting());
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api]);

  if (!status) {
    return (
      <Screen title="Reporting" onBack={onBack}>
        <ListSection>
          <Empty title="Reporting isn't running">
            Enabling it and choosing a channel is a config change made from
            the desktop app today. Once it's on, test and summary actions
            appear here.
          </Empty>
        </ListSection>
      </Screen>
    );
  }

  const act = async (name: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(name);
    await run(fn, success);
    await load();
    setBusy(null);
  };

  return (
    <Screen title="Reporting" onBack={onBack}>
      <ListSection label="Status">
        <Row leading={<StatusDot tone={status.running ? "ok" : "idle"} />} title={status.running ? "Running" : "Stopped"} subtitle={status.channel} />
        <Row title="Telegram writable" value={status.telegram_connected ? "yes" : "no"} />
        <Row title="Trades reported" value={String(status.reported_count)} />
        <Row title="Chart rendering" value={status.chart_available ? "available" : "text only"} />
      </ListSection>

      <ListSection label="Actions" note="Send test posts once, then trust the automatic ones.">
        <Row
          title={busy === "test" ? "Sending…" : "Send test message"}
          onClick={() => act("test", () => api!.reportingTest(), "Test message sent.")}
          disabled={busy !== null || !api}
          chevron
        />
        <Row
          title={busy === "summary" ? "Posting…" : "Post summary now"}
          onClick={() => act("summary", () => api!.reportingSummary(), "Summary posted.")}
          disabled={busy !== null || !api}
          chevron
        />
        <Row
          title={busy === "backfill" ? "Posting…" : "Post past trades"}
          onClick={() => act("backfill", () => api!.reportingBackfill(), "Backfill posted.")}
          disabled={busy !== null || !api}
          chevron
        />
      </ListSection>
    </Screen>
  );
}
