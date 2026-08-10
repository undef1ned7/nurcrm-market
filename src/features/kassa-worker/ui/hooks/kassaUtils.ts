export const CASHFLOWS_PAGE_SIZE = 100;
export const REPORT_PAGE_SIZE = 200;
export const REPORT_MAX_PAGES = 100;

export const isApprovedFlow = (flow: any) =>
  flow.status === "true" || flow.status === "approved" || flow.status === true;

export const dayKeyOf = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const dayLabelOf = (v: any) => {
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
  if (diff === 0) return `Сегодня · ${base}`;
  if (diff === 1) return `Вчера · ${base}`;
  return base;
};
