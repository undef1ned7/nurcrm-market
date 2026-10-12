import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";
import {
  GenericKpis,
  collectTables,
  tableColumns,
  useFieldLabel,
  useFormatField,
} from "./GenericAnalyticsBlocks";
import { AnalyticsDataTable, type DataTableColumn } from "./AnalyticsDataTable";

/** Колонки известных таблиц; незнакомые — по ключам строк. */
const KNOWN_TABLES: Record<
  string,
  { columns: string[]; numeric: string[]; sortBy: string }
> = {
  sold_vs_transfers: {
    columns: [
      "code",
      "name",
      "qty_sold",
      "revenue",
      "qty_transferred_to_agents",
      "current_stock",
      "stock_at_purchase_prices",
    ],
    numeric: [
      "qty_sold",
      "revenue",
      "qty_transferred_to_agents",
      "current_stock",
      "stock_at_purchase_prices",
    ],
    sortBy: "qty_sold",
  },
  top_by_sales: {
    columns: ["code", "name", "qty_sold", "revenue"],
    numeric: ["qty_sold", "revenue"],
    sortBy: "qty_sold",
  },
  top_by_transfers_to_agents: {
    columns: [
      "code",
      "name",
      "qty_transferred_to_agents",
      "qty_sold",
      "current_stock",
    ],
    numeric: ["qty_transferred_to_agents", "qty_sold", "current_stock"],
    sortBy: "qty_transferred_to_agents",
  },
};
const TABLE_ORDER = [
  "sold_vs_transfers",
  "top_by_sales",
  "top_by_transfers_to_agents",
];
const NUMERIC_RE =
  /(qty|quantity|revenue|stock|price|sum|total|amount|value|count|share|percent)/;

/**
 * Вкладка «Снабжение» (`tab=procurement`): продажи vs отгрузки торговым агентам.
 * Ответ: `meta.purchase_note`, `cards` (catalog_products_count,
 * products_with_sales_or_transfers, total_qty_sold_period,
 * total_qty_transferred_to_agents_period), `tables` (top_by_sales,
 * top_by_transfers_to_agents, sold_vs_transfers).
 * Таблицы — переключателем (одна на экране). Пустые остаются в переключателе
 * со счётчиком 0 (напр. top_by_transfers_to_agents, пока отгрузок агентам нет),
 * по умолчанию открывается первая непустая.
 */
export function ProcurementAnalyticsTab({ vm }: { vm: AnalyticsVm }) {
  const { t } = useTranslation();
  const label = useFieldLabel();
  const format = useFormatField();
  const data: any = vm.analyticsData || {};

  const tables = useMemo(() => {
    const rank = (key: string) => {
      const i = TABLE_ORDER.indexOf(key);
      return i === -1 ? TABLE_ORDER.length : i;
    };
    return collectTables(data).sort(([a], [b]) => rank(a) - rank(b));
  }, [data]);

  const [activeKey, setActiveKey] = useState("");
  useEffect(() => {
    if (!tables.some(([key]) => key === activeKey)) {
      const firstFilled = tables.find(([, rows]) => rows.length > 0);
      setActiveKey((firstFilled ?? tables[0])?.[0] ?? "");
    }
  }, [tables, activeKey]);

  const active = tables.find(([key]) => key === activeKey) ?? tables[0];
  const activeRows = active?.[1] ?? [];
  const known = active ? KNOWN_TABLES[active[0]] : undefined;

  const columns: DataTableColumn[] = (() => {
    if (!active) return [];
    // Для известных таблиц — наш порядок колонок, плюс любые новые поля
    // с бэка в конце (схема top_by_transfers_to_agents ещё не подтверждена)
    const rowKeys = tableColumns(activeRows);
    const keys = known
      ? activeRows.length === 0
        ? known.columns
        : [
            ...known.columns.filter((k) => rowKeys.includes(k)),
            ...rowKeys.filter((k) => !known.columns.includes(k)),
          ]
      : rowKeys;
    return keys.map((key) => ({
      key,
      label: label(key),
      numeric: known ? known.numeric.includes(key) : NUMERIC_RE.test(key),
      render: (row: any) => {
        const text = format(key, row?.[key]);
        // Нулевой остаток при продажах — сигнал к дозакупке
        if (key === "current_stock" && Number(row?.[key]) <= 0) {
          return <span className="analytics-data-table__zero">{text}</span>;
        }
        if (key === "name") {
          return <span className="analytics-data-table__name">{text}</span>;
        }
        return text;
      },
    }));
  })();

  return (
    <div className="analytics-page__content">
      {/* meta.purchase_note с бэка — техническая заметка (эндпоинты, модели),
          пользователю показываем свою короткую формулировку того же смысла */}
      <p className="analytics-page__tab-hint">
        <Info size={14} aria-hidden />
        {t("crm.analytics.procurement.hint")}
      </p>
      <GenericKpis cards={data.cards || {}} />

      <div className="analytics-page__table-card">
        {tables.length > 1 ? (
          <div
            className="analytics-page__segmented analytics-data-table__switch"
            role="tablist"
            aria-label={t("crm.analytics.tabs.procurement")}
          >
            {tables.map(([key, rows]) => {
              const selected = key === active?.[0];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`analytics-page__segmented-btn${
                    selected ? " analytics-page__segmented-btn--active" : ""
                  }`}
                  onClick={() => setActiveKey(key)}
                >
                  {label(key)}
                  <span className="analytics-data-table__switch-count">
                    {rows.length}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          active && (
            <h3 className="analytics-page__table-title">{label(active[0])}</h3>
          )
        )}

        {active && activeRows.length === 0 ? (
          <p className="analytics-data-table__empty">
            {t(`crm.analytics.procurement.empty.${active[0]}`, {
              defaultValue: t("crm.analytics.noData"),
            })}
          </p>
        ) : active ? (
          <AnalyticsDataTable
            key={active[0]}
            rows={activeRows}
            columns={columns}
            initialSort={known ? { key: known.sortBy, dir: "desc" } : null}
          />
        ) : (
          <p className="analytics-data-table__empty">
            {t("crm.analytics.noData")}
          </p>
        )}
      </div>
    </div>
  );
}
