/**
 * Home — answers the three questions from PRODUCT.md in this order: is it
 * armed as expected, did anything fire, am I up or down. Arming lives here,
 * not in More, for the same reason the desktop app keeps it on its
 * Dashboard: it's the control reached for most, and burying "logging" vs
 * "spending money" a tap deeper would be the wrong kind of tidy.
 */

import { useMemo } from "react";
import { useDesk } from "../lib/store";
import { usePositionsOrders } from "../lib/usePositionsOrders";
import { Screen } from "../components/Screen";
import { ListSection, Row, Empty, SkeletonRows } from "../components/List";
import { ArmControl } from "../components/ArmControl";
import { StatusDot } from "../components/StatusDot";
import { Sparkline } from "../components/Sparkline";
import { PnL, Badge } from "../components/PnL";
import { amount, lots, orderKind, actionLabel } from "../lib/format";
import type { TabId } from "../components/Nav";

export function Home({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, trades } = useDesk();
  const { positions, orders, loaded } = usePositionsOrders();

  const account = state?.account ?? null;
  const botOn = state?.trading.bot_enabled ?? false;
  const dryRun = state?.trading.dry_run ?? true;
  const armed = botOn && !dryRun;

  const openPnl = positions.filter((p) => !p.manual).reduce((sum, p) => sum + p.profit, 0);
  const botPositions = positions.filter((p) => !p.manual).length;

  const equityPoints = useMemo(
    () => (state?.equity_series ?? []).map((s) => s.equity),
    [state?.equity_series],
  );
  const equityTrend =
    equityPoints.length > 1
      ? equityPoints[equityPoints.length - 1] >= equityPoints[0]
        ? "profit"
        : "loss"
      : "neutral";

  const recent = trades.slice(-5).reverse();

  const tgStatus = state?.telegram.status ?? "idle";
  const mt5Status = state?.mt5.status ?? "idle";

  return (
    <Screen title="Home">
      <div className="list-section">
        <div className="list-section-label">Arming</div>
        <div className="block">
          <ArmControl account={account} />
          <p className={`block-note${armed ? " tone-armed" : ""}`}>
            {!botOn
              ? "Signals are ignored. Nothing is watched for trading."
              : armed
                ? `Live. Every enabled channel can place real orders on account ${account?.login ?? "—"}.`
                : "Signals are parsed and logged, but nothing is sent."}
          </p>
        </div>
      </div>

      <ListSection label="Connection">
        <Row
          leading={<StatusDot tone={tgStatus === "connected" ? "ok" : tgStatus === "error" ? "error" : "idle"} />}
          title="Telegram"
          subtitle={state?.telegram.detail || undefined}
          value={tgStatus}
        />
        <Row
          leading={<StatusDot tone={mt5Status === "connected" ? "ok" : mt5Status === "error" ? "error" : "idle"} />}
          title="MetaTrader 5"
          subtitle={state?.mt5.detail || undefined}
          value={mt5Status}
        />
      </ListSection>

      <ListSection label="Account" note={account ? `${account.name} · account ${account.login} on ${account.server}` : "Connect MetaTrader 5 to read the account."}>
        <Row title="Equity" value={<span className="mono row-value-lg">{account ? amount(account.equity) : "—"}</span>} />
        <Row title="Balance" value={<span className="mono">{account ? amount(account.balance) : "—"}</span>} />
        {/* null, not 0, when the bot holds nothing: money() renders an em dash
            for null and "0.00" for zero, and those mean different things. A
            0.00 says the bot is exposed and currently flat; with no position
            open there is nothing to read, and showing 0.00 for "nothing" is
            what made this figure look like it had stopped updating. */}
        <Row
          title="Bot open P&L"
          value={<PnL value={botPositions === 0 ? null : openPnl} />}
        />
        <Row
          title="Open positions"
          value={<span className="mono">{botPositions}</span>}
          onClick={() => onNavigate("positions")}
          chevron
        />
        <Row
          title="Queued orders"
          value={<span className="mono">{orders.length}</span>}
          onClick={() => onNavigate("positions")}
          chevron
        />
        <Row
          title="Free margin"
          value={<span className="mono">{account ? amount(account.margin_free) : "—"}</span>}
        />
        <Row
          title="Margin used"
          subtitle={account?.margin_level ? `${Math.round(account.margin_level).toLocaleString("en-US")}% level` : undefined}
          value={<span className="mono">{account ? amount(account.margin) : "—"}</span>}
        />
      </ListSection>

      {equityPoints.length > 1 ? (
        <div className="list-section">
          <div className="list-section-label">Equity trend</div>
          <div className="block">
            <Sparkline points={equityPoints} tone={equityTrend} />
          </div>
          <div className="list-section-note">Sampled every 30s while connected.</div>
        </div>
      ) : null}

      <ListSection label="Recent activity">
        {!loaded ? (
          <SkeletonRows count={3} />
        ) : recent.length === 0 ? (
          <Empty title="Nothing has fired yet">
            When a watched channel posts a signal, the parse and the order
            attempt appear here within a second. An empty list means the bot
            is working, not failing.
          </Empty>
        ) : (
          <>
            {recent.map((trade, i) => (
              <Row
                key={`${trade.ticket ?? "x"}-${i}`}
                title={
                  <span className="row-flex gap-2">
                    <Badge tone={trade.direction === "BUY" ? "buy" : "sell"}>{trade.direction}</Badge>
                    <span className="mono">{trade.broker_symbol || trade.symbol}</span>
                  </span>
                }
                subtitle={`${orderKind(trade.order_kind)} · ${trade.channel || "manual"}`}
                value={
                  <span className="stack" style={{ alignItems: "flex-end" }}>
                    <span className="mono">{lots(trade.volume)} lots</span>
                    <span className="faint" style={{ fontSize: "var(--t-xs)" }}>{actionLabel(trade.action)}</span>
                  </span>
                }
              />
            ))}
            <Row title="See all signals" onClick={() => onNavigate("signals")} chevron />
          </>
        )}
      </ListSection>
    </Screen>
  );
}
