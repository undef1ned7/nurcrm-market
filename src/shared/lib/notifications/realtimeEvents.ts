/**
 * Типы WS-событий, которые бэкенд NurCRM реально публикует в
 * `/ws/notifications/` (сверка от 2026-09-08, Staging == Prod).
 *
 * Бэк шлёт «плоские» строки без точек (`lead_alert`, `stock_shortage` …),
 * а не `market.*.*`. Единственное реально приходящее событие с точками —
 * `market.product.expiring`. События кассы (`market.cashflow.*`) идут отдельной
 * веткой — см. `entities/notification/lib/cashflowRealtimeEvent.ts`.
 *
 * См. docs/backend/kassa/realtime-notifications-backend.md
 */

/** Реально публикуемые бэкендом типы. */
export const MARKET_REALTIME_EVENTS = {
  /** Истечение тарифа */
  TARIFF_WARNING: "tariff",
  /** Системное уведомление */
  SYSTEM: "system",
  /** Общий алерт по лиду: назначение / передача / SLA / нет активности /
   *  просрочка задачи. Подтип — в `data.alert_kind`. */
  LEAD_ALERT: "lead_alert",
  /** Лид без ответа > 15 мин (scan_unanswered_leads) */
  UNANSWERED_LEAD_ALERT: "unanswered_lead_alert",
  /** Входящее сообщение от лида (Wazzup) */
  LEAD_MESSAGE: "lead_message",
  /** Истекает / истёк срок годности товара */
  PRODUCT_EXPIRING: "market.product.expiring",
  /** Дефицит остатков на складе */
  STOCK_SHORTAGE: "stock_shortage",
  /** Перемещение товара агенту */
  AGENT_TRANSFER: "agent_transfer",
  /** Возврат товара от агента */
  AGENT_RETURN: "agent_return",
} as const;

/**
 * Типы из ТЗ, которые бэкенд пока НЕ шлёт (нужна реализация).
 * Оставлены для документации контракта — фронт их не ждёт.
 */
export const PLANNED_MARKET_REALTIME_EVENTS = {
  SALE_CREATED: "market.sale.created",
  PAYMENT_RECEIVED: "market.payment.received",
  CASHFLOW_CREATED: "market.cashflow.created",
  CASHFLOW_PENDING: "market.cashflow.pending",
  PRODUCT_STATUS_CHANGED: "market.product.status_changed",
  PRODUCT_RECEIVED: "market.product.received",
  PRODUCT_WRITTEN_OFF: "market.product.written_off",
  SUPPLIER_RETURN: "market.supplier.return",
  DEBT_CREATED: "market.debt.created",
  DEBT_PAID: "market.debt.paid",
  DEBT_OVERDUE: "market.debt.overdue",
  SHIFT_OPENED: "market.shift.opened",
  SHIFT_CLOSED: "market.shift.closed",
  STOCK_LOW: "market.stock.low",
} as const;

export type MarketRealtimeEvent =
  (typeof MARKET_REALTIME_EVENTS)[keyof typeof MARKET_REALTIME_EVENTS];

const MARKET_EVENT_SET = new Set<string>([
  ...Object.values(MARKET_REALTIME_EVENTS),
  ...Object.values(PLANNED_MARKET_REALTIME_EVENTS),
]);

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
