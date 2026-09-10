/**
 * AuthPromptSheet.tsx — Telegram just texted a login code and a worker
 * thread in the engine is blocked waiting for it (`ask_login_code` in
 * api_server.py, up to 300s). This can arrive while any screen is open, so
 * it's mounted once at the app root rather than inside a single view.
 */

import { useState } from "react";
import { useDesk } from "../lib/store";
import { Sheet } from "./Sheet";

export function AuthPromptSheet() {
  const { authPrompt, clearAuthPrompt, api, run } = useDesk();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);

  if (!authPrompt) return null;

  const submit = async () => {
    if (!api || !code.trim()) return;
    setSending(true);
    const ok = await run(() => api.submitCode(code.trim()));
    setSending(false);
    if (ok) {
      setCode("");
      clearAuthPrompt();
    }
  };

  return (
    <Sheet open dismissable={false} onClose={clearAuthPrompt} title="Telegram login code" description={authPrompt}>
      <div className="field">
        <label htmlFor="auth-code">Code</label>
        <input
          id="auth-code"
          className="mono"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <button type="button" className="btn primary" style={{ marginBottom: "var(--s-4)" }} disabled={sending || !code.trim()} onClick={submit}>
        {sending ? "Submitting…" : "Submit code"}
      </button>
      <button type="button" className="btn ghost" style={{ marginBottom: "var(--s-4)" }} onClick={clearAuthPrompt}>
        Dismiss (the login will time out)
      </button>
    </Sheet>
  );
}
