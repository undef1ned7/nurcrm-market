import i18n from "@shared/config/i18n";
import {
  getProductByBarcodeApi,
  lookupMarketWarehouseProductByBarcode,
  lookupWarehouseProductByBarcodeApi,
} from "@entities/product";
import { getBarcodeAmbiguity } from "@shared/lib/tools/barcodeAmbiguity";
import type { MassIncomingCheck, MassIncomingStatus } from "../model/types";

const toProduct = (raw: any) => {
  const product = raw?.product && typeof raw.product === "object" ? raw.product : raw;
  const id = product?.id ?? product?.uuid ?? product?.product_id;
  if (!id) return null;
  const qty = Number(
    product.stock_qty ?? product.quantity ?? product.stock ?? 0,
  );
  return {
    id: String(id),
    name: String(
      product.name || product.title || i18n.t("crm.warehouse.massIncoming.fallbackProductName"),
    ),
    barcode: String(product.barcode || raw?.barcode || ""),
    unit: String(product.unit || i18n.t("crm.warehouse.massIncoming.unitPiece")),
    stock_qty: Number.isFinite(qty) ? qty : 0,
  };
};

export function mergeScannedRow(
  status: MassIncomingStatus,
  barcode: string,
  product?: MassIncomingCheck["product"],
) {
  return {
    key: product?.id ? `${status}:${product.id}` : `${status}:${barcode}`,
    barcode,
    status,
    name: product?.name || i18n.t("crm.warehouse.massIncoming.unknown"),
    quantity: 1,
    stockQty: product?.stock_qty,
    productId: product?.id,
    unit: product?.unit,
  };
}

export async function classifyBarcodeFallback(
  barcode: string,
): Promise<MassIncomingCheck> {
  const code = String(barcode || "").trim();
  if (!code) {
    return { status: "UNKNOWN", barcode: "" };
  }

  try {
    const data = await lookupWarehouseProductByBarcodeApi(code);
    const product = toProduct(data);
    if (product) {
      return { status: "IN_STOCK", barcode: code, product };
    }
  } catch (error) {
    const ambiguity = getBarcodeAmbiguity(error);
    if (ambiguity) {
      return {
        status: "UNKNOWN",
        barcode: code,
        ambiguous: true,
        matches: ambiguity.matches || [],
      };
    }
  }

  try {
    const data = await getProductByBarcodeApi(code);
    const product = toProduct(data);
    if (product) {
      return { status: "IN_CATALOG", barcode: code, product };
    }
  } catch {
    /* continue */
  }

  const fallback = await lookupMarketWarehouseProductByBarcode(code);
  const product = toProduct(fallback?.product);
  if (product) {
    return { status: "IN_CATALOG", barcode: code, product };
  }

  return { status: "UNKNOWN", barcode: code };
}
