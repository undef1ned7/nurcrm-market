export type ReceiptStyle = "market" | string;

/**
 * Стиль ESC/POS-чека.
 *
 * Исторически market-касса (и legacy `/crm/sell`) не всегда передают
 * `receiptStyle: "market"` явно. Сектор кассы пишется в `localStorage.selectedSector`
 * (`sectorSlice`). Пока этот ключ равен `"market"`, текстовый чек должен
 * использовать market-раскладку (58 мм по умолчанию, «Спасибо за покупку»,
 * колонка «Цена x Кол-о - Скидка»).
 *
 * Явный `receiptStyle` всегда побеждает, чтобы вызовы с кассы/документов
 * не зависели от ключа сектора.
 */
export function resolveReceiptStyle(
  explicitStyle?: ReceiptStyle | null,
  sector?: string | null,
): ReceiptStyle | undefined {
  const explicit = String(explicitStyle ?? "").trim();
  if (explicit) return explicit;
  const sectorSlug = String(sector ?? "").trim().toLowerCase();
  if (sectorSlug === "market") return "market";
  return undefined;
}
