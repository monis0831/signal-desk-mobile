import type { Position } from "../lib/api";
import { lots, price } from "../lib/format";
import { PnL } from "./PnL";

export function PositionRow({ position, onClick }: { position: Position; onClick: () => void }) {
  return (
    <button type="button" className="pos-row" onClick={onClick}>
      <div className="pos-row-left">
        <span className="pos-row-symbol">
          <span className={position.direction === "BUY" ? "badge buy" : "badge sell"}>
            {position.direction}
          </span>
          <span className="mono">{position.symbol}</span>
          {position.manual ? <span className="faint" style={{ fontSize: "var(--t-xs)" }}>MANUAL</span> : null}
        </span>
        <span className="pos-row-levels">
          {position.sl ? `SL ${price(position.sl)}` : "no SL"} · {position.tp ? `TP ${price(position.tp)}` : "no TP"}
        </span>
      </div>
      <div className="pos-row-right">
        <PnL value={position.profit} />
        <span className="pos-row-lots">{lots(position.volume)} lots @ {price(position.open_price)}</span>
      </div>
    </button>
  );
}
