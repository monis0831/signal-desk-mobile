/**
 * pairing.ts — where the engine's address and token live on this device.
 *
 * There is no login. The engine mints a fresh bearer token every time it
 * launches (see api_server.py's module docstring), so "pairing" is the whole
 * auth model: the user copies base URL + token in once, this app remembers
 * them in localStorage, and re-pairing is just doing that again when the
 * engine restarts and the old token stops working.
 *
 * localStorage rather than sessionStorage on purpose — the point of an
 * installed PWA is that it comes back exactly as left when the user taps the
 * home-screen icon days later.
 */

const KEY = "signal-desk-mobile:pairing";

export type Pairing = { baseUrl: string; token: string };

export function loadPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pairing>;
    if (!parsed.baseUrl || !parsed.token) return null;
    return { baseUrl: parsed.baseUrl, token: parsed.token };
  } catch {
    // Private browsing / storage disabled: treat as unpaired rather than
    // throwing on every load.
    return null;
  }
}

export function savePairing(pairing: Pairing): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pairing));
  } catch {
    /* nothing we can do if storage is unavailable; the pairing sheet will
       simply be asked for again next launch. */
  }
}

export function clearPairing(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
