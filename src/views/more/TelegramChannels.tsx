/**
 * TelegramChannels — every channel this Telegram account has joined, and what
 * the bot is doing about each one.
 *
 * The Channels tab answers "what is the bot watching". This screen answers the
 * question that had no home: "what COULD it watch, and why isn't it watching
 * that one?" A channel you haven't added is visibly present here rather than
 * simply missing, which is the difference between a list and an explanation.
 *
 * It is also the only route by which a private channel can be added — no
 * username to type, so it must be picked from what the account can see.
 *
 * The order is deliberate and matches the app's existing rule: Add joins it
 * watched with trading OFF, Scan proves the parser can read its format, and
 * only then does the switch arm it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesk } from "../../lib/store";
import { Screen } from "../../components/Screen";
import { Empty, ListSection, Row, SkeletonRows } from "../../components/List";
import { Switch } from "../../components/Switch";
import { ConfirmSheet } from "../../components/ConfirmSheet";
import type { ChannelScan, TelegramDialog } from "../../lib/api";

export function TelegramChannels({ onBack }: { onBack: () => void }) {
  const { state, api, run, refresh } = useDesk();

  const [dialogs, setDialogs] = useState<TelegramDialog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scan, setScan] = useState<ChannelScan | null>(null);
  const [armTarget, setArmTarget] = useState<string | null>(null);

  const channels = state?.channels ?? [];

  const load = useCallback(async () => {
    if (!api) return;
    setError(null);
    setDialogs(null);
    try {
      const res = await api.dialogs();
      setDialogs(res.dialogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (dialog: TelegramDialog) => {
    if (!api) return;
    setBusy(dialog.chat_id);
    const ok = await run(
      () =>
        api.addChannel({
          name: dialog.title,
          url: dialog.username ? dialog.url : "",
          chat_id: dialog.chat_id,
          enabled: false,
          notes: dialog.private
            ? "private channel — added from your Telegram"
            : "added from your Telegram",
        }),
      `${dialog.title} is now watched. Scan it before switching trading on.`,
    );
    setBusy(null);
    if (ok) {
      await refresh();
      await load();
    }
  };

  const setTrading = async (channelName: string, enabled: boolean) => {
    if (!api) return;
    setPendingName(channelName);
    await run(
      () => api.patchChannel(channelName, { enabled }),
      enabled ? `${channelName} can now trade.` : `${channelName} is watched only.`,
    );
    setPendingName(null);
    await refresh();
  };

  const runScan = async (channelName: string) => {
    if (!api) return;
    setScanning(channelName);
    setScan(null);
    const report = await run(() => api.scanChannel(channelName));
    setScanning(null);
    if (report) setScan(report);
  };

  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return (dialogs ?? [])
      .filter((d) => d.title.toLowerCase().includes(term))
      .map((dialog) => ({
        dialog,
        channel: dialog.channel_name
          ? channels.find((c) => c.name === dialog.channel_name) ?? null
          : null,
      }));
  }, [dialogs, filter, channels]);

  const watched = (dialogs ?? []).filter((d) => d.configured).length;

  return (
    <Screen title="Telegram channels" onBack={onBack}>
      {error ? (
        <ListSection>
          <Empty title="Can’t read your channel list">
            {error} This list comes from your Telegram account, so it needs the
            listener connected — reconnect it under Connections, then come back.
          </Empty>
        </ListSection>
      ) : dialogs === null ? (
        <ListSection label="Your Telegram">
          <SkeletonRows count={5} />
        </ListSection>
      ) : dialogs.length === 0 ? (
        <ListSection>
          <Empty title="No channels found">
            This account hasn’t joined any channels or groups. Join the signal
            channel in Telegram first, then come back.
          </Empty>
        </ListSection>
      ) : (
        <>
          <div className="field">
            <label htmlFor="tg-filter">Search</label>
            <input
              id="tg-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name"
              autoComplete="off"
            />
          </div>

          <ListSection
            label={`Your Telegram (${watched} of ${dialogs.length} watched)`}
            note="Add joins a channel watched but not trading. Scan it, then switch trading on."
          >
            {rows.map(({ dialog, channel }) => (
              <Row
                key={dialog.chat_id}
                title={dialog.title}
                subtitle={
                  !channel
                    ? dialog.private
                      ? "Private — no link · not watched"
                      : `@${dialog.username} · not watched`
                    : channel.enabled
                      ? "Watched · can trade"
                      : "Watched · trading off"
                }
                onClick={channel ? () => void runScan(channel.name) : undefined}
                right={
                  !channel ? (
                    <button
                      type="button"
                      className="btn auto"
                      disabled={busy === dialog.chat_id}
                      onClick={() => void add(dialog)}
                    >
                      {busy === dialog.chat_id ? "Adding…" : "Add"}
                    </button>
                  ) : (
                    <Switch
                      checked={channel.enabled}
                      disabled={pendingName === channel.name}
                      onChange={(next) =>
                        next
                          ? setArmTarget(channel.name)
                          : void setTrading(channel.name, false)
                      }
                      label={`Trading for ${channel.name}`}
                    />
                  )
                }
              />
            ))}
          </ListSection>

          {scanning ? (
            <p className="list-section-note">Scanning {scanning}…</p>
          ) : scan ? (
            <ListSection
              label={`Scan: ${scan.channel}`}
              note={scan.verdict}
            >
              <Row title="Messages read" value={<span className="mono">{scan.messages}</span>} />
              <Row title="Signals found" value={<span className="mono">{scan.signals}</span>} />
              <Row title="Would trade" value={<span className="mono">{scan.tradeable}</span>} />
              {scan.unmapped.length ? (
                <Row
                  title="Unmapped symbols"
                  subtitle={scan.unmapped.map((u) => u.symbol).join(", ")}
                  value={<span className="mono">{scan.unmapped.length}</span>}
                />
              ) : null}
            </ListSection>
          ) : (
            <p className="list-section-note">
              Tap a watched channel to scan it — that checks the parser can
              actually read its format before you trust it with money.
            </p>
          )}
        </>
      )}

      <ConfirmSheet
        open={armTarget !== null}
        title="Let this channel trade?"
        consequence={
          armTarget
            ? `Signals from ${armTarget} will place real orders while the bot is armed.`
            : ""
        }
        confirmLabel="Allow trading"
        tone="armed"
        onClose={() => setArmTarget(null)}
        onConfirm={async () => {
          const name = armTarget;
          setArmTarget(null);
          if (name) await setTrading(name, true);
        }}
      />
    </Screen>
  );
}
