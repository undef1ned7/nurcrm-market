import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { listPendingDebtDeals, processPendingDebtDeals } from "@entities/sale";

const POLL_INTERVAL_MS = 30_000;

/**
 * Монтируется на всё время работы кассы (см. useCashierPage.ts). Сам, без
 * участия кассира, допробует недооформленные долги из очереди
 * (docs/sale-flow-bugs.md, пункт 7): сразу при монтировании, по таймеру,
 * пока очередь не пуста, и сразу при возврате сети.
 */
export function useDebtDealQueueProcessor() {
  const dispatch = useDispatch();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (listPendingDebtDeals().length > 0) {
        await processPendingDebtDeals(dispatch);
      }
    };

    void tick();
    timerRef.current = window.setInterval(tick, POLL_INTERVAL_MS);

    const onOnline = () => void tick();
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      window.removeEventListener("online", onOnline);
    };
  }, [dispatch]);
}
