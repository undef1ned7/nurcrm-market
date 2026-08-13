import api from "@shared/api";
import {
  SUPPLIER_PRODUCTS_API_PATH,
} from "../model/constants";
import {
  listFrom,
  mapSupplierProductToRecommendationItem,
} from "../lib/productMappers";
import { roundWeight, sanitizeNonNegative } from "../lib/recommendationMath";
import type {
  ProcurementRecommendationItem,
  ProcurementRecommendationPayload,
} from "../model/types";

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function demoSales(productId: string, isWeight: boolean) {
  const hash = hashString(productId);
  const dailyBase = ((hash % 80) + 8) / 20;
  const daily = isWeight ? dailyBase * 0.4 : dailyBase;
  const prevFactor = 0.65 + (hash % 50) / 100;
  const qty = (days: number, factor = 1) => {
    const raw = daily * days * factor;
    return isWeight ? roundWeight(raw) : Math.round(raw);
  };
  return {
    sales7d: qty(7),
    sales14d: qty(14),
    sales30d: qty(30),
    previous7d: qty(7, prevFactor),
    previous14d: qty(14, prevFactor),
    previous30d: qty(30, prevFactor),
  };
}

function demoLastPurchase(
  productId: string,
  current: ProcurementRecommendationItem,
) {
  if (current.lastPurchase) return current.lastPurchase;
  const hash = hashString(`${productId}:purchase`);
  const daysAgo = (hash % 18) + 1;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const pack = current.packSize && current.packSize > 1 ? current.packSize : 10;
  const quantity = current.isWeight
    ? roundWeight(((hash % 20) + 5) / 2)
    : pack * ((hash % 4) + 1);
  return {
    date: date.toISOString(),
    quantity,
    purchasePrice: current.purchasePrice ?? null,
  };
}

export async function fetchComposedRecommendations(
  supplierId: string,
  supplierName: string,
): Promise<ProcurementRecommendationPayload> {
  const res = await api.get(SUPPLIER_PRODUCTS_API_PATH(supplierId));
  const products = listFrom(res).filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object",
  );

  const items: ProcurementRecommendationItem[] = [];
  products.forEach((product) => {
    const productId = String(product.id ?? product.uuid ?? "").trim();
    if (!productId) return;
    const isWeight =
      product.is_weight === true ||
      String(product.scale_type ?? "").toLowerCase() === "weight";
    const mapped = mapSupplierProductToRecommendationItem(
      product,
      demoSales(productId, isWeight),
    );
    if (!mapped) return;
    items.push({
      ...mapped,
      lastPurchase: demoLastPurchase(productId, mapped),
      currentStock: sanitizeNonNegative(mapped.currentStock),
    });
  });

  return {
    supplier: { id: supplierId, name: supplierName },
    source: "composed",
    items,
  };
}
