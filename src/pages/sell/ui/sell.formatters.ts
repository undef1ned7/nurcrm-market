import i18n from "i18next";
import { paymentMethodTranslate } from "./sell.constants";

// Форматтеры создаются один раз: toLocaleString/toLocaleDateString с опциями
// строят новый Intl-объект на каждый вызов, а в истории их 3 на строку —
// при 5000 строк рендер и каждый клик занимали десятки секунд.
const moneyFormat = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabelFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatMoney = (v: any) => {
  const s = String(v ?? "")
    .trim()
    .replace(/,/g, ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return String(v ?? "-");
  return moneyFormat.format(n);
};

export const formatDateTime = (dateString: any) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  // new Date("garbage") не бросает исключение, а даёт Invalid Date
  if (Number.isNaN(d.getTime())) return "-";
  return dateTimeFormat.format(d);
};

/** Day key (YYYY-MM-DD) for grouping history rows by date. */
export const dayKeyOf = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Human-readable day label for separators (Today/Yesterday · date). */
export const dayLabelOf = (v: any) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "").slice(0, 10);
  const base = dayLabelFormat.format(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - dd.getTime()) / 86400000);
  if (diff === 0) return `Сегодня · ${base}`;
  if (diff === 1) return `Вчера · ${base}`;
  return base;
};

export const getItemsCount = (sale: any) => {
  const v =
    sale?.items_count ??
    sale?.products_count ??
    (Array.isArray(sale?.items) ? sale.items.length : null) ??
    (Array.isArray(sale?.products) ? sale.products.length : null);
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const getStatusVariant = (status: any) => {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "canceled" || s === "cancelled") return "canceled";
  if (s === "partially_returned") return "canceled";
  if (s === "debt") return "debt";
  return "new";
};

export const translatePaymentMethod = (method: any) => {
  if (!method) return "-";
  const lowerMethod = String(method).toLowerCase();
  const key = `crm.sell.paymentMethod.${lowerMethod}`;
  const translated = i18n.t(key);
  if (translated !== key) return translated;
  return paymentMethodTranslate[lowerMethod] || method;
};
