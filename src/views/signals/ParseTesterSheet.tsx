/**
 * ParseTesterSheet.tsx — "why didn't that trade?" without waiting for the
 * channel to post again. Dry-parses pasted text via /api/parse; places
 * nothing, per the engine's own doc comment on that route.
 */

import { useState } from "react";
import { useDesk } from "../../lib/store";
import type { ParsePreview } from "../../lib/api";
import { Sheet } from "../../components/Sheet";
import { price } from "../../lib/format";

export function ParseTesterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api, run } = useDesk();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParsePreview | null>(null);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    if (!api || !text.trim()) return;
    setBusy(true);
    const outcome = await run(() => api.parse(text));
    setResult(outcome);
    setBusy(false);
  };

  return (
    <Sheet
      open={open}
      onClose={() => { onClose(); setResult(null); }}
      title="Test a message"
      description="Paste channel text to see how it would parse, without placing anything."
    >
      <div className="field">
        <label htmlFor="parse-text">Message text</label>
        <textarea id="parse-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the signal text here…" />
      </div>
      <button type="button" className="btn primary" style={{ marginBottom: "var(--s-4)" }} disabled={busy || !text.trim()} onClick={test}>
        {busy ? "Parsing…" : "Parse"}
      </button>

      {result ? (
        result.parsed && result.signal ? (
          <div className="stack gap-2" style={{ marginBottom: "var(--s-4)" }}>
            <div className="spread"><span className="muted">Symbol</span><span className="mono">{result.signal.symbol}{result.signal.symbol_mapped === false ? " (unmapped)" : ""}</span></div>
            <div className="spread"><span className="muted">Direction</span><span className="mono">{result.signal.direction}</span></div>
            <div className="spread"><span className="muted">Entry</span><span className="mono">{price(result.signal.entry)}</span></div>
            <div className="spread"><span className="muted">Stop</span><span className="mono">{result.signal.sl ? price(result.signal.sl) : "none"}</span></div>
            <div className="spread"><span className="muted">Targets</span><span className="mono">{result.signal.tps.map((t) => price(t)).join(", ") || "none"}</span></div>
            {result.plan ? <p className="muted" style={{ fontSize: "var(--t-sm)" }}>{result.plan.why}</p> : null}
            {result.signal.warnings.length ? <p style={{ color: "var(--armed)", fontSize: "var(--t-sm)" }}>{result.signal.warnings.join(" · ")}</p> : null}
          </div>
        ) : (
          <p className="sheet-consequence tone-danger" style={{ marginBottom: "var(--s-4)" }}>
            Didn't parse: {result.reason}
          </p>
        )
      ) : null}
    </Sheet>
  );
}
