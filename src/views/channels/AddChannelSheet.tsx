/**
 * AddChannelSheet.tsx — add a channel by picking it, or by pasting a link.
 *
 * Picking is the default, and the reason this screen was rewritten. A paid
 * private channel has no public username, so there is nothing to type:
 * demanding a "t.me link" made those channels impossible to add at all. The
 * account can already see them, so we list what it has joined and store the
 * numeric chat_id.
 *
 * The link field stays for what the picker cannot serve: a channel the account
 * has not joined yet (an invite link works), or an engine whose Telegram is
 * offline right now.
 */

import { useCallback, useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import { Sheet } from "../../components/Sheet";
import { Empty, ListSection, Row, SkeletonRows } from "../../components/List";
import type { TelegramDialog } from "../../lib/api";

type Mode = "pick" | "link";

export function AddChannelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api, run, refresh } = useDesk();
  const [mode, setMode] = useState<Mode>("pick");

  const [dialogs, setDialogs] = useState<TelegramDialog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    onClose();
    setName("");
    setUrl("");
    setFilter("");
    setMode("pick");
    setDialogs(null);
    setLoadError(null);
  };

  const load = useCallback(async () => {
    if (!api) return;
    setLoadError(null);
    setDialogs(null);
    try {
      const res = await api.dialogs();
      setDialogs(res.dialogs);
    } catch (err) {
      // Nearly always "Telegram is not connected" (409). Say so plainly and
      // point at the link tab, rather than showing an empty list that looks
      // like the account has joined nothing.
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    if (open && mode === "pick" && dialogs === null && !loadError) void load();
  }, [open, mode, dialogs, loadError, load]);

  const add = async (payload: { name: string; url?: string; chat_id?: number }) => {
    if (!api) return;
    setSaving(true);
    const added = await run(
      () => api.addChannel({ ...payload, enabled: true }),
      "Channel added. Reconnect Telegram to start watching it.",
    );
    setSaving(false);
    if (added) {
      await refresh();
      close();
    }
  };

  const term = filter.trim().toLowerCase();
  const shown = (dialogs ?? []).filter((d) => d.title.toLowerCase().includes(term));

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add a channel"
      description="It starts watched but with trading off. Scan it before switching trading on."
    >
      <div className="segmented" role="tablist" aria-label="How to add a channel">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pick"}
          className={mode === "pick" ? "active" : undefined}
          onClick={() => setMode("pick")}
        >
          From my Telegram
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "link"}
          className={mode === "link" ? "active" : undefined}
          onClick={() => setMode("link")}
        >
          Paste a link
        </button>
      </div>

      {mode === "link" ? (
        <>
          <div className="field">
            <label htmlFor="ac-name">Name</label>
            <input
              id="ac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A label for this channel"
            />
          </div>
          <div className="field">
            <label htmlFor="ac-url">Channel link</label>
            <input
              id="ac-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="t.me/… or an invite link"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="field-hint">
              For a channel this account hasn’t joined yet. Already a member?
              Pick it from your Telegram instead — that works for private
              channels too.
            </div>
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={saving || !name.trim() || !url.trim()}
            onClick={() => void add({ name: name.trim(), url: url.trim() })}
          >
            {saving ? "Adding…" : "Add channel"}
          </button>
        </>
      ) : loadError !== null ? (
        <ListSection>
          <Empty title="Can’t read your channel list">
            {loadError}. Telegram has to be connected for this — connect it under
            More → Connections, or paste an invite link instead.
          </Empty>
        </ListSection>
      ) : dialogs === null ? (
        <ListSection label="Your Telegram">
          <SkeletonRows count={4} />
        </ListSection>
      ) : dialogs.length === 0 ? (
        <ListSection>
          <Empty title="No channels found">
            This Telegram account hasn’t joined any channels or groups. Join the
            signal channel in Telegram first, then come back.
          </Empty>
        </ListSection>
      ) : (
        <>
          <div className="field">
            <label htmlFor="ac-filter">Search</label>
            <input
              id="ac-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name"
              autoComplete="off"
            />
          </div>

          <ListSection
            label={`Your Telegram (${dialogs.length})`}
            note="Private channels have no link — picking them here is the only way to add them."
          >
            {shown.map((d) => (
              <Row
                key={d.chat_id}
                title={d.title}
                subtitle={
                  d.configured
                    ? "Already added"
                    : d.private
                      ? "Private — no link"
                      : `@${d.username}`
                }
                disabled={d.configured}
                right={
                  <button
                    type="button"
                    className="btn auto"
                    disabled={saving || d.configured}
                    onClick={() =>
                      void add({
                        name: d.title,
                        // A public channel keeps its link, so entries added this
                        // way look exactly like the ones already in config; a
                        // private one has only its id, which is the whole point.
                        url: d.username ? d.url : "",
                        chat_id: d.chat_id,
                      })
                    }
                  >
                    {d.configured ? "Added" : "Add"}
                  </button>
                }
              />
            ))}
            {shown.length === 0 ? (
              <Empty title="Nothing matches">
                No channel in this account is called “{filter.trim()}”.
              </Empty>
            ) : null}
          </ListSection>
        </>
      )}
    </Sheet>
  );
}
