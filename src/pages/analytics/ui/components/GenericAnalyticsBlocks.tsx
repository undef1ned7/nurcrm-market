import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { formatAnalyticsQty, formatNumber } from "../hooks/analytics/formatters";

/**
 * Универсальный рендер `cards` / `tables` ответа аналитики для вкладок,
 * чья точная схема не зафиксирована в контракте (procurement, abc).
 * Подписи — `crm.analytics.fields.<key>`, иначе ключ «очеловечивается».
 */

const MONEY_RE =
  /(revenue|sum|total|amount|value|cost|cogs|profit|price|income|expense|salary|bonus)/;
// Порядок важен: total_qty_sold_period — количество, а stock_at_purchase_prices —
// деньги, current_stock — снова количество.
const QTY_RE = /(qty|quantity|units)/;
const STOCK_RE = /stock/;
const PERCENT_RE = /(percent|share|margin)/;
const HIDDEN_RE = /(^id$|_id$|^uuid$)/;
// Идентификаторы-строки: "0022" нельзя форматировать как число (потеряются нули)
const TEXT_RE = /(^code$|_code$|barcode|phone|sku|article|plu)/;

const humanize = (key: string) => {
  const text = key.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const isNumericLike = (v: unknown) =>
  (typeof v === "number" && Number.isFinite(v)) ||
  (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));

export function useFieldLabel() {
  const { t } = useTranslation();
  return (key: string) =>
    t(`crm.analytics.fields.${key}`, { defaultValue: humanize(key) });
}

export function useFormatField() {
  const { t } = useTranslation();
  const som = t("common.currencySom");
  return (key: string, value: unknown): string => {
    if (value == null || value === "") return "—";
    if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
    if (Array.isArray(value)) return String(value.length);
    if (typeof value === "object") {
      const v = value as any;
      return String(v.name ?? v.title ?? v.label ?? "—");
    }
    const k = key.toLowerCase();
    if (!isNumericLike(value) || TEXT_RE.test(k)) return String(value);
    if (PERCENT_RE.test(k)) {
      return `${Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
    }
    if (QTY_RE.test(k)) return formatAnalyticsQty(value);
    if (MONEY_RE.test(k)) return `${formatNumber(value)} ${som}`;
    if (STOCK_RE.test(k)) return formatAnalyticsQty(value);
    return formatAnalyticsQty(value);
  };
}

export function GenericKpis({ cards }: { cards: Record<string, unknown> }) {
  const label = useFieldLabel();
  const format = useFormatField();
  const entries = Object.entries(cards || {}).filter(
    ([key, v]) =>
      !HIDDEN_RE.test(key) &&
      (isNumericLike(v) || typeof v === "string" || typeof v === "boolean"),
  );
  if (entries.length === 0) return null;
  return (
    <div className="analytics-page__kpis">
      {entries.map(([key, value]) => (
        <div key={key} className="analytics-page__kpi-card">
          <div className="analytics-page__kpi-header">
            <span className="analytics-page__kpi-title">{label(key)}</span>
            <BarChart3 size={24} style={{ color: "#f7d617" }} />
          </div>
          <div className="analytics-page__kpi-value">{format(key, value)}</div>
        </div>
      ))}
    </div>
  );
}

export const tableColumns = (rows: any[]): string[] => {
  const keys: string[] = [];
  rows.slice(0, 20).forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((k) => {
      if (!HIDDEN_RE.test(k) && !keys.includes(k)) keys.push(k);
    });
  });
  return keys;
};

export function GenericTable({
  title,
  rows,
  columns,
  renderCell,
}: {
  title: string;
  rows: any[];
  columns?: string[];
  renderCell?: (key: string, row: any) => React.ReactNode | undefined;
}) {
  const { t } = useTranslation();
  const label = useFieldLabel();
  const format = useFormatField();
  const cols = columns ?? tableColumns(rows);
  return (
    <div className="analytics-page__table-card">
      <h3 className="analytics-page__table-title">{title}</h3>
      <div className="analytics-page__table-scroll">
        <table className="analytics-page__table">
          <thead>
            <tr>
              {cols.map((key) => (
                <th key={key}>{label(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={String(row?.id ?? row?.product_id ?? index)}>
                  {cols.map((key) => (
                    <td key={key}>
                      {renderCell?.(key, row) ?? format(key, row?.[key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={Math.max(cols.length, 1)}
                  style={{ textAlign: "center", color: "#6b7280" }}
                >
                  {t("crm.analytics.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Все массивы-объектов из `tables` (и `rows` верхнего уровня). */
export const collectTables = (data: any): Array<[string, any[]]> => {
  const out: Array<[string, any[]]> = [];
  const tables = data?.tables;
  if (tables && typeof tables === "object") {
    Object.entries(tables).forEach(([key, value]) => {
      if (Array.isArray(value)) out.push([key, value]);
    });
  }
  if (Array.isArray(data?.rows) && !out.some(([k]) => k === "rows")) {
    out.push(["rows", data.rows]);
  }
  return out;
};
