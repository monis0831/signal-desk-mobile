import type { ReactNode } from "react";
import { money } from "../lib/format";

/** Signed P&L text — never colour alone, per PRODUCT.md. */
export function PnL({ value, flashKey }: { value: number | null | undefined; flashKey?: string | number }) {
  const m = money(value);
  return (
    <span className={`pnl ${m.className}`} aria-label={m.aria} key={flashKey}>
      <span aria-hidden="true">{m.glyph} </span>
      {m.text}
    </span>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone?: "buy" | "sell" | "rejected" | "armed" | "live" | "";
  children: ReactNode;
}) {
  return <span className={`badge${tone ? ` ${tone}` : ""}`}>{children}</span>;
}
