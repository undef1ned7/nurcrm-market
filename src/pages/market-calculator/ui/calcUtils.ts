/**
 * Разбор чисел из полей калькулятора.
 *
 * Принимаем то, что реально вводят и копируют: «1 250,50», «1250.5», «1,000.50»
 * (Excel), «1.000,50», «5%», «+5». Всё остальное — ошибка у поля, а не молчаливый 0:
 * иначе «5%» в скидке тихо превращался в 0 и калькулятор уверенно показывал
 * неверный ответ.
 */

/** Ограничения поля: границы включительно, если не сказано иное. */
export type NumSpec = {
  min?: number;
  max?: number;
  /** Граница max не входит (маржа < 100 %). */
  maxExclusive?: boolean;
  /** Граница min не входит (курс > 0). */
  minExclusive?: boolean;
};

export type NumError = "format" | "min" | "max";

const SPACES = /[\s\u00a0\u202f\u2009']/g;

/** Число из строки; null — пусто или не число. */
export const parseNumStrict = (v: string | number | null | undefined): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").replace(SPACES, "");
  if (s.endsWith("%")) s = s.slice(0, -1);
  if (!s) return null;

  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;
  if (commas && dots) {
    // Последний разделитель — дробный, остальные — тысячи: 1,000.50 / 1.000,50
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const thou = dec === "," ? "." : ",";
    s = s.split(thou).join("");
    if (s.split(dec).length > 2) return null;
    s = s.replace(dec, ".");
  } else if (commas > 1) {
    s = s.replace(/,/g, ""); // 1,000,000
  } else if (dots > 1) {
    s = s.replace(/\./g, ""); // 1.000.000
  } else {
    s = s.replace(",", ".");
  }

  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Проверка значения поля по ограничениям. */
export const checkNum = (
  v: string,
  spec: NumSpec = {},
): { value: number | null; error: NumError | null } => {
  if (String(v ?? "").trim() === "") return { value: null, error: null };
  const n = parseNumStrict(v);
  if (n === null) return { value: null, error: "format" };
  if (spec.min !== undefined && (spec.minExclusive ? n <= spec.min : n < spec.min)) {
    return { value: null, error: "min" };
  }
  if (spec.max !== undefined && (spec.maxExclusive ? n >= spec.max : n > spec.max)) {
    return { value: null, error: "max" };
  }
  return { value: n, error: null };
};

/** Значение для расчёта: null — пусто или ошибка. */
export const readNum = (v: string, spec?: NumSpec) => checkNum(v, spec).value;

/** Пустое или ошибочное поле считаем нулём (для сумм вроде «расходы в месяц»). */
export const parseNum = (v: string | number | null | undefined): number =>
  parseNumStrict(v) ?? 0;

/** В поле есть корректное число. */
export const hasValue = (v: string, spec?: NumSpec) => readNum(v, spec) !== null;

/** В поле что-то введено, но это не подходит. */
export const isBad = (v: string, spec?: NumSpec) => checkNum(v, spec).error !== null;

/** Типовые ограничения полей. */
export const SPEC = {
  money: { min: 0 },
  qty: { min: 0 },
  markup: { min: 0 },
  /** Маржа как доля цены: от 0 до 100 % (100 % — только при нулевой закупке). */
  margin: { min: 0, max: 100, maxExclusive: true },
  percent: { min: 0, max: 100 },
  tax: { min: 0, max: 100, maxExclusive: true },
  rate: { min: 0, minExclusive: true },
  days: { min: 1, max: 31 },
} satisfies Record<string, NumSpec>;
