/**
 * Срок годности партий (FEFO), за флагом `VITE_PRODUCT_BATCH_EXPIRY`.
 * Форма товара просит длительность хранения (сколько дней/месяцев товар
 * годен), а не абсолютную дату — при каждом приходе бэкенд считает
 * `expires_at` партии от даты прихода. См.
 * docs/backend/product-batch-expiry-backend.md.
 */

export type ShelfLifeUnit = "days" | "months";

/** 1 месяц = 30 дней — фиксированная конвенция, единая с бэком (см. контракт). */
export const DAYS_PER_MONTH = 30;

/** Длительность формы (значение + единица) → `shelf_life_days` для API. `null`, если не задано. */
export function shelfLifeToDays(
  value: string | number | null | undefined,
  unit: ShelfLifeUnit,
): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const days = unit === "months" ? Math.round(n * DAYS_PER_MONTH) : Math.round(n);
  return days > 0 ? days : null;
}

/** `shelf_life_days` из API → значение + единица для формы. Месяцы — только при ровном делении. */
export function daysToShelfLife(
  days: number | null | undefined,
): { value: string; unit: ShelfLifeUnit } {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return { value: "", unit: "days" };
  if (n >= DAYS_PER_MONTH && n % DAYS_PER_MONTH === 0) {
    return { value: String(n / DAYS_PER_MONTH), unit: "months" };
  }
  return { value: String(n), unit: "days" };
}
