import { useState } from "react";
import { useDesk } from "../lib/store";
import { Screen } from "../components/Screen";
import { ListSection, Row, Empty, SkeletonRows } from "../components/List";
import { Switch } from "../components/Switch";
import { ChannelSheet } from "./channels/ChannelSheet";
import { AddChannelSheet } from "./channels/AddChannelSheet";

export function Channels() {
  const { state, api, run, refresh } = useDesk();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const channels = state?.channels ?? [];
  const selectedChannel = channels.find((c) => c.name === selected) ?? null;

  const toggle = async (name: string, enabled: boolean) => {
    if (!api) return;
    await run(() => api.patchChannel(name, { enabled }));
    await refresh();
  };

  return (
    <Screen
      title="Channels"
      action={
        <button type="button" className="header-action" onClick={() => setAdding(true)}>
          Add
        </button>
      }
    >
      <ListSection label={`Watched (${channels.length})`} note="Trading toggles on or off per channel. Scan a channel from its detail to check it can actually be traded before switching it on.">
        {!state ? (
          <SkeletonRows count={2} />
        ) : channels.length === 0 ? (
          <Empty title="No channels yet">
            Add a Telegram channel this account is subscribed to. It joins
            watched but off, so you can scan it before trusting it with money.
          </Empty>
        ) : (
          channels.map((c) => (
            <Row
              key={c.name}
              title={c.name}
              subtitle={c.notes || c.url}
              onClick={() => setSelected(c.name)}
              right={<Switch checked={c.enabled} onChange={(next) => toggle(c.name, next)} label={`Trading for ${c.name}`} />}
            />
          ))
        )}
      </ListSection>

      <ChannelSheet key={selectedChannel?.name ?? "none"} channel={selectedChannel} onClose={() => setSelected(null)} />
      <AddChannelSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}
