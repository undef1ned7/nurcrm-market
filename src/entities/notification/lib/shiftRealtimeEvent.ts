/**
 * `market.shift.updated` — бэк шлёт его, когда открытая смена меняется не через
 * её собственный REST-эндпоинт: возврат чека (компенсирующий `expense` с
 * `affects_shift_drawer=true`) или одобрение edit/cancel-заявки по движению
 * этой смены.
 *
 * @see docs/backend/kassa/sale-return-cashflow-backend.md §12 (R9)
 * @see docs/backend/kassa/OPEN-QUESTIONS-2026-09-BE-RESPONSE.md — Блок 1.4
 */
export function isShiftRealtimeEventType(type: string): boolean {
  return (
    type === "market.shift.updated" ||
    (type.startsWith("shift.") && type.endsWith(".updated"))
  );
}

export type ShiftRealtimeEvent = {
  shiftId: string | null;
  /** Числовые поля приходят строками ("1300.00") — оставляем как есть. */
  drawerExpectedCash: string | null;
  cashSalesTotal: string | null;
};

const pickStr = (v: unknown): string | null =>
  v == null || v === "" ? null : String(v);

export function extractShiftRealtimeEvent(payload: unknown): ShiftRealtimeEvent {
  const data = payload && typeof payload === "object" ? (payload as any) : {};
  return {
    shiftId:
      pickStr(data.shift_id) ??
      pickStr(data.shiftId) ??
      pickStr(data.shift) ??
      pickStr(data.id),
    drawerExpectedCash:
      pickStr(data.drawer_expected_cash) ?? pickStr(data.drawerExpectedCash),
    cashSalesTotal:
      pickStr(data.cash_sales_total) ?? pickStr(data.cashSalesTotal),
  };
}
 