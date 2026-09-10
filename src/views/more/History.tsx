/**
 * History — closed trades, win rate, profit factor, drawdown, growth curve.
 * Everything here comes from MT5's own closed-deal history via
 * trade_history.py, never from the bot's optimistic record — PRODUCT.md's
 * "never lie about money".
 */

import { useEffect, useState } from "react";
import { useDesk } from "../../lib/store";
import type { HistoryPayload } from "../../lib/api";
import { Screen } from "../../components/Screen";
import { ListSection, Row, Empty, SkeletonRows } from "../../components/List";
import { Sparkline } from "../../components/Sparkline";
import { PnL } from "../../components/PnL";
import { Segmented } from "../../components/Segmented";
import { amount, dateTime, lots, percent } from "../../lib/format";

const RANGES: { value: "7" | "30" | "90"; label: string }[] = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
];

export function History({ onBack }: { onBack: () => void }) {
  const { api } = useDesk();
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    setLoading(true);
    api.history(Number(days)).then((r) => { if (alive) { setData(r); setLoading(false); } }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [api, days]);

  const curve = data?.curve.map((p) => p.v) ?? [];
  const trend = curve.length > 1 ? (curve[curve.length - 1] >= curve[0] ? "profit" : "loss") : "neutral";

  return (
    <Screen title="History" onBack={onBack}>
      <div className="px-4">
        <Segmented value={days} onChange={setDays} segments={RANGES} />
      </div>

      {loading ? (
        <ListSection><SkeletonRows count={4} /></ListSection>
      ) : !data ? (
        <ListSection><Empty title="Couldn't load history">Check the connection and try again.</Empty></ListSection>
      ) : (
        <>
          <ListSection label="Performance">
            <Row title="Net" value={<PnL value={data.stats.net} />} />
            <Row title="Win rate" value={<span className="mono">{percent(data.stats.win_rate)}</span>} subtitle={`${data.stats.wins}W / ${data.stats.losses}L / ${data.stats.breakeven}BE`} />
            <Row title="Profit factor" value={<span className="mono">{data.stats.profit_factor_text}</span>} />
            <Row title="Max drawdown" value={<span className="mono">{amount(data.max_drawdown.absolute)} ({percent(data.max_drawdown.percent)})</span>} />
            <Row title="Volume traded" value={<span className="mono">{lots(data.stats.volume)} lots</span>} />
          </ListSection>

          {curve.length > 1 ? (
            <div className="list-section">
              <div className="list-section-label">Growth curve</div>
              <div className="block">
                <Sparkline points={curve} tone={trend} height={56} />
              </div>
            </div>
          ) : null}

          <ListSection label={`Closed trades (${data.trades.length})`}>
            {data.trades.length === 0 ? (
              <Empty title="No closed trades in this range">Widen the range or check back after the next trade closes.</Empty>
            ) : (
              data.trades.slice().reverse().slice(0, 40).map((t) => (
                <Row
                  key={`${t.position_id}-${t.close_time}`}
                  title={
                    <span className="row-flex gap-2">
                      <span className={t.direction === "BUY" ? "badge buy" : "badge sell"}>{t.direction}</span>
                      <span className="mono">{t.symbol}</span>
                    </span>
                  }
                  subtitle={`${lots(t.volume)} lots · closed ${dateTime(t.close_time)}${t.origin === "desk" ? " · hand-placed" : ""}`}
                  value={<PnL value={t.net} />}
                />
              ))
            )}
          </ListSection>
        </>
      )}
    </Screen>
  );
}
