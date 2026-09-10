export type DotTone = "ok" | "error" | "armed" | "idle" | "connecting";

export function StatusDot({ tone, label }: { tone: DotTone; label?: string }) {
  const cls = tone === "idle" ? "" : ` ${tone}`;
  return (
    <span
      className={`status-dot${cls}`}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}
