/**
 * ChannelSheet.tsx — one channel's detail: edit its URL/notes, scan its
 * recent history to find out whether it can actually be traded (not just
 * whether it's configured — api_server.py's own distinction), quick-map any
 * symbol the scan finds unmapped, and remove it.
 */

import { useState } from "react";
import { useDesk } from "../../lib/store";
import type { Channel, ChannelScan } from "../../lib/api";
import { Sheet } from "../../components/Sheet";
import { ConfirmSheet } from "../../components/ConfirmSheet";

export function ChannelSheet({ channel, onClose }: { channel: Channel | null; onClose: () => void }) {
  const { api, run, refresh } = useDesk();
  const [url, setUrl] = useState(channel?.url ?? "");
  const [notes, setNotes] = useState(channel?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ChannelScan | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  if (!channel) return null;
  const name = channel.name;

  const save = async () => {
    if (!api) return;
    setSaving(true);
    await run(() => api.patchChannel(name, { url, notes }), "Channel updated.");
    await refresh();
    setSaving(false);
  };

  const runScan = async () => {
    if (!api) return;
    setScanning(true);
    setScan(null);
    const report = await run(() => api.scanChannel(name));
    setScan(report);
    setScanning(false);
  };

  const mapOne = async (symbol: string) => {
    if (!api) return;
    const broker = mapping[symbol]?.trim();
    if (!broker) return;
    await run(() => api.mapSymbol(symbol, broker), `${symbol} → ${broker}`);
  };

  return (
    <>
      <Sheet open={!!channel} onClose={onClose} title={name} description={channel.enabled ? "Trading is on for this channel." : "Trading is off for this channel."}>
        <div className="field">
          <label htmlFor="ch-url">Channel URL</label>
          <input id="ch-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="t.me/…" />
        </div>
        <div className="field">
          <label htmlFor="ch-notes">Notes</label>
          <textarea id="ch-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="button" className="btn primary" style={{ marginBottom: "var(--s-4)" }} disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button type="button" className="btn" style={{ marginBottom: "var(--s-4)" }} disabled={scanning} onClick={runScan}>
          {scanning ? "Scanning…" : "Scan recent history"}
        </button>

        {scan ? <ScanReportView scan={scan} mapping={mapping} setMapping={setMapping} onMap={mapOne} /> : null}

        <button type="button" className="btn danger" style={{ marginTop: "var(--s-2)", marginBottom: "var(--s-4)" }} onClick={() => setConfirmRemove(true)}>
          Remove channel
        </button>
      </Sheet>

      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove this channel?"
        confirmLabel="Remove channel"
        consequence={`Stop watching ${name}. Any signals it posts afterwards are never seen.`}
        onConfirm={async () => {
          if (!api) return;
          await run(() => api.removeChannel(name), "Channel removed.");
          await refresh();
          setConfirmRemove(false);
          onClose();
        }}
      />
    </>
  );
}

function ScanReportView({
  scan,
  mapping,
  setMapping,
  onMap,
}: {
  scan: ChannelScan;
  mapping: Record<string, string>;
  setMapping: (updater: (cur: Record<string, string>) => Record<string, string>) => void;
  onMap: (symbol: string) => void;
}) {
  return (
    <div className="stack gap-3" style={{ marginBottom: "var(--s-4)" }}>
      <p className="muted" style={{ fontSize: "var(--t-sm)" }}>{scan.verdict}</p>
      <div className="stack gap-1 mono" style={{ fontSize: "var(--t-sm)" }}>
        <span>{scan.messages} messages · {scan.signals} parsed · {scan.tradeable} tradeable</span>
        <span className="muted">{scan.with_sl} with a stop · {scan.with_tp} with a target · {scan.pending} pending-entry</span>
      </div>

      {scan.unmapped.length ? (
        <div className="stack gap-2">
          <span className="row-title">Unmapped symbols</span>
          {scan.unmapped.map((u) => (
            <div className="field-row" key={u.symbol}>
              <span className="mono" style={{ alignSelf: "center", minWidth: 70 }}>{u.symbol} ×{u.count}</span>
              <input
                className="mono"
                placeholder={u.suggestions[0] || "broker symbol"}
                value={mapping[u.symbol] ?? ""}
                onChange={(e) => setMapping((cur) => ({ ...cur, [u.symbol]: e.target.value }))}
              />
              <button type="button" className="btn auto" style={{ width: 60, flexShrink: 0 }} onClick={() => onMap(u.symbol)}>Map</button>
            </div>
          ))}
        </div>
      ) : null}

      {scan.rejects.length ? (
        <div className="stack gap-1">
          <span className="row-title">Skip reasons</span>
          {scan.rejects.map((r) => (
            <span key={r.reason} className="muted" style={{ fontSize: "var(--t-sm)" }}>{r.reason} × {r.count}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
