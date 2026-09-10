/**
 * PairingSheet.tsx — the whole auth model for this app in one form.
 *
 * The engine has no login; it mints a fresh bearer token every time it
 * launches (`secrets.token_urlsafe(32)` in api_server.py) and never writes it
 * to disk. So "pairing" means: the user reads the base URL and token off the
 * desktop app (or its console) once, types them in here, and this app
 * remembers them until the engine restarts and the token stops matching —
 * at which point the store routes back here with a specific reason instead
 * of failing silently. Used both for first run (non-dismissable, nowhere
 * else to go) and for re-pairing from More (dismissable).
 */

import { useState } from "react";
import { useDesk } from "../lib/store";
import { Sheet } from "../components/Sheet";

export function PairingSheet({
  open,
  onClose,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  dismissable?: boolean;
}) {
  const { pairing, pair, unauthorizedReason } = useDesk();
  const [baseUrl, setBaseUrl] = useState(pairing?.baseUrl ?? "http://");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!baseUrl.trim() || !token.trim()) return;
    setBusy(true);
    setError(null);
    const outcome = await pair({ baseUrl: baseUrl.trim(), token: token.trim() });
    setBusy(false);
    if (outcome.ok) {
      setToken("");
      onClose();
    } else {
      setError(outcome.message ?? "Couldn't pair with that engine.");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissable={dismissable}
      title={pairing ? "Re-pair with the engine" : "Pair with Signal Desk"}
      description="Enter the address and token shown by the Signal Desk engine. The token changes every time the engine restarts."
    >
      {unauthorizedReason && !error ? (
        <p className="sheet-consequence tone-danger">{unauthorizedReason}</p>
      ) : null}

      <div className="field">
        <label htmlFor="pair-url">Base URL</label>
        <input
          id="pair-url"
          className="mono"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="http://192.168.1.23:8765"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <span className="field-hint">
          On the same Wi-Fi as the engine, use its LAN IP. Once it's on a VPS
          this becomes an https:// address — nothing else changes.
        </span>
      </div>

      <div className="field">
        <label htmlFor="pair-token">Token</label>
        <div className="field-row">
          <input
            id="pair-token"
            className="mono"
            type={showToken ? "text" : "password"}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="paste the token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="button" className="btn auto" style={{ width: 72, flexShrink: 0 }} onClick={() => setShowToken((s) => !s)}>
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <button type="button" className="btn primary" style={{ margin: "var(--s-2) 0 var(--s-4)" }} disabled={busy || !baseUrl.trim() || !token.trim()} onClick={submit}>
        {busy ? "Connecting…" : "Connect"}
      </button>
    </Sheet>
  );
}
