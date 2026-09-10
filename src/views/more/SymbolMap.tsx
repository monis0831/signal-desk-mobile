import { useState } from "react";
import { useDesk } from "../../lib/store";
import { Screen } from "../../components/Screen";
import { ListSection, Row, Empty } from "../../components/List";

export function SymbolMap({ onBack }: { onBack: () => void }) {
  const { state, api, run, refresh } = useDesk();
  const [symbol, setSymbol] = useState("");
  const [broker, setBroker] = useState("");
  const [saving, setSaving] = useState(false);

  const map = state?.config.trading.symbol_map ?? {};
  const entries = Object.entries(map);

  const add = async () => {
    if (!api || !symbol.trim() || !broker.trim()) return;
    setSaving(true);
    await run(() => api.mapSymbol(symbol.trim().toUpperCase(), broker.trim()), "Mapping saved.");
    await refresh();
    setSaving(false);
    setSymbol("");
    setBroker("");
  };

  return (
    <Screen title="Symbol map" onBack={onBack}>
      <ListSection label="Mapped" note="How a normalised symbol from a signal (e.g. GOLD) resolves to this broker's exact name (e.g. XAUUSD.pro). Get this wrong and the wrong instrument trades.">
        {entries.length === 0 ? (
          <Empty title="No mappings yet">
            Scan a channel from Channels to find symbols it uses that aren't
            mapped, or add one directly below.
          </Empty>
        ) : (
          entries.map(([norm, brokerName]) => (
            <Row key={norm} title={norm} value={<span className="mono">{brokerName}</span>} />
          ))
        )}
      </ListSection>

      <ListSection label="Add a mapping">
        <div className="block stack gap-3">
          <div className="field-row">
            <div className="field" style={{ paddingTop: 0 }}>
              <label htmlFor="sm-symbol">Symbol</label>
              <input id="sm-symbol" className="mono" placeholder="GOLD" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </div>
            <div className="field" style={{ paddingTop: 0 }}>
              <label htmlFor="sm-broker">Broker name</label>
              <input id="sm-broker" className="mono" placeholder="XAUUSD.pro" value={broker} onChange={(e) => setBroker(e.target.value)} />
            </div>
          </div>
          <button type="button" className="btn primary" disabled={saving || !symbol.trim() || !broker.trim()} onClick={add}>
            {saving ? "Saving…" : "Save mapping"}
          </button>
          <span className="field-hint">Must match the exact spelling shown in MetaTrader's Market Watch.</span>
        </div>
      </ListSection>
    </Screen>
  );
}
