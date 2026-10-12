export const CASHFLOWS_PAGE_SIZE = 100;

export const isApprovedFlow = (flow: any) =>
  flow != null &&
  (flow.status === "true" || flow.status === "approved" || flow.status === true);

/** Сумма операции из поля ввода: «1 500,5» → 1500.5; не число → NaN. */
export const parseOperationAmount = (value: unknown) =>
  Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));

/** Допустимый ввод суммы: цифры и не больше одного разделителя с двумя знаками после него. */
export const isAmountDraft = (value: string) => /^\d*([.,]\d{0,2})?$/.test(value);

export const dayKeyOf = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const dayLabelOf = (
  v: any,
  labels: { today?: string; yesterday?: string } = {},
) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "").slice(0, 10);
  const base = d.toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((Number(today) - Number(dd)) / 86400000);
  if (diff === 0) return `${labels.today ?? "Сегодня"} · ${base}`;
  if (diff === 1) return `${labels.yesterday ?? "Вчера"} · ${base}`;
  return base;
};
