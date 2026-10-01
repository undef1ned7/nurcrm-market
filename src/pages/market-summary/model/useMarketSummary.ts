import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@shared/api";
import { fetchMarketAnalytics } from "@entities/analytics";
import { fetchCatalogSnapshot, type CatalogProduct } from "@entities/product";
import {
  formatPeriodForApi,
  previousPeriod,
  resolvePeriod,
  type DateRange,
  type PeriodPreset,
} from "@shared/lib/period";
import {
  parseRecentSales,
  parseSummarySales,
  pickLowStock,
  type RecentSale,
  type SummarySales,
} from "./summaryData";

/** Сводка обновляется сама каждые 20 секунд. */
export const SUMMARY_REFRESH_MS = 20_000;
/** Каталог для «Заканчивается на складе» обновляется каждые 2 минуты. */
export const CATALOG_REFRESH_MS = 120_000;

export type SummaryErrorKind = "network" | "subscription" | "forbidden" | "other";

const classifyError = (err: any): SummaryErrorKind => {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail ?? "");
  if (status === 402 || /подписк|subscription/i.test(detail)) return "subscription";
  if (status === 403) return "forbidden";
  if (!err?.response) return "network";
  return "other";
};

export function useMarketSummary(preset: PeriodPreset, custom: Partial<DateRange> | null) {
  const period = useMemo(() => resolvePeriod(preset, custom), [preset, custom]);
  const prevPeriod = useMemo(() => previousPeriod(preset, period), [preset, period]);

  const [current, setCurrent] = useState<SummarySales | null>(null);
  const [previous, setPrevious] = useState<SummarySales | null>(null);
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [lowStock, setLowStock] = useState<CatalogProduct[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<SummaryErrorKind | null>(null);

  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // Свежие значения для таймера, не пересоздающего интервал
  const periodRef = useRef({ period, prevPeriod });
  periodRef.current = { period, prevPeriod };

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
    const { period: p, prevPeriod: pp } = periodRef.current;
    try {
      const [cur, prev, sales] = await Promise.all([
        query(p, controller.signal),
        query(pp, controller.signal),
        api.get("/main/pos/sales/", { params: { page_size: 8 }, signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setCurrent(parseSummarySales(cur));
      setPrevious(parseSummarySales(prev));
      setRecent(parseRecentSales(sales.data));
      setUpdatedAt(new Date());
      setErrorKind(null);
    } catch (err: any) {
      if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
      // Старые цифры остаются на экране, пока связь не вернётся
      setErrorKind(classifyError(err));
    } finally {
      if (abortRef.current === controller) inFlight.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Смена периода — сразу перезапрос, прошлый запрос отменяем
  useEffect(() => {
    setLoading(true);
    inFlight.current = false;
    abortRef.current?.abort();
    void refresh();
    return () => abortRef.current?.abort();
  }, [period, prevPeriod, refresh]);

  // Автообновление каждые 20 секунд (не в фоновой вкладке)
  useEffect(() => {
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
  }, [refresh]);

  // Каталог: «Заканчивается на складе»
  const loadCatalog = useCallback(async () => {
    try {
      const items = await fetchCatalogSnapshot();
      setLowStock(pickLowStock(items));
    } catch {
      /* остаётся прошлый список */
    }
  }, []);
  useEffect(() => {
    void loadCatalog();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCatalog();
    }, CATALOG_REFRESH_MS);
    return () => window.clearInterval(id);
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
    lowStock,
    updatedAt,
    loading,
    errorKind,
    refreshNow,
  };
}
