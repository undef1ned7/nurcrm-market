import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Reports.module.scss";
import { FaChartLine, FaPrint, FaFilter, FaSync } from "react-icons/fa";
import api from "@shared/api";
import {
  fetchCashboxReportsAnalytics,
  shouldWarnReportTruncated,
} from "@entities/cash/lib/cashboxReportsApi";
import type { CashboxReportAnalyticsGroup } from "@entities/cash/lib/cashboxReports.types";
import { toReportNumber } from "@entities/cash/lib/cashboxReports.normalize";

const listFrom = (res: any) => res?.data?.results || res?.data || [];
const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Number(n) || 0);
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0)) + " сом";

const curYear = new Date().getFullYear();

const computePeriodBounds = (
  period: string,
  dateFrom: string,
  dateTo: string,
) => {
  if (dateFrom || dateTo) {
    return { dateFrom, dateTo };
  }

  const today = new Date();
  const end = today.toISOString().slice(0, 10);

  if (period === "6m") {
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 5, 1);
    return { dateFrom: startDate.toISOString().slice(0, 10), dateTo: end };
  }

  if (period === "12m") {
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 11, 1);
    return { dateFrom: startDate.toISOString().slice(0, 10), dateTo: end };
  }

  return {
    dateFrom: `${curYear}-01-01`,
    dateTo: end,
  };
};

