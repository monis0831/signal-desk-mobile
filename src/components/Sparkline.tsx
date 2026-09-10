/**
 * Sparkline.tsx — a clean line, no axes, no interaction. The brief is
 * explicit that a cramped candle chart is worse than none on a phone; this
 * is the "numbers plus a shape" alternative for equity and closed-trade
 * growth curves.
 */

export function Sparkline({
  points,
  height = 40,
  tone = "neutral",
}: {
  points: number[];
  height?: number;
  tone?: "neutral" | "profit" | "loss";
}) {
  if (points.length < 2) {
    return <div style={{ height }} />;
  }
  const width = 300;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color =
    tone === "profit"
      ? "var(--profit)"
      : tone === "loss"
        ? "var(--loss)"
        : "var(--ink-2)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
