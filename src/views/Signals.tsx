/**
 * Signals — "understand what arrived and what happened to it" (PRODUCT.md).
 * Every feed item the engine has published in this session, newest last,
 * each with an outcome badge that's coloured only when it means "rejected".
 * Skip reasons are the whole point of this screen: PRODUCT.md calls
 * "not traded" without a visible reason the single worst failure the app
 * can have.
 */

import { useMemo, useState } from "react";
import { useDesk } from "../lib/store";
import { usePositionsOrders } from "../lib/usePositionsOrders";
import type { FeedItem } from "../lib/store";
import { Screen } from "../components/Screen";
import { ListSection, Empty, Row } from "../components/List";
import { Badge } from "../components/PnL";
import { Segmented } from "../components/Segmented";
import { clock, lots, orderKind, price, actionLabel, actionBadgeTone } from "../lib/format";
import { ParseTesterSheet } from "./signals/ParseTesterSheet";

type Filter = "all" | "trades" | "skipped" | "messages";

export function Signals() {
  const { feed } = useDesk();
  const { orders } = usePositionsOrders();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tester, setTester] = useState(false);

  const items = useMemo(() => {
    const matches = (item: FeedItem) => {
      switch (filter) {
        case "trades": return item.kind === "trade" || item.kind === "signal";
        case "skipped": return item.kind === "skip" || item.kind === "no_signal";
        case "messages": return item.kind === "message";
        default: return true;
      }
    };
    return feed.filter(matches).slice().reverse();
  }, [feed, filter]);

  return (
    <Screen
      title="Signals"
      action={
        <button type="button" className="header-action" onClick={() => setTester(true)}>
          Test
        </button>
      }
    >
      <div className="px-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          segments={[
            { value: "all", label: "All" },
            { value: "trades", label: "Trades" },
            { value: "skipped", label: "Skipped" },
            { value: "messages", label: "Messages" },
          ]}
        />
      </div>

      {/* Resting orders sit above the log and stay there.
          A queued order is a STATE, not an event: it was placed once and then
          waits, maybe for hours, until price reaches it. The log records the
          placing and then falls silent, so without this the only way to see
          what is still waiting was to leave this screen. Not a filter segment —
          a fifth segment would crowd the control at 390pt, and this should be
          visible whichever filter is chosen. */}
      {orders.filter((o) => !o.manual).length > 0 ? (
        <ListSection
          label={`Waiting to fill (${orders.filter((o) => !o.manual).length})`}
          note="These rest at their entry until price reaches them. Cancel one from Positions."
        >
          {orders
            .filter((o) => !o.manual)
            .map((order) => (
              <Row
                key={order.ticket}
                title={`${order.symbol} ${order.direction}`}
                subtitle={`${orderKind(order.kind)} · ${lots(order.volume)} lots`}
                value={<span className="mono">{price(order.price, 2)}</span>}
              />
            ))}
        </ListSection>
      ) : null}

      <ListSection>
        {items.length === 0 ? (
          <Empty title="Nothing yet on this filter">
            Live activity from every watched channel appears here the moment
            it happens — parses, skips, and order attempts alike.
          </Empty>
        ) : (
          items.map((item) => (
            <FeedRow
              key={item.id}
              item={item}
              expanded={expanded === item.id}
              onToggle={() => setExpanded((cur) => (cur === item.id ? null : item.id))}
            />
          ))
        )}
      </ListSection>

      <ParseTesterSheet open={tester} onClose={() => setTester(false)} />
    </Screen>
  );
}

function FeedRow({ item, expanded, onToggle }: { item: FeedItem; expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }} onClick={onToggle}>
      <div className="spread" style={{ width: "100%" }}>
        <FeedSummary item={item} />
        <span className="faint mono" style={{ fontSize: "var(--t-xs)" }}>{clock(item.ts)}</span>
      </div>
      {expanded ? <FeedDetail item={item} /> : null}
    </button>
  );
}

function FeedSummary({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "message":
      return <span className="row-subtitle" style={{ color: "var(--ink-2)" }}>{item.channel}: {item.text.slice(0, 60)}</span>;
    case "signal":
      return (
        <span className="row-flex gap-2">
          <Badge>parsed</Badge>
          <span className="mono">{item.signal.symbol}</span>
          <span className="faint">{item.signal.channel}</span>
        </span>
      );
    case "skip":
    case "no_signal":
      return (
        <span className="row-flex gap-2">
          <Badge>skipped</Badge>
          <span className="muted">{item.channel}</span>
        </span>
      );
    case "trade": {
      const t = item.trade;
      const tone = actionBadgeTone(t.action);
      return (
        <span className="row-flex gap-2">
          <Badge tone={tone || undefined}>{actionLabel(t.action)}</Badge>
          <span className={t.direction === "BUY" ? "badge buy" : "badge sell"}>{t.direction}</span>
          <span className="mono">{t.broker_symbol || t.symbol}</span>
        </span>
      );
    }
  }
}

function FeedDetail({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "message":
      return <p className="muted" style={{ fontSize: "var(--t-sm)", whiteSpace: "pre-wrap" }}>{item.text}</p>;
    case "signal":
      return (
        <div className="stack gap-1 mono" style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)" }}>
          <span>Entry {price(item.signal.entry)} · SL {item.signal.sl ? price(item.signal.sl) : "none"}</span>
          <span>Targets {item.signal.tps.map((t) => price(t)).join(", ") || "none"}</span>
          {item.signal.warnings.length ? <span className="faint">{item.signal.warnings.join(" · ")}</span> : null}
        </div>
      );
    case "skip":
    case "no_signal":
      return <p style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)" }}>{item.reason}</p>;
    case "trade": {
      const t = item.trade;
      return (
        <div className="stack gap-1" style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)" }}>
          <span className="mono">
            {lots(t.volume)} lots · {orderKind(t.order_kind)} · {t.price ? price(t.price) : "—"}
          </span>
          <span>{t.reason || t.summary}</span>
          {t.channel ? <span className="faint">via {t.channel}</span> : null}
        </div>
      );
    }
  }
}
