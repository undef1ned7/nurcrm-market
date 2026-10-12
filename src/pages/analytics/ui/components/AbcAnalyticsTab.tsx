import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Doughnut } from "react-chartjs-2";
import { Info } from "lucide-react";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";
import "../analytics.charts";

type AbcClass = "A" | "B" | "C";
type AbcMetric = "revenue" | "qty" | "profit";

const CLASSES: AbcClass[] = ["A", "B", "C"];
const CLASS_COLORS: Record<AbcClass, string> = {
  A: "#10b981",
  B: "#f59e0b",
  C: "#9ca3af",
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type AbcRow = {
  key: string;
  name: string;
  revenue: number;
  qty: number;
  profit: number;
  share: number;
  cumShare: number;
  abcClass: AbcClass;
};

/**
 * Вкладка «ABC-анализ» (`tab=abc`, параметры `by`, `metric`).
 * Ответ: `{ by, metric, thresholds: {A, B}, totals: {revenue, qty, profit}, items[] }`,
 * `items[]` — `{ id, name, revenue, qty, profit, share, cum_share, class }`.
 *
 * Класс считаем на фронте по накопленной доле ДО позиции (классический
 * Парето): позиция, которая «перешагивает» 80%, — всё ещё A. Бэк сейчас
 * сравнивает долю ПОСЛЕ позиции, и при одном доминирующем товаре (96.8%)
 * весь ассортимент уходит в C. Доли тоже пересчитываем из сумм — `share`
 * с бэка округлён до 0.1 и у хвоста равен 0.
 */
export function AbcAnalyticsTab({ vm }: { vm: AnalyticsVm }) {
  const { t } = useTranslation();
  const {
    analyticsData,
    filters,
    updateFilter,
    isStartTariff,
    formatNumber,
    formatAnalyticsQty,
  } = vm;
  const data: any = analyticsData || {};
  const som = t("common.currencySom");

  const by = String(data.by || filters.abc_by || "product");
  const requestedMetric = String(data.metric || filters.abc_metric || "revenue");
  const metric: AbcMetric =
    requestedMetric === "qty" || requestedMetric === "profit"
      ? requestedMetric
      : "revenue";
  const thresholdA = num(data.thresholds?.A) || 80;
  const thresholdB = num(data.thresholds?.B) || 95;

  const rows = useMemo<AbcRow[]>(() => {
    const items: any[] = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.tables?.items)
        ? data.tables.items
        : [];
    const sorted = items
      .map((item, index) => ({
        key: `${item?.id ?? "none"}-${index}`,
        name: String(item?.name ?? "—"),
        revenue: num(item?.revenue),
        qty: num(item?.qty),
        profit: num(item?.profit),
      }))
      .sort((a, b) => b[metric] - a[metric]);
    // Отрицательные значения (убыточные позиции) в базу Парето не входят
    const total = sorted.reduce((s, r) => s + Math.max(r[metric], 0), 0);
    let running = 0;
    return sorted.map((r) => {
      const value = Math.max(r[metric], 0);
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
      return { ...r, share, cumShare, abcClass };
    });
  }, [data, metric, thresholdA, thresholdB]);

  const summary = useMemo(() => {
    const base = Object.fromEntries(
      CLASSES.map((c) => [c, { count: 0, value: 0, share: 0 }]),
    ) as Record<AbcClass, { count: number; value: number; share: number }>;
    rows.forEach((r) => {
      base[r.abcClass].count += 1;
      base[r.abcClass].value += r[metric];
      base[r.abcClass].share += r.share;
    });
    return base;
  }, [rows, metric]);

  const formatMetric = (m: AbcMetric, v: number) =>
    m === "qty" ? formatAnalyticsQty(v) : `${formatNumber(v)} ${som}`;
  const formatShare = (v: number) =>
    `${v.toLocaleString("ru-RU", {
      maximumFractionDigits: v > 0 && v < 0.1 ? 3 : 1,
    })}%`;

  const showProfit = !isStartTariff;
  const byOptions: Array<[string, string]> = [
    ["product", t("crm.analytics.abc.byProduct")],
    ["category", t("crm.analytics.abc.byCategory")],
    ["brand", t("crm.analytics.abc.byBrand")],
  ];
  const metricOptions: Array<[AbcMetric, string]> = [
    ["revenue", t("crm.analytics.abc.metricRevenue")],
    ["qty", t("crm.analytics.abc.metricQty")],
    // Прибыль скрываем на «Старт», как валовую прибыль/маржу в продажах
    ...(showProfit
      ? ([["profit", t("crm.analytics.abc.metricProfit")]] as Array<
          [AbcMetric, string]
        >)
      : []),
  ];
  const nameHeader =
    by === "category"
      ? t("crm.analytics.fields.category")
      : by === "brand"
        ? t("crm.analytics.fields.brand")
        : t("crm.analytics.fields.product");

  const renderSegmented = (
    label: string,
    options: Array<[string, string]>,
    value: string,
    filterKey: string,
  ) => (
    <div className="analytics-page__segmented" role="group" aria-label={label}>
      <span className="analytics-page__segmented-label">{label}</span>
      {options.map(([optionValue, text]) => (
        <button
          key={optionValue}
          type="button"
          className={`analytics-page__segmented-btn${
            value === optionValue ? " analytics-page__segmented-btn--active" : ""
          }`}
          aria-pressed={value === optionValue}
          onClick={() => updateFilter(filterKey, optionValue)}
        >
          {text}
        </button>
      ))}
    </div>
  );

  const badge = (c: AbcClass) => (
    <span
      className={`analytics-page__abc-badge analytics-page__abc-badge--${c.toLowerCase()}`}
    >
      {c}
    </span>
  );

  return (
    <div className="analytics-page__content">
      <div className="analytics-page__abc-controls">
        {renderSegmented(t("crm.analytics.abc.groupBy"), byOptions, by, "abc_by")}
        {renderSegmented(
          t("crm.analytics.abc.metric"),
          metricOptions,
          metric,
          "abc_metric",
        )}
      </div>

      <p className="analytics-page__tab-hint">
        <Info size={14} aria-hidden />
        {t("crm.analytics.abc.hint", { a: thresholdA, b: thresholdB })}
      </p>

      <div className="analytics-page__kpis">
        {CLASSES.map((c) => (
          <div key={c} className="analytics-page__kpi-card">
            <div className="analytics-page__kpi-header">
              <span className="analytics-page__kpi-title">
                {t(`crm.analytics.abc.class${c}`)}
              </span>
              {badge(c)}
            </div>
            <div className="analytics-page__kpi-value">
              {formatNumber(summary[c].count)}
              <span className="analytics-page__kpi-currency">
                {t("crm.analytics.abc.positions")}
              </span>
            </div>
            <div className="analytics-page__kpi-subtitle">
              {t("crm.analytics.abc.shareOfMetric", {
                share: formatShare(summary[c].share),
              })}
              {" · "}
              {formatMetric(metric, summary[c].value)}
            </div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="analytics-page__chart-card">
          <h3 className="analytics-page__chart-title">
            {t("crm.analytics.abc.distribution")}
          </h3>
          <div className="analytics-page__chart-canvas">
            <Doughnut
              data={{
                labels: CLASSES.map((c) => t(`crm.analytics.abc.class${c}`)),
                datasets: [
                  {
                    data: CLASSES.map((c) => Number(summary[c].share.toFixed(2))),
                    backgroundColor: CLASSES.map((c) => CLASS_COLORS[c]),
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: "bottom" },
                  tooltip: {
                    callbacks: {
                      label: (ctx: any) => `${ctx.label}: ${ctx.parsed}%`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      <div className="analytics-page__table-card">
        <h3 className="analytics-page__table-title">
          {t("crm.analytics.abc.title")}
        </h3>
        <div className="analytics-page__table-scroll">
          <table className="analytics-page__table">
            <thead>
              <tr>
                <th>{t("crm.analytics.fields.class")}</th>
                <th>{nameHeader}</th>
                <th>{t("crm.analytics.fields.revenue")}</th>
                <th>{t("crm.analytics.fields.qty")}</th>
                {showProfit && <th>{t("crm.analytics.fields.profit")}</th>}
                <th>{t("crm.analytics.fields.share")}</th>
                <th>{t("crm.analytics.fields.cum_share")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.key}>
                    <td>{badge(r.abcClass)}</td>
                    <td>{r.name}</td>
                    <td>{formatMetric("revenue", r.revenue)}</td>
                    <td>{formatAnalyticsQty(r.qty)}</td>
                    {showProfit && <td>{formatMetric("profit", r.profit)}</td>}
                    <td>{formatShare(r.share)}</td>
                    <td>{formatShare(r.cumShare)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={showProfit ? 7 : 6}
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
    </div>
  );
}
