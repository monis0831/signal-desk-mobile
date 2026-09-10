import { useState } from "react";
import { useDesk } from "../lib/store";
import { usePositionsOrders } from "../lib/usePositionsOrders";
import type { PendingOrder, Position } from "../lib/api";
import { Screen } from "../components/Screen";
import { ListSection, Empty, SkeletonRows } from "../components/List";
import { PositionRow } from "../components/PositionRow";
import { orderKind, price, lots, ago } from "../lib/format";
import { PositionSheet } from "./positions/PositionSheet";
import { OrderSheet } from "./positions/OrderSheet";
import { NewTradeSheet } from "./positions/NewTradeSheet";

export function Positions() {
  const { state } = useDesk();
  const { positions, orders, loaded } = usePositionsOrders();
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [newTrade, setNewTrade] = useState(false);

  const selectedPosition = positions.find((p) => p.ticket === selectedTicket) ?? null;
  const selectedOrderObj = orders.find((o) => o.ticket === selectedOrder) ?? null;
  const ladder = state?.ladders.find((l) => l.ticket === selectedTicket);

  return (
    <Screen
      title="Positions"
      action={
        <button type="button" className="header-action" onClick={() => setNewTrade(true)}>
          New
        </button>
      }
    >
      <ListSection label={`Open (${positions.length})`}>
        {!loaded ? (
          <SkeletonRows count={2} />
        ) : positions.length === 0 ? (
          <Empty title="No open positions">
            The bot opens one when a watched channel posts a signal with a
            stop, or you place one by hand from the New button above.
          </Empty>
        ) : (
          positions.map((p: Position) => (
            <PositionRow key={p.ticket} position={p} onClick={() => setSelectedTicket(p.ticket)} />
          ))
        )}
      </ListSection>

      <ListSection label={`Queued (${orders.length})`}>
        {!loaded ? (
          <SkeletonRows count={1} />
        ) : orders.length === 0 ? (
          <Empty title="No orders waiting">
            Signals that quote an entry away from the current price rest here
            until price reaches it, instead of filling immediately.
          </Empty>
        ) : (
          orders.map((o: PendingOrder) => (
            <button key={o.ticket} type="button" className="pos-row" onClick={() => setSelectedOrder(o.ticket)}>
              <div className="pos-row-left">
                <span className="pos-row-symbol">
                  <span className={o.direction === "BUY" ? "badge buy" : "badge sell"}>{o.direction}</span>
                  <span className="mono">{o.symbol}</span>
                </span>
                <span className="pos-row-levels">{orderKind(o.kind)} · placed {ago(o.placed_time)}</span>
              </div>
              <div className="pos-row-right">
                <span className="mono">{price(o.price)}</span>
                <span className="pos-row-lots">{lots(o.volume)} lots</span>
              </div>
            </button>
          ))
        )}
      </ListSection>

      <PositionSheet position={selectedPosition} ladder={ladder} onClose={() => setSelectedTicket(null)} />
      <OrderSheet order={selectedOrderObj} onClose={() => setSelectedOrder(null)} />
      <NewTradeSheet open={newTrade} onClose={() => setNewTrade(false)} />
    </Screen>
  );
}
