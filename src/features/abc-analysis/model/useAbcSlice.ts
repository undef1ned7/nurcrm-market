import { useCallback, useEffect, useRef, useState } from "react";
import { formatPeriodForApi, type DateRange } from "@shared/lib/period";
import { loadAbcSlice, type AbcSliceResult } from "../api/loadAbcSlice";
import type { AbcSliceDef } from "./slices";

const cache = new Map<string, AbcSliceResult>();

const cacheKey = (slice: AbcSliceDef, period: DateRange) =>
  slice.snapshot
    ? `${slice.id}`
    : `${slice.id}:${formatPeriodForApi(period.from)}:${formatPeriodForApi(period.to)}`;

type Options = {
  /** Не пересчитывать срез чаще, чем раз в N мс (если нет принудительного обновления). */
  minIntervalMs?: number;
  enabled?: boolean;
};

/**
 * Загружает срез ABC. Результаты кэшируются по срезу и периоду, чтобы блок в
 * «Сводке» не гонял тяжёлый запрос чаще раза в минуту.
 */
export function useAbcSlice(
  slice: AbcSliceDef,
  period: DateRange,
  { minIntervalMs = 0, enabled = true }: Options = {},
) {
  const key = cacheKey(slice, period);
  const [result, setResult] = useState<AbcSliceResult | null>(
    () => cache.get(key) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const periodRef = useRef(period);
  periodRef.current = period;
  const sliceRef = useRef(slice);
  sliceRef.current = slice;

  const refresh = useCallback(
    async (force = false) => {
      const cached = cache.get(key);
      if (
        !force &&
        cached &&
        minIntervalMs > 0 &&
        Date.now() - cached.loadedAt < minIntervalMs
      ) {
        setResult(cached);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const next = await loadAbcSlice(
          sliceRef.current,
          periodRef.current,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        cache.set(key, next);
        setResult(next);
      } catch (err: any) {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        setError(
          err?.response?.data?.detail
            ? String(err.response.data.detail)
            : err?.response?.status === 403
              ? "forbidden"
              : "load_failed",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [key, minIntervalMs],
  );

  useEffect(() => {
    setResult(cache.get(key) ?? null);
    if (enabled) void refresh(false);
    return () => abortRef.current?.abort();
  }, [key, enabled, refresh]);

  return { result, loading, error, refresh };
}
