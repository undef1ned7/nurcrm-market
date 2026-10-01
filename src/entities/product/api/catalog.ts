import api from "@shared/api";
import type { CatalogItem } from "@shared/lib/pricing";

const PAGE_SIZE = 200;
const MAX_PAGES = 100;

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Услуга: у неё нет остатка и закупки. */
export const isServiceProduct = (p: any) =>
  p?.stock === false ||
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

/**
 * Весь каталог товаров (все страницы `/main/products/list/`).
 * Нужен «Проверке цен», срезу ABC «Склад» и блоку «Заканчивается на складе».
 */
export async function fetchCatalogSnapshot(
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  const out: CatalogProduct[] = [];
  let url: string | null = "main/products/list/";
  let params: Record<string, unknown> | undefined = { page_size: PAGE_SIZE };

  for (let page = 0; page < MAX_PAGES && url; page += 1) {
    const { data } = await api.get(url, { params, signal });
    const list: any[] = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    list.forEach((p) => out.push(mapCatalogProduct(p)));
    url = data?.next ? String(data.next) : null;
    params = undefined; // `next` уже содержит параметры
  }
  return out;
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
