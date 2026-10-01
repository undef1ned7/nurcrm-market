/**
 * Единый способ парсить денежные значения из API. Раньше по потоку продажи
 * было разбросано вперемешку `parseFloat`/`Number`/`.toFixed(2)`, и в местах
 * вида `parseFloat(x || 0) || fallback` честный `0` от сервера (100% скидка)
 * тихо подменялся фолбэком — см. docs/sale-flow-bugs.md, пункт 3 и пункт 10.
 *
 * `toMoney` намеренно возвращает `NaN`, а не `0`, когда данных нет — так
 * вызывающий код обязан явно решить, что делать с отсутствием данных
 * (`Number.isFinite(n) ? n : fallback`), а не полагаться на то, что `0`/""`
 * тихо превратятся в ложный "нет данных" через `||`.
 */

export function toMoney(value: string | number | null | undefined): number {
  if (value == null || value === "") return NaN;
  return typeof value === "number" ? value : parseFloat(value);
}

/** Тот же парсинг, но с явным фолбэком на 0 — для мест, где отсутствие данных и есть 0. */
export function toMoneyOrZero(value: string | number | null | undefined): number {
  const n = toMoney(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: string | number | null | undefined): string {
  return toMoneyOrZero(value).toFixed(2);
}
