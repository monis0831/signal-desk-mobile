/**
 * format.ts — number, money and time rendering.
 *
 * Ported from the desktop app's lib/format.ts, which this mirrors field for
 * field: the money helpers return a sign and a direction glyph as well as a
 * colour class, because PRODUCT.md holds "profit/loss never encoded by
 * colour alone" as an accessibility requirement in both apps. Red/green
 * confusion is common in this user base and this is the one place it would
 * cost money.
 */

const DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A price, at the instrument's own precision. */
export function price(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** A plain 2dp number with thousands separators. */
export function amount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return DECIMAL.format(value).replace("-", "−");
}

export type Money = {
  text: string;
  glyph: string;
  className: "up" | "down" | "muted";
  aria: string;
};

/** Signed money with a direction glyph and a colour class. */
export function money(value: number | null | undefined): Money {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { text: "—", glyph: "", className: "muted", aria: "no data" };
  }
  const magnitude = DECIMAL.format(Math.abs(value));
  if (value > 0) {
    return { text: `+${magnitude}`, glyph: "▲", className: "up", aria: `up ${magnitude}` };
  }
  if (value < 0) {
    return { text: `−${magnitude}`, glyph: "▼", className: "down", aria: `down ${magnitude}` };
  }
  return { text: "0.00", glyph: "·", className: "muted", aria: "flat" };
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function signedPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(digits)}%`;
}

export function lots(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function clock(value: number | string | null | undefined): string {
  const date = toDate(value);
  return date ? TIME.format(date) : "—";
}

export function dateTime(value: number | string | null | undefined): string {
  const date = toDate(value);
  return date ? DATETIME.format(date) : "—";
}

function toDate(value: number | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const ms = value < 1e12 ? value * 1000 : value;
  const parsed = new Date(ms);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "4m ago", "2h ago" — for how stale a reading is. */
export function ago(value: number | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

/** Bare seconds-ago for the staleness pill, which wants "12s" not "just now". */
export function secondsAgo(value: number | null | undefined): number | null {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
}

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/** "buy_limit" -> "BUY LIMIT" */
export function orderKind(kind: string | null | undefined): string {
  if (!kind) return "MARKET";
  return kind.replace(/_/g, " ").toUpperCase();
}

const ACTION_LABEL: Record<string, string> = {
  sent: "Filled",
  queued: "Queued",
  dry_run: "Dry run",
  rejected: "Refused",
  error: "Error",
};

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** Which badge tone an outcome earns — only "rejected"/"error" get colour. */
export function actionBadgeTone(action: string): "rejected" | "" {
  return action === "rejected" || action === "error" ? "rejected" : "";
}
