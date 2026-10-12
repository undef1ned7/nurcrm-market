import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@shared/api";
import { fetchMarketAnalytics } from "@entities/analytics";
import { fetchCatalogVersion, fetchLowStockProducts, type CatalogProduct } from "@entities/product";
import {
  comparablePreviousPeriod,
  formatPeriodForApi,
  resolvePeriod,
  startOfDay,
  type DateRange,
  type PeriodPreset,
} from "@shared/lib/period";
import {
  LOW_STOCK_THRESHOLD,
  RECENT_LIMIT,
  parseRecentSales,
  parseSummarySales,
  pickLowStock,
  type RecentSale,
  type SummarySales,
} from "./summaryData";

/** Сводка обновляется сама каждые 20 секунд. */
export const SUMMARY_REFRESH_MS = 20_000;
/** «Заканчивается на складе» обновляется каждые 2 минуты. */
export const CATALOG_REFRESH_MS = 120_000;

export type SummaryErrorKind = "network" | "subscription" | "forbidden" | "other";

const NETWORK_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT", "ECONNRESET"]);

export const classifyError = (err: any): SummaryErrorKind => {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail ?? "");
  if (status === 402 || /подписк|subscription/i.test(detail)) return "subscription";
  if (status === 403) return "forbidden";
  if (status) return "other";
  // «Нет связи» — только для настоящих сетевых ошибок, а не для сбоя в коде
  if (err?.isAxiosError || err?.request || NETWORK_CODES.has(err?.code)) return "network";
  return "other";
};

const isCanceled = (err: any, signal: AbortSignal) =>
  signal.aborted || err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

export function useMarketSummary(
  preset: PeriodPreset,
  custom: Partial<DateRange> | null,
  { canViewAnalytics = true }: { canViewAnalytics?: boolean } = {},
) {
  const period = useMemo(() => resolvePeriod(preset, custom), [preset, custom]);

  const [current, setCurrent] = useState<SummarySales | null>(null);
  const [previous, setPrevious] = useState<SummarySales | null>(null);
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [recentError, setRecentError] = useState<SummaryErrorKind | null>(null);
  const [lowStock, setLowStock] = useState<CatalogProduct[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<SummaryErrorKind | null>(null);

  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // Свежие значения для таймера, не пересоздающего интервал
  const argsRef = useRef({ preset, period, canViewAnalytics });
  argsRef.current = { preset, period, canViewAnalytics };

  const query = (range: DateRange, signal: AbortSignal) =>
    fetchMarketAnalytics(
      {
        tab: "sales",
        period_start: formatPeriodForApi(range.from),
        period_end: formatPeriodForApi(range.to),
      },
      signal,
    );

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { preset: pr, period: p, canViewAnalytics: canAnalytics } = argsRef.current;
    // Прошлый период — «на это же время» (считается заново при каждом обновлении)
    const pp = comparablePreviousPeriod(pr, p, new Date());
    try {
      // Запросы независимы: отказ списка продаж больше не прячет выручку, и наоборот.
      const [cur, prev, sales] = await Promise.allSettled([
        canAnalytics ? query(p, controller.signal) : Promise.resolve(null),
        canAnalytics ? query(pp, controller.signal) : Promise.resolve(null),
        api.get("/main/pos/sales/", {
          // Берём с запасом: открытые корзины («Новый») отфильтровываются
          params: { page_size: RECENT_LIMIT * 3, ordering: "-created_at" },
          signal: controller.signal,
        }),
      ]);
      if (controller.signal.aborted) return;

      if (canAnalytics) {
        if (cur.status === "fulfilled") {
          try {
            setCurrent(parseSummarySales(cur.value));
            setErrorKind(null);
            setUpdatedAt(new Date());
          } catch (err) {
            console.error("Summary: parse failed", err);
            setErrorKind("other");
          }
        } else if (!isCanceled(cur.reason, controller.signal)) {
          // Старые цифры остаются на экране, пока связь не вернётся
          setErrorKind(classifyError(cur.reason));
        }
        // Нет прошлого периода — просто без сравнения
        if (prev.status === "fulfilled") {
          try {
            setPrevious(parseSummarySales(prev.value));
          } catch {
            setPrevious(null);
          }
        }
      }

      if (sales.status === "fulfilled") {
        setRecent(parseRecentSales(sales.value.data));
        setRecentError(null);
        if (!canAnalytics) setUpdatedAt(new Date());
      } else if (!isCanceled(sales.reason, controller.signal)) {
        setRecentError(classifyError(sales.reason));
      }
    } finally {
      if (abortRef.current === controller) inFlight.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Смена периода — сразу перезапрос, прошлый запрос отменяем
  useEffect(() => {
    setLoading(true);
    // Цифры прошлого периода не показываем под новым, даже если новый не загрузится
    setCurrent(null);
    setPrevious(null);
    inFlight.current = false;
    abortRef.current?.abort();
    void refresh();
    return () => abortRef.current?.abort();
  }, [period, canViewAnalytics, refresh]);

  // Автообновление каждые 20 секунд — только если период включает сегодня
  // (прошлые дни уже не меняются) и вкладка на экране.
  const isLive = period.to.getTime() >= startOfDay(new Date()).getTime();
  useEffect(() => {
    if (!isLive) return undefined;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, SUMMARY_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh, isLive]);

  // «Заканчивается на складе»: одна загрузка за раз, повторные нажатия не плодят новые.
  // Автообновление сначала спрашивает версию каталога (~30 мс): не изменилась — список
  // не перекачиваем. Кнопка «Обновить» грузит всегда.
  const catalogAbort = useRef<AbortController | null>(null);
  const catalogVersionRef = useRef<string | null>(null);
  const loadCatalog = useCallback(async (force = true) => {
    if (catalogAbort.current) return;
    const controller = new AbortController();
    catalogAbort.current = controller;
    try {
      // Версию берём до списка: изменение посреди загрузки увидит следующая проверка
      const version = await fetchCatalogVersion(controller.signal);
      if (!force && version !== null && version === catalogVersionRef.current) return;
      const items = await fetchLowStockProducts(LOW_STOCK_THRESHOLD, controller.signal);
      if (!controller.signal.aborted) {
        setLowStock(pickLowStock(items));
        catalogVersionRef.current = version;
      }
    } catch {
      /* остаётся прошлый список */
    } finally {
      if (catalogAbort.current === controller) catalogAbort.current = null;
    }
  }, []);
  useEffect(() => {
    void loadCatalog();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCatalog(false);
    }, CATALOG_REFRESH_MS);
    return () => {
      window.clearInterval(id);
      catalogAbort.current?.abort();
      catalogAbort.current = null;
    };
  }, [loadCatalog]);

  const refreshNow = useCallback(() => {
    void refresh();
    void loadCatalog();
  }, [refresh, loadCatalog]);

  return {
    period,
    current,
    previous,
    recent,
    recentError,
    lowStock,
    updatedAt,
    loading,
    errorKind,
    refreshNow,
  };
}
