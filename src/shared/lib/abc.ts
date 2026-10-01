/**
 * ABC-анализ по правилу Парето: A — первые 80% результата, B — следующие 15%,
 * C — последние 5%. Границы 80/95 общепринятые.
 *
 * Группа определяется по накопленной доле ДО позиции: позиция, которая сама
 * пересекает границу 80%, остаётся в A. Отрицательные значения (убыточные
 * позиции) в базу не входят и всегда попадают в C.
 */

export type AbcClass = "A" | "B" | "C";

export const ABC_CLASSES: AbcClass[] = ["A", "B", "C"];
export const ABC_THRESHOLD_A = 80;
export const ABC_THRESHOLD_B = 95;

export type AbcInputItem = {
  id?: string | number | null;
  name: string;
  /** Значение показателя (сом, шт. и т.д.). */
  value: number;
};

export type AbcRow<T extends AbcInputItem = AbcInputItem> = T & {
  key: string;
  /** Доля позиции в итоге, %. */
  share: number;
  /** Нарастающий итог, %. */
  cumShare: number;
  abcClass: AbcClass;
};

export type AbcSummaryEntry = { count: number; value: number; share: number };
export type AbcSummary = Record<AbcClass, AbcSummaryEntry>;

export function computeAbc<T extends AbcInputItem>(
  items: T[],
  thresholdA = ABC_THRESHOLD_A,
  thresholdB = ABC_THRESHOLD_B,
): AbcRow<T>[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, r) => sum + Math.max(r.value, 0), 0);
  let running = 0;
  return sorted.map((r, index) => {
    const value = Math.max(r.value, 0);
    const startShare = total > 0 ? (running / total) * 100 : 100;
    running += value;
    const share = total > 0 ? (value / total) * 100 : 0;
    const cumShare = total > 0 ? (running / total) * 100 : 0;
    const abcClass: AbcClass =
      value <= 0
        ? "C"
        : startShare < thresholdA
          ? "A"
          : startShare < thresholdB
            ? "B"
            : "C";
    return {
      ...r,
      key: `${r.id ?? "none"}-${index}`,
      share,
      cumShare,
      abcClass,
    };
  });
}

export function summarizeAbc(rows: AbcRow[]): AbcSummary {
  const base = Object.fromEntries(
    ABC_CLASSES.map((c) => [c, { count: 0, value: 0, share: 0 }]),
  ) as AbcSummary;
  rows.forEach((r) => {
    base[r.abcClass].count += 1;
    base[r.abcClass].value += r.value;
    base[r.abcClass].share += r.share;
  });
  return base;
}
