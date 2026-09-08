/**
 * Одобрение edit/cancel-заявки по движению кассы (см.
 * docs/backend/kassa/cashflow-edit-cancel-request-backend.md §11 R8) шлёт
 * `market.cashflow.updated` / `market.cashflow.deleted` в канал компании.
 * Возврат чека (docs/backend/kassa/sale-return-cashflow-backend.md §12)
 * планирует `market.cashflow.created` по тому же образцу.
 */
export function isCashflowRealtimeEventType(type: string): boolean {
  return (
    type === "market.cashflow.updated" ||
    type === "market.cashflow.deleted" ||
    type === "market.cashflow.created" ||
    (type.startsWith("cashflow.") &&
      (type.endsWith(".updated") ||
        type.endsWith(".deleted") ||
        type.endsWith(".created")))
  );
}

export type CashflowRealtimeEventKind = "created" | "updated" | "deleted";

export function cashflowRealtimeEventKind(
  type: string,
): CashflowRealtimeEventKind {
  if (
    type.endsWith("deleted") ||
    type.endsWith("cancelled") ||
    type.endsWith("canceled")
  ) {
    return "deleted";
  }
  if (type.endsWith("created")) return "created";
  return "updated";
}

export function extractCashflowRealtimeEvent(
  type: string,
  payload: unknown,
): {
  kind: CashflowRealtimeEventKind;
  cashboxId: string | null;
  flowId: string | null;
} {
  const data = payload && typeof payload === "object" ? (payload as any) : {};
  return {
    kind: cashflowRealtimeEventKind(type),
    cashboxId: data.cashbox_id ?? data.cashboxId ?? data.cashbox ?? null,
    flowId:
      data.cashflow_id ?? data.cashflowId ?? data.flow_id ?? data.id ?? null,
  };
}
