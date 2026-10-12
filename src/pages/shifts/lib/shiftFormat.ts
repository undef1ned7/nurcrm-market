/**
 * Безопасное форматирование для «Смен» (список и карточка).
 *
 * Раньше суммы выводились как `parseFloat(v || 0).toFixed(2)`: мусор от сервера
 * («abc») давал «NaN сом», а неверная дата — «NaN Invalid Date NaN:NaN».
 */

/** Число из ответа сервера: строка/число, запятая как разделитель. null — не число. */
export function toAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** «12500.00» — как раньше; не число → «—» вместо «NaN». Пусто → «0.00». */
export function formatAmount(v: unknown): string {
  if (v === null || v === undefined || v === "") return "0.00";
  const n = toAmount(v);
  return n === null ? "—" : n.toFixed(2);
}

/** Дата из ответа; null — пусто или не дата. */
export function parseShiftDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * «5 октября 09:00». День и месяц форматируются ВМЕСТЕ — тогда месяц в родительном
 * падеже («октября»). Раньше месяц брался отдельно и выходило «5 октябрь».
 * Не дата → «—».
 */
export function formatShiftDate(v: unknown, locale = "ru-RU"): string {
  const d = parseShiftDate(v);
  if (!d) return "—";
  const dayMonth = d.toLocaleDateString(locale, { day: "numeric", month: "long" });
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dayMonth} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type ShiftLoadError = { status?: number; data?: any; message?: string } | null | undefined;

/** 404 — «не найдена»; всё остальное (500, нет сети) — сбой загрузки. */
export const isNotFound = (err: ShiftLoadError) => err?.status === 404;

/**
 * Текст ошибки для пользователя. Понятный ответ сервера на 4xx (`detail`) —
 * показываем; 5xx, нет сети и технические тексты axios («Request failed with
 * status code 500») — заменяем на `fallback`.
 */
export function shiftErrorMessage(err: ShiftLoadError, fallback: string): string {
  const status = err?.status;
  const detail = err?.data?.detail;
  if (status && status >= 400 && status < 500 && typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }
  return fallback;
}
