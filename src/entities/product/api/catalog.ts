import api from "@shared/api";
import type { CatalogItem } from "@shared/lib/pricing";

const PAGE_SIZE = 200;
const MAX_PAGES = 100;

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Услуга: у неё нет остатка и закупки. Определяется только по `kind`:
 * поле `stock` — это галочка «Акционный товар», а не признак складского товара.
 */
export const isServiceProduct = (p: any) =>
  ["service", "услуга"].includes(String(p?.kind ?? "").toLowerCase());

export type CatalogProduct = CatalogItem & {
  isService: boolean;
  categoryName: string;
  brandName: string;
};

export const mapCatalogProduct = (p: any): CatalogProduct => ({
  id: p.id,
  name: String(p.name ?? "—"),
  barcode: p.barcode ? String(p.barcode) : undefined,
  cost: num(p.purchase_price),
  price: num(p.price),
  qty: num(p.quantity),
  isService: isServiceProduct(p),
  categoryName: String(p.category_name ?? p.category?.name ?? ""),
  brandName: String(p.brand_name ?? p.brand?.name ?? ""),
});

export type CatalogSnapshot = {
  items: CatalogProduct[];
  /** Сервер сообщил больше товаров, чем загружено (предел страниц). */
  truncated: boolean;
  /** Сколько товаров всего по ответу сервера (`count`), если он его прислал. */
  total: number | null;
};

/**
 * Весь каталог товаров (все страницы `/main/products/list/`) с признаком обрезки.
 * Нужен «Проверке цен», срезу ABC «Склад» и блоку «Заканчивается на складе».
 */
export async function fetchCatalogSnapshotMeta(
  signal?: AbortSignal,
): Promise<CatalogSnapshot> {
  const out: CatalogProduct[] = [];
  let url: string | null = "main/products/list/";
  let params: Record<string, unknown> | undefined = { page_size: PAGE_SIZE };
  let total: number | null = null;

  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const { data } = await api.get(url, { params, signal });
    const list: any[] = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    list.forEach((p) => out.push(mapCatalogProduct(p)));
    if (data?.count != null && Number.isFinite(Number(data.count))) total = Number(data.count);
    url = data?.next ? String(data.next) : null;
    params = undefined; // `next` уже содержит параметры
  }
  return { items: out, truncated: !!url || (total !== null && total > out.length), total };
}

/** Весь каталог товаров (только список). */
export async function fetchCatalogSnapshot(
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  return (await fetchCatalogSnapshotMeta(signal)).items;
}

/** Поиск товара по названию или штрихкоду для подстановки в калькулятор. */
export async function searchCatalogProducts(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  const { data } = await api.get("main/products/list/", {
    params: { search: query, page_size: 20 },
    signal,
  });
  const list: any[] = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
      ? data
      : [];
  return list.map(mapCatalogProduct);
}

/** Сколько страниц «малого остатка» читать максимум (по 100–200 товаров). */
const LOW_STOCK_MAX_PAGES = 10;

/**
 * Товары с остатком не больше `threshold` — для блока «Заканчивается на складе».
 * Фильтр по остатку делает сервер (`stock_type=total&stock_condition=lt&stock_value`,
 * контракт подтверждён в docs/backend/warehouse-filters-backend.md), поэтому весь
 * каталог ради шести строк больше не скачивается.
 * Если сервер вдруг проигнорирует фильтр (в ответе товары с большим остатком) —
 * берём полный каталог, чтобы список остался верным.
 */
export async function fetchLowStockProducts(
  threshold: number,
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  let url: string | null = "main/products/list/";
  let params: Record<string, unknown> | undefined = {
    stock_type: "total",
    stock_condition: "lt",
    // lt N+1: целые остатки до N включительно; дробные (весовые) отсекаем ниже
    stock_value: threshold + 1,
  };
  for (let page = 0; page < LOW_STOCK_MAX_PAGES && url; page += 1) {
    const { data } = await api.get(url, { params, signal });
    const list: any[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    const mapped = list.map(mapCatalogProduct);
    if (mapped.some((p) => p.qty >= threshold + 1)) {
      return fetchCatalogSnapshot(signal); // фильтр не сработал
    }
    out.push(...mapped);
    url = data?.next ? String(data.next) : null;
    params = undefined;
  }
  return out;
}
