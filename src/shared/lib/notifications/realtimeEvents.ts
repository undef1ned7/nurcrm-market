/**
 * Стабильные типы WS-событий для market-модуля.
 * Бэкенд публикует их в `/ws/notifications/` — см. docs/backend/kassa/realtime-notifications-backend.md
 */
export const MARKET_REALTIME_EVENTS = {
  /** Новая продажа / checkout в POS */
  SALE_CREATED: "market.sale.created",
  /** Оплата подтверждена на кассе */
  PAYMENT_RECEIVED: "market.payment.received",
  /** Движение в кассе (income/expense) */
  CASHFLOW_CREATED: "market.cashflow.created",
  /** Заявка pending на подтверждение */
  CASHFLOW_PENDING: "market.cashflow.pending",
  /** Товар принят / отклонён на складе */
  PRODUCT_STATUS_CHANGED: "market.product.status_changed",
  /** Новый товар / закупка */
  PRODUCT_RECEIVED: "market.product.received",
  /** Списание брака */
  PRODUCT_WRITTEN_OFF: "market.product.written_off",
  /** Возврат поставщику */
  SUPPLIER_RETURN: "market.supplier.return",
  /** Долг создан / погашен */
  DEBT_CREATED: "market.debt.created",
  DEBT_PAID: "market.debt.paid",
  /** Долг просрочен (напоминание) */
  DEBT_OVERDUE: "market.debt.overdue",
  /** Смена открыта / закрыта */
  SHIFT_OPENED: "market.shift.opened",
  SHIFT_CLOSED: "market.shift.closed",
  /** Низкий остаток на складе */
  STOCK_LOW: "market.stock.low",
  /** Истекает / истёк срок годности товара */
  PRODUCT_EXPIRING: "market.product.expiring",
  /** Системное / тариф */
  TARIFF_WARNING: "tariff.expiring",
  SYSTEM: "system.notification",
} as const;

export type MarketRealtimeEvent =
  (typeof MARKET_REALTIME_EVENTS)[keyof typeof MARKET_REALTIME_EVENTS];

const MARKET_EVENT_SET = new Set<string>(
  Object.values(MARKET_REALTIME_EVENTS),
);

export function isMarketRealtimeEvent(type: string): boolean {
  const normalized = String(type || "").toLowerCase();
  return (
    MARKET_EVENT_SET.has(normalized) ||
    normalized.startsWith("market.") ||
    normalized === "notification"
  );
}

export function realtimeLevelToToastType(
  level: unknown,
): "success" | "error" | "warning" | "info" {
  const normalized = String(level || "").toLowerCase();
  if (["critical", "urgent", "high", "danger", "error"].includes(normalized)) {
    return "error";
  }
  if (["warning", "medium", "warn"].includes(normalized)) {
    return "warning";
  }
  if (["success", "ok"].includes(normalized)) {
    return "success";
  }
  return "info";
}
