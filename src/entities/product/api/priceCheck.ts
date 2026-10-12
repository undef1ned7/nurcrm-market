import api from "@shared/api";
import {
  checkCatalogPrices,
  filterPriceRows,
  type PriceCheckFilter,
  type PriceCheckRow,
  type PriceFlag,
} from "@shared/lib/pricing";
import type { CatalogProduct } from "./catalog";

/**
 * «Проверка цен» — `GET /main/products/price-check/`
 * (docs/backend/calculator-after-stress-test/01-price-check-endpoint.md).
 * Итоги склада, счётчики фильтров и одну страницу строк считает сервер:
 * один запрос вместо выкачки всего каталога (до 100 запросов и ~40 МБ).
 */

export const PRICE_CHECK_FILTERS: PriceCheckFilter[] = ["all", "loss", "lowMargin", "noCost", "negativeStock"];
export const PRICE_CHECK_PAGE_SIZE = 200;

const KNOWN_FLAGS = new Set<PriceFlag>(["loss", "noMarkup", "lowMargin", "noCost", "negativeStock"]);

export type PriceCheckQuery = {
  filter: PriceCheckFilter;
  /** Порог «низкой маржи», %. */
  threshold: number;
  /** По названию, артикулу, основному и дополнительным штрихкодам. */
  search: string;
};

export type PriceCheckTotals = {
  stockAtCost: number;
  stockAtPrice: number;
  futureProfit: number;
  averageMargin: number | null;
  /** Сколько товаров (без услуг) на складе; null — сервер не прислал. */
  productsTotal: number | null;
};

export type PriceCheckPage = {
  /** По всему складу — без учёта поиска и фильтра. */
  summary: PriceCheckTotals;
  /** С учётом поиска, без учёта фильтра — для кнопок фильтров. */
  counts: Record<PriceCheckFilter, number>;
  /** Сколько строк под текущим фильтром и поиском. */
  count: number;
  hasNext: boolean;
  rows: PriceCheckRow[];
  /** Когда сервер посчитал итоги (если прислал). */
  calculatedAt: Date | null;
  /** ETag ответа — для повторного запроса с If-None-Match. */
  etag: string | null;
};

/** Эндпоинта нет на сервере — вкладка считает по каталогу, как раньше. */
export class PriceCheckUnavailableError extends Error {
  constructor() {
    super("price-check endpoint is not available");
    this.name = "PriceCheckUnavailableError";
  }
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const parseRow = (r: any): PriceCheckRow => ({
  id: r?.id ?? "",
  name: String(r?.name ?? "—"),
  barcode: r?.barcode ? String(r.barcode) : undefined,
  cost: num(r?.purchase_price),
  price: num(r?.price),
  qty: num(r?.quantity),
  markup: numOrNull(r?.markup),
  margin: numOrNull(r?.margin),
  stockProfit: numOrNull(r?.stock_profit),
  // Неизвестные метки (если сервер добавит новые) не показываем сырыми ключами
  flags: (Array.isArray(r?.flags) ? r.flags : []).filter((f: unknown): f is PriceFlag =>
    KNOWN_FLAGS.has(f as PriceFlag),
  ),
});

/** Разбор ответа сервера. Бросает ошибку, если это не ответ «Проверки цен». */
export function parsePriceCheckResponse(data: any, etag: string | null = null): PriceCheckPage {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("price-check: unexpected response");
  }
  const s = data.summary ?? {};
  const c = data.counts ?? {};
  const rows = Array.isArray(data.results) ? data.results.map(parseRow) : [];
  const counts = Object.fromEntries(
    PRICE_CHECK_FILTERS.map((f) => [f, Math.max(0, Math.trunc(num(c[f])))]),
  ) as Record<PriceCheckFilter, number>;
  const calculated = data.calculated_at ? new Date(data.calculated_at) : null;
  return {
    summary: {
      stockAtCost: num(s.stock_at_cost),
      stockAtPrice: num(s.stock_at_price),
      futureProfit: num(s.future_profit),
      averageMargin: numOrNull(s.average_margin),
      productsTotal: numOrNull(s.products_total),
    },
    counts,
    count: data.count != null ? Math.max(0, Math.trunc(num(data.count))) : rows.length,
    hasNext: Boolean(data.next),
    rows,
    calculatedAt: calculated && !Number.isNaN(calculated.getTime()) ? calculated : null,
    etag,
  };
}

/**
 * Условные запросы (If-None-Match) разрешены. API на другом домене: если бэк не
 * пустит этот заголовок через CORS, запрос упадёт без ответа — тогда отключаем
 * условные запросы до перезагрузки и повторяем обычный.
 */
let conditionalAllowed = true;

const isCanceled = (err: any) => err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

/**
 * Одна страница «Проверки цен». `null` — сервер ответил 304: данные не менялись.
 * Бросает PriceCheckUnavailableError, если эндпоинта на сервере нет.
 */
export async function fetchPriceCheckPage(
  query: PriceCheckQuery,
  page: number,
  { signal, etag, pageSize = PRICE_CHECK_PAGE_SIZE }: { signal?: AbortSignal; etag?: string | null; pageSize?: number } = {},
): Promise<PriceCheckPage | null> {
  const params: Record<string, unknown> = {
    filter: query.filter,
    threshold: query.threshold,
    page,
    page_size: pageSize,
    ordering: "name",
  };
  const search = query.search.trim();
  if (search) params.search = search;

  const request = (conditional: boolean) =>
    api.get("main/products/price-check/", {
      params,
      signal,
      headers: conditional && etag ? { "If-None-Match": etag } : undefined,
      validateStatus: (s: number) => (s >= 200 && s < 300) || s === 304,
    });

  let response: any;
  const conditional = Boolean(etag) && conditionalAllowed;
  try {
    response = await request(conditional);
  } catch (err: any) {
    if (isCanceled(err)) throw err;
    if ([404, 405, 501].includes(err?.response?.status)) throw new PriceCheckUnavailableError();
    if (conditional && !err?.response) {
      conditionalAllowed = false;
      response = await request(false);
    } else {
      throw err;
    }
  }
  if (response.status === 304) return null;
  const headers = response.headers ?? {};
  const nextEtag = headers.etag ?? (typeof headers.get === "function" ? headers.get("etag") : null) ?? null;
  return parsePriceCheckResponse(response.data, nextEtag ? String(nextEtag) : null);
}

/**
 * Запасной путь для сервера без price-check: те же итоги, счётчики и страница,
 * но посчитанные в браузере по выкачанному каталогу (как было до 08.10.2026).
 */
export function buildLocalPriceCheck(
  catalog: CatalogProduct[],
  query: PriceCheckQuery,
  page: number,
  pageSize = PRICE_CHECK_PAGE_SIZE,
): PriceCheckPage {
  const products = catalog.filter((p) => !p.isService);
  const { rows, summary } = checkCatalogPrices(products, query.threshold);
  const visible = filterPriceRows(rows, query.filter, query.search);
  const counts = Object.fromEntries(
    PRICE_CHECK_FILTERS.map((f) => [f, filterPriceRows(rows, f, query.search).length]),
  ) as Record<PriceCheckFilter, number>;
  const from = (page - 1) * pageSize;
  return {
    summary: { ...summary, productsTotal: products.length },
    counts,
    count: visible.length,
    hasNext: from + pageSize < visible.length,
    rows: visible.slice(from, from + pageSize),
    calculatedAt: null,
    etag: null,
  };
}

/** Для тестов: снова пробовать условные запросы. */
export function resetPriceCheckConditional() {
  conditionalAllowed = true;
}
