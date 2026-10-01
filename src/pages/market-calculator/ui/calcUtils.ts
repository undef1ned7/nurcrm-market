/** Число из поля ввода: допускает запятую и пробелы. NaN → 0. */
export const parseNum = (v: string | number | null | undefined): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const hasValue = (v: string) => v.trim() !== "" && Number.isFinite(parseNum(v));
