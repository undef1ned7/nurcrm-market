import api from "@shared/api";
import {
  normalizeVariant,
  normalizeVariantList,
  type ProductVariant,
} from "../lib/variants";

export type VariantPayload = {
  size?: string;
  color?: string;
  barcode?: string;
  quantity?: string | number;
  price?: string | number | null;
  is_active?: boolean;
};

const base = (productId: string | number) =>
  `/main/products/${encodeURIComponent(String(productId))}/variants/`;

export async function fetchProductVariants(
  productId: string | number,
): Promise<ProductVariant[]> {
  const { data } = await api.get(base(productId), { params: { page_size: 500 } });
  return normalizeVariantList(data);
}

const SALE_VARIANTS_TTL_MS = 60_000;
const saleVariantsCache = new Map<string, { at: number; list: ProductVariant[] }>();

/** Сбросить кэш вариантов (после продажи/обмена остатки поменялись). */
export function invalidateSaleVariantsCache(productId?: string | number) {
  if (productId == null) saleVariantsCache.clear();
  else saleVariantsCache.delete(String(productId));
}

/**
 * Продаваемые варианты товара для окна выбора размера. Если товар явно без
 * вариантов (has_variants=false / variants_count=0) — запроса нет. Ответ
 * кэшируется на минуту, чтобы повторный клик по товару не ждал сеть.
 */
export async function fetchSaleVariants(product: any): Promise<ProductVariant[]> {
  if (!product?.id) return [];
  if (Array.isArray(product.variants)) {
    return normalizeVariantList(product.variants).filter((v) => v.is_active);
  }
  if (product.has_variants === false) return [];
  if (product.variants_count != null && Number(product.variants_count) === 0) return [];
  if (String(product.kind ?? "") === "service") return [];

  const key = String(product.id);
  const cached = saleVariantsCache.get(key);
  if (cached && Date.now() - cached.at < SALE_VARIANTS_TTL_MS) return cached.list;

  const list = (await fetchProductVariants(product.id)).filter((v) => v.is_active);
  saleVariantsCache.set(key, { at: Date.now(), list });
  return list;
}

export async function createProductVariant(
  productId: string | number,
  payload: VariantPayload,
): Promise<ProductVariant | null> {
  const { data } = await api.post(base(productId), payload);
  return normalizeVariant(data);
}

export async function updateProductVariant(
  productId: string | number,
  variantId: string | number,
  payload: VariantPayload,
): Promise<ProductVariant | null> {
  const { data } = await api.patch(
    `${base(productId)}${encodeURIComponent(String(variantId))}/`,
    payload,
  );
  return normalizeVariant(data);
}

export async function deleteProductVariant(
  productId: string | number,
  variantId: string | number,
): Promise<void> {
  await api.delete(`${base(productId)}${encodeURIComponent(String(variantId))}/`);
}
