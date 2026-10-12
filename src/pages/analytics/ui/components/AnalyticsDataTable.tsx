import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

export type DataTableColumn = {
  key: string;
  label: string;
  /** Числовая колонка: выравнивание вправо и числовая сортировка */
  numeric?: boolean;
  render?: (row: any) => ReactNode;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

const PAGE_SIZE = 20;

const toNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
};

/**
 * Таблица аналитики с поиском, сортировкой по клику на заголовок
 * и подгрузкой «Показать ещё» (без серверной пагинации — данные уже на клиенте).
 */
export function AnalyticsDataTable({
  rows,
  columns,
  searchKeys = ["name", "code"],
  initialSort = null,
  rowKey = (row, index) => String(row?.product_id ?? row?.id ?? index),
}: {
  rows: any[];
  columns: DataTableColumn[];
  searchKeys?: string[];
  initialSort?: SortState;
  rowKey?: (row: any, index: number) => string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(initialSort);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Новый набор данных / поиск — снова с первой «страницы»
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [rows, query]);

  const prepared = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) =>
          searchKeys.some((k) =>
            String(row?.[k] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : rows;
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (col?.numeric) {
        return (toNumber(a?.[sort.key]) - toNumber(b?.[sort.key])) * sign;
      }
      return (
        String(a?.[sort.key] ?? "").localeCompare(
          String(b?.[sort.key] ?? ""),
          "ru",
        ) * sign
      );
    });
  }, [rows, query, sort, columns, searchKeys]);

  const toggleSort = (col: DataTableColumn) => {
    setSort((prev) => {
      if (!prev || prev.key !== col.key) {
        // Числа обычно интересны «от большего», текст — по алфавиту
        return { key: col.key, dir: col.numeric ? "desc" : "asc" };
      }
      if ((prev.dir === "desc") === Boolean(col.numeric)) {
        return { key: col.key, dir: prev.dir === "desc" ? "asc" : "desc" };
      }
      return null;
    });
  };

  const shown = prepared.slice(0, visible);

  return (
    <div className="analytics-data-table">
      <div className="analytics-data-table__toolbar">
        <label className="analytics-data-table__search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("crm.analytics.table.searchPlaceholder")}
            aria-label={t("crm.analytics.table.searchPlaceholder")}
          />
        </label>
        <span className="analytics-data-table__count">
          {t("crm.analytics.table.shownOf", {
            shown: shown.length,
            total: prepared.length,
          })}
        </span>
      </div>

      <div className="analytics-page__table-scroll">
        <table className="analytics-page__table analytics-data-table__table">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const Icon = !active
                  ? ArrowUpDown
                  : sort?.dir === "asc"
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={col.key}
                    className={col.numeric ? "analytics-data-table__num" : undefined}
                    aria-sort={
                      active
                        ? sort?.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className={`analytics-data-table__sort${
                        active ? " analytics-data-table__sort--active" : ""
                      }`}
                      onClick={() => toggleSort(col)}
                    >
                      {col.label}
                      <Icon size={12} aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length > 0 ? (
              shown.map((row, index) => (
                <tr key={rowKey(row, index)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.numeric ? "analytics-data-table__num" : undefined}
                    >
                      {col.render ? col.render(row) : (row?.[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="analytics-data-table__empty"
                >
                  {query.trim()
                    ? t("crm.analytics.table.nothingFound")
                    : t("crm.analytics.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {prepared.length > visible && (
        <button
          type="button"
          className="nur-btn nur-btn--secondary analytics-data-table__more"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          {t("crm.analytics.table.showMore", {
            count: Math.min(PAGE_SIZE, prepared.length - visible),
          })}
        </button>
      )}
    </div>
  );
}
