/**
 * Периоды для Сводки, ABC-анализа и «Калькуляции» (даты — локальные, как в «Аналитике»).
 *
 * today   — сегодня;
 * week    — последние 7 дней, включая сегодня;
 * month   — с 1-го числа текущего месяца по сегодня;
 * quarter — последние 3 календарных месяца: с 1-го числа месяца, который был
 *           два месяца назад, по сегодня;
 * custom  — свои даты «с» и «по».
 */

export type PeriodPreset = "today" | "week" | "month" | "quarter" | "custom";

export type DateRange = { from: Date; to: Date };

export const startOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

export const endOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export function resolvePeriod(
  preset: PeriodPreset,
  custom?: Partial<DateRange> | null,
  now: Date = new Date(),
): DateRange {
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: endOfDay(now) };
    case "week":
      return { from: addDays(today, -6), to: endOfDay(now) };
    case "month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(now),
      };
    case "quarter":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: endOfDay(now),
      };
    default: {
      const from = custom?.from ? startOfDay(custom.from) : today;
      const to = custom?.to ? endOfDay(custom.to) : endOfDay(now);
      return from.getTime() <= to.getTime()
        ? { from, to }
        : { from: startOfDay(to), to: endOfDay(from) };
    }
  }
}

/**
 * Прошлый период для сравнения: «к вчера», «к прошлой неделе»,
 * «к прошлому месяцу» (тот же отрезок дней), для своих дат — такой же
 * по длине отрезок перед выбранным.
 */
export function previousPeriod(
  preset: PeriodPreset,
  current: DateRange,
): DateRange {
  if (preset === "today") {
    const from = addDays(current.from, -1);
    return { from, to: endOfDay(from) };
  }
  if (preset === "month" || preset === "quarter") {
    const months = preset === "month" ? 1 : 3;
    const from = new Date(
      current.from.getFullYear(),
      current.from.getMonth() - months,
      1,
    );
    const spanDays = Math.round(
      (startOfDay(current.to).getTime() - startOfDay(current.from).getTime()) /
        86400000,
    );
    const lastDayOfPrevious = endOfDay(
      new Date(current.from.getFullYear(), current.from.getMonth(), 0),
    );
    const to = endOfDay(addDays(from, spanDays));
    return { from, to: to > lastDayOfPrevious && months === 1 ? lastDayOfPrevious : to };
  }
  const days =
    Math.round(
      (startOfDay(current.to).getTime() - startOfDay(current.from).getTime()) /
        86400000,
    ) + 1;
  const from = addDays(current.from, -days);
  return { from, to: endOfDay(addDays(current.from, -1)) };
}

/** `YYYY-MM-DDTHH:MM:SS` без таймзоны — формат `period_start/period_end`. */
export function formatPeriodForApi(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** `YYYY-MM-DD` для `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
