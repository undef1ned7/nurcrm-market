import { fetchMarketAnalytics } from "@entities/analytics";
import {
  fetchCatalogSnapshot,
  fetchCatalogVersion,
  type CatalogProduct,
} from "@entities/product";
import {
  computeAbc,
  summarizeAbc,
  type AbcRow,
  type AbcSummary,
} from "@shared/lib/abc";
import {
  formatPeriodForApi,
  type DateRange,
} from "@shared/lib/period";
import type { AbcSliceDef } from "../model/slices";

export type AbcSliceResult = {
  rows: AbcRow[];
  summary: AbcSummary;
  /** Итог по показателю (без отрицательных значений). */
  total: number;
  /** Сколько товаров не вошло в срез из-за отсутствия закупочной цены (только склад). */
  excludedNoCost: number;
  loadedAt: number;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const finish = (
  rows: AbcRow[],
  excludedNoCost: number,
): AbcSliceResult => ({
  rows,
  summary: summarizeAbc(rows),
  total: rows.reduce((s, r) => s + Math.max(r.value, 0), 0),
  excludedNoCost,
  loadedAt: Date.now(),
});

/**
 * Каталог для среза «Склад», привязанный к версии каталога. Если версия не
 * изменилась (повторный расчёт, смена периода, возврат на вкладку) — весь
 * каталог заново не качаем. Без версии (старый сервер) — качаем каждый раз.
 */
let catalogCache: { version: string; items: CatalogProduct[] } | null = null;

async function loadStockCatalog(signal?: AbortSignal): Promise<CatalogProduct[]> {
  // Версию берём до каталога: изменение посреди загрузки увидит следующий расчёт
  const version = await fetchCatalogVersion(signal);
  if (version !== null && catalogCache?.version === version) return catalogCache.items;
  const items = await fetchCatalogSnapshot(signal);
  catalogCache = version !== null ? { version, items } : null;
  return items;
}

/** Для тестов: забыть закэшированный каталог. */
export function resetAbcCatalogCache() {
  catalogCache = null;
}

/** Считает один срез ABC: по данным сервера или по каталогу (склад). */
export async function loadAbcSlice(
  slice: AbcSliceDef,
  period: DateRange,
  signal?: AbortSignal,
): Promise<AbcSliceResult> {
  if (slice.snapshot) {
    const catalog = await loadStockCatalog(signal);
    let excluded = 0;
    const items = catalog
      .filter((p) => !p.isService)
      .flatMap((p) => {
        if (!(p.cost > 0)) {
          excluded += 1;
          return [];
        }
        return [{ id: p.id, name: p.name, value: Math.max(p.qty, 0) * p.cost }];
      });
    return finish(computeAbc(items), excluded);
  }

  const data = await fetchMarketAnalytics(
    {
      tab: "abc",
      period_start: formatPeriodForApi(period.from),
      period_end: formatPeriodForApi(period.to),
      by: slice.by,
      metric: slice.metric,
    },
    signal,
  );
  const raw: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.tables?.items)
      ? data.tables.items
      : [];
  const metric = slice.metric ?? "revenue";
  const items = raw.map((item) => ({
    id: item?.id ?? null,
    name: String(item?.name ?? "—"),
    value: num(item?.[metric]),
  }));
  return finish(computeAbc(items), 0);
}