export default function Reports() {
  const [period, setPeriod] = useState("ytd");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [boxes, setBoxes] = useState<any[]>([]);
  const [boxId, setBoxId] = useState("ALL");

  const [queryMonth, setQueryMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [groups, setGroups] = useState<CashboxReportAnalyticsGroup[]>([]);

  const fetchBoxes = async () => {
    try {
      const r = await api
        .get("/construction/cashboxes/")
        .catch(() => ({ data: [] }));
      setBoxes(listFrom(r) || []);
    } catch {
      setBoxes([]);
    }
  };

  const bounds = useMemo(
    () => computePeriodBounds(period, dateFrom, dateTo),
    [period, dateFrom, dateTo],
  );

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const analytics = await fetchCashboxReportsAnalytics({
        cashboxId: boxId,
        dateFrom: bounds.dateFrom || undefined,
        dateTo: bounds.dateTo || undefined,
        groupBy: "month",
        status: "approved",
      });

      if (shouldWarnReportTruncated(analytics)) {
        console.warn(
          "Cashbox analytics loaded with truncation (fallback mode or backend limit).",
        );
      }

      setGroups(analytics.groups);
    } catch (error: any) {
      console.error("Ошибка загрузки отчёта кассы:", error);
      setGroups([]);
      setLoadError("Не удалось загрузить отчёт. Попробуйте обновить страницу.");
    } finally {
      setLoading(false);
    }
  }, [boxId, bounds.dateFrom, bounds.dateTo]);

  useEffect(() => {
    void fetchBoxes();
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const data = useMemo(() => {
    if (dateFrom || dateTo) return groups;
    if (period === "6m") return groups.slice(-6);
    if (period === "12m") return groups.slice(-12);
    if (period === "ytd") {
      return groups.filter((row) => Number(row.ym.slice(0, 4)) === curYear);
    }
    return groups;
  }, [groups, period, dateFrom, dateTo]);

  const visibleSummary = useMemo(() => {
    const income = data.reduce((sum, row) => sum + toReportNumber(row.income), 0);
    const expense = data.reduce((sum, row) => sum + toReportNumber(row.expense), 0);
    const net = income - expense;
    const ops = data.reduce((sum, row) => sum + row.ops, 0);
    return { income, expense, net, ops };
  }, [data]);

  const seriesIncome = useMemo(
    () => data.map((row) => ({ label: row.label, value: row.income })),
    [data],
  );
  const seriesExpense = useMemo(
    () => data.map((row) => ({ label: row.label, value: row.expense })),
    [data],
  );
  const maxY = useMemo(
    () =>
      Math.max(
        1,
        ...seriesIncome.map((row) => row.value),
        ...seriesExpense.map((row) => row.value),
      ),
    [seriesIncome, seriesExpense],
  );

  const makePolyline = useCallback(
    (series: Array<{ label: string; value: number }>) => {
      const W = 640;
      const H = 220;
      const P = 24;
      const innerW = W - P * 2;
      const innerH = H - P * 2;
      const points = series.map((row, index) => {
        const x =
          P + innerW * (series.length === 1 ? 0 : index / (series.length - 1));
        const y = P + (innerH - (row.value / maxY) * innerH);
        return `${x},${y}`;
      });
      return { points: points.join(" ") };
    },
    [maxY],
  );

  const polyIncome = useMemo(
    () => makePolyline(seriesIncome),
    [seriesIncome, makePolyline],
  );
  const polyExpense = useMemo(
    () => makePolyline(seriesExpense),
    [seriesExpense, makePolyline],
  );

  const tableData = useMemo(() => {
    const q = (queryMonth || "").trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => row.label.toLowerCase().includes(q));
  }, [data, queryMonth]);

  return (
    <section className={styles.reports}>
      <div className={styles.reports__header}>
        <div>
          <h2 className={styles.reports__title}>
            <FaChartLine /> Отчёты и аналитика (касса)
          </h2>
        </div>

        <div className={styles.reports__actions}>
          <select
            className={styles.reports__select}
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            title="Касса"
          >
            <option value="ALL">Все кассы</option>
            {boxes.map((box) => (
              <option key={box.id || box.uuid} value={box.id || box.uuid}>
                {box.department_name || box.name || "Касса"}
              </option>
            ))}
          </select>

          <button
            className={`${styles.reports__btn} ${styles["reports__btn--secondary"]}`}
            onClick={() => window.print()}
          >
            <FaPrint /> Печать
          </button>
          <button
            className={`${styles.reports__btn} ${styles["reports__btn--secondary"]}`}
            onClick={() => void loadAnalytics()}
            disabled={loading}
            title="Обновить данные"
          >
            <FaSync /> Обновить
          </button>
        </div>
      </div>

      <div className={styles.reports__controls}>
        <div className={styles.reports__filter}>
          <FaFilter className={styles.reports__filterIcon} />
          <select
            className={styles.reports__select}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={!!(dateFrom || dateTo)}
            title={
              dateFrom || dateTo
                ? "Период отключён: используется диапазон дат"
                : "Период"
            }
          >
            <option value="6m">Последние 6 мес</option>
            <option value="ytd">С начала года</option>
            <option value="12m">12 месяцев</option>
          </select>
        </div>

        <input
          type="date"
          className={styles.reports__select}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Дата от"
        />
        <input
          type="date"
          className={styles.reports__select}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Дата до"
        />

        <div className={styles.reports__series}>
          <label className={styles.reports__check}>
            <input type="checkbox" checked readOnly />
            <span
              className={`${styles.reports__dot} ${styles["reports__dot--income"]}`}
            ></span>
            Приход
          </label>
          <label className={styles.reports__check}>
            <input type="checkbox" checked readOnly />
            <span
              className={`${styles.reports__dot} ${styles["reports__dot--expense"]}`}
            ></span>
            Расход
          </label>

          <input
            className={styles.reports__select}
            placeholder="Фильтр месяца (напр. Июл)"
            value={queryMonth}
            onChange={(e) => setQueryMonth(e.target.value)}
            style={{ minWidth: 160 }}
            title="Поиск по названию месяца"
          />
        </div>
      </div>

      <div className={styles.reports__kpis}>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Приход</div>
          <div className={styles.reports__kpiValue}>
            {fmtMoney(visibleSummary.income)}
          </div>
        </div>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Расход</div>
          <div className={styles.reports__kpiValue}>
            {fmtMoney(visibleSummary.expense)}
          </div>
        </div>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Итог</div>
          <div className={styles.reports__kpiValue}>
            {fmtMoney(visibleSummary.net)}
          </div>
        </div>
      </div>

      <div className={styles.reports__chartCard}>
        <div className={styles.reports__chartHead}>
          Динамика: приход vs расход
        </div>
        <div className={styles.reports__chart}>
          <div
            className={styles.reports__chartLabels}
            style={{ ["--cols" as string]: data.length || 1 }}
          >
            {data.map((row) => (
              <span key={row.ym} className={styles.reports__chartLabel}>
                {row.label}
              </span>
            ))}
          </div>

          <svg
            className={styles.reports__svg}
            viewBox="0 0 640 220"
            preserveAspectRatio="none"
            aria-hidden
          >
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <line
                key={g}
                x1="24"
                x2="616"
                y1={24 + (220 - 48) * g}
                y2={24 + (220 - 48) * g}
                className={styles.reports__grid}
              />
            ))}

            <polyline
              className={`${styles.reports__poly} ${styles["reports__poly--income"]}`}
              points={polyIncome.points}
            />
            {polyIncome.points
              .split(" ")
              .filter(Boolean)
              .map((pt, index) => {
                const [cx, cy] = pt.split(",");
                return (
                  <circle
                    key={`inc-${index}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    className={`${styles.reports__dotPoint} ${styles["reports__dotPoint--income"]}`}
                  />
                );
              })}

            <polyline
              className={`${styles.reports__poly} ${styles["reports__poly--expense"]}`}
              points={polyExpense.points}
            />
            {polyExpense.points
              .split(" ")
              .filter(Boolean)
              .map((pt, index) => {
                const [cx, cy] = pt.split(",");
                return (
                  <circle
                    key={`exp-${index}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    className={`${styles.reports__dotPoint} ${styles["reports__dotPoint--expense"]}`}
                  />
                );
              })}
          </svg>
        </div>

        <div className={styles.reports__legend}>
          <span>
            <i
              className={`${styles.reports__legendDot} ${styles["reports__legendDot--income"]}`}
            />
            Приход
          </span>
          <span>
            <i
              className={`${styles.reports__legendDot} ${styles["reports__legendDot--expense"]}`}
            />
            Расход
          </span>
        </div>
      </div>

      <div className={styles.reports__tableWrap}>
        <table className={styles.reports__table}>
          <thead>
            <tr>
              <th>Месяц</th>
              <th>Приход</th>
              <th>Расход</th>
              <th>Итог</th>
              <th>Операций</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.ym}>
                <td>{row.label}</td>
                <td>{fmtMoney(row.income)}</td>
                <td>{fmtMoney(row.expense)}</td>
                <td>{fmtMoney(row.net)}</td>
                <td>{fmt(row.ops)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Итого</td>
              <td>{fmtMoney(visibleSummary.income)}</td>
              <td>{fmtMoney(visibleSummary.expense)}</td>
              <td>{fmtMoney(visibleSummary.net)}</td>
              <td>{fmt(tableData.reduce((sum, row) => sum + row.ops, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {loading && (
        <div className={styles.reports__alert}>Загрузка данных кассы…</div>
      )}
      {loadError && !loading && (
        <div className={styles.reports__alert}>{loadError}</div>
      )}
      {!loading && !loadError && !data.length && (
        <div className={styles.reports__alert}>
          Нет данных кассы для выбранного периода.
        </div>
      )}
    </section>
  );
}
