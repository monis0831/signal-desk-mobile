/**
 * Trading — the risk parameters that live in Settings on desktop: lot size,
 * how many trades can be open at once, and how a signal's entry is handled.
 * Dry run / bot on-off live on Home instead, per PRODUCT.md's "state first".
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import { Screen } from "../../components/Screen";
import { ListSection } from "../../components/List";

const ENTRY_MODES = [
  { value: "auto", label: "Auto (pending near market, else market)" },
  { value: "market", label: "Always market" },
  { value: "pending", label: "Always pending at the quoted entry" },
];

export function Trading({ onBack }: { onBack: () => void }) {
  const { state, api, run, refresh } = useDesk();
  const [lotSize, setLotSize] = useState("");
  const [maxOpen, setMaxOpen] = useState("");
  const [entryMode, setEntryMode] = useState("auto");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!state || dirty) return;
    setLotSize(String(state.trading.lot_size ?? ""));
    setMaxOpen(String(state.trading.max_open_trades ?? ""));
    setEntryMode(state.trading.entry_mode || "auto");
  }, [state, dirty]);

  const save = async () => {
    if (!api) return;
    setSaving(true);
    await run(
      () =>
        api.saveConfig({
          "trading.lot_size": Number(lotSize),
          "trading.max_open_trades": Number(maxOpen),
          "trading.entry_mode": entryMode,
        }),
      "Trading settings saved.",
    );
    await refresh();
    setSaving(false);
    setDirty(false);
  };

  return (
    <Screen title="Trading" onBack={onBack}>
      <ListSection label="Sizing" note="Applies to every future signal and hand-placed trade that doesn't specify its own volume.">
        <div className="block stack gap-3">
          <div className="field" style={{ paddingTop: 0 }}>
            <label htmlFor="tr-lot">Lot size</label>
            <input id="tr-lot" className="mono" inputMode="decimal" value={lotSize} onChange={(e) => { setLotSize(e.target.value); setDirty(true); }} />
          </div>
          <div className="field" style={{ paddingTop: 0 }}>
            <label htmlFor="tr-max">Max open trades</label>
            <input id="tr-max" className="mono" inputMode="numeric" value={maxOpen} onChange={(e) => { setMaxOpen(e.target.value); setDirty(true); }} />
          </div>
          <div className="field" style={{ paddingTop: 0 }}>
            <label htmlFor="tr-entry">Entry handling</label>
            <select id="tr-entry" value={entryMode} onChange={(e) => { setEntryMode(e.target.value); setDirty(true); }}>
              {ENTRY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button type="button" className="btn primary" disabled={saving || !dirty} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </ListSection>
    </Screen>
  );
}
