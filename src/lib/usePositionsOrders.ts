/**
 * usePositionsOrders.ts — shared polling + live-push logic for Home and
 * Positions, which both need the same "what's open, what's resting" data.
 *
 * Positions are pushed by the engine on every change (see store.tsx's
 * `livePositions`), so once that first push lands we stop trusting our own
 * poll for positions specifically — otherwise a closed trade could flicker
 * back into view between the push and the next 8s poll. Pending orders have
 * no push equivalent in the API, so they stay polled.
 */

import { useEffect, useState } from "react";
import { useDesk } from "./store";
import type { PendingOrder, Position } from "./api";

export function usePositionsOrders() {
  const { api, livePositions, trades } = useDesk();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    const load = async () => {
      try {
        const [p, o] = await Promise.all([api.positions(true), api.orders(true)]);
        if (!alive) return;
        setPositions(p.positions);
        setOrders(o.orders);
        setLoaded(true);
      } catch {
        /* the header indicator already reports a dead connection */
      }
    };
    void load();
    const timer = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // `trades.length` forces a re-poll right after a fill so orders (which
    // aren't pushed) catch up promptly instead of waiting the full 8s.
  }, [api, trades.length]);

  useEffect(() => {
    if (livePositions) setPositions(livePositions);
  }, [livePositions]);

  return { positions, orders, loaded };
}
