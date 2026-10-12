import i18n from "@shared/config/i18n";
import {
  fetchProductsApi,
  getProductByBarcodeApi,
  lookupWarehouseProductByBarcodeApi,
} from "@entities/product";
import {
  getBarcodeAmbiguity,
  isBarcodeNotFoundError,
} from "@shared/lib/tools/barcodeAmbiguity";
import { productMatchesBarcode } from "@shared/lib/tools/productBarcode";
import type {
  MassIncomingCheck,
  MassIncomingProduct,
  MassIncomingRow,
  MassIncomingSource,
  MassIncomingStatus,
} from "../model/types";

const priceText = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : "";
};

export const toMassIncomingProduct = (raw: any): MassIncomingProduct | null => {
  const product = raw?.product && typeof raw.product === "object" ? raw.product : raw;
  if (!product || typeof product !== "object") return null;
  const id = product.id ?? product.uuid ?? product.product_id;
  const qty = Number(product.stock_qty ?? product.quantity ?? product.stock ?? 0);
  return {
    id: id ? String(id) : undefined,
    name: String(
      product.name || product.title || i18n.t("crm.warehouse.massIncoming.fallbackProductName"),
    ),
    barcode: String(product.barcode || raw?.barcode || ""),
    unit: String(product.unit || i18n.t("crm.warehouse.massIncoming.unitPiece")),
    stock_qty: Number.isFinite(qty) ? qty : 0,
    price: priceText(product.price),
  };
};

/** Ключ строки: одна карточка компании = одна строка, иначе — по штрихкоду. */
export const rowKey = (source: MassIncomingSource, barcode: string, productId?: string) =>
  source === "company" && productId ? `p:${productId}` : `${source}:${barcode}`;

export function mergeScannedRow(check: MassIncomingCheck, fallbackCode: string): MassIncomingRow {
  const { status, source, product } = check;
  const barcode = check.barcode || fallbackCode;
  const productId = source === "company" ? product?.id : undefined;
  const price = product?.price || "";
  return {
    key: rowKey(source, barcode, productId),
    barcode,
    status,
    source,
    name: product?.name || i18n.t("crm.warehouse.massIncoming.unknown"),
    quantity: 1,
    stockQty: source === "company" ? product?.stock_qty : undefined,
    productId,
    unit: product?.unit,
    price,
    initialPrice: source === "company" ? price : "",
  };
}

const ambiguousCheck = (code: string, error: unknown): MassIncomingCheck | null => {
  const ambiguity = getBarcodeAmbiguity(error);
  if (!ambiguity) return null;
  return {
    status: "UNKNOWN",
    source: "none",
    barcode: code,
    ambiguous: true,
    matches: ambiguity.matches || [],
  };
};

/** Карточка компании по основному штрихкоду или по `alternate_barcodes`. */
async function findCompanyProduct(code: string): Promise<MassIncomingCheck | null> {
  try {
    const product = toMassIncomingProduct(await lookupWarehouseProductByBarcodeApi(code));
    if (product?.id) {
      return { status: "IN_STOCK", source: "company", barcode: code, product };
    }
  } catch (error) {
    const ambiguous = ambiguousCheck(code, error);
    if (ambiguous) return ambiguous;
    if (!isBarcodeNotFoundError(error)) throw error;
  }

  // barcode-эндпоинты ищут только по основному коду — доп. коды через список.
  const data = await fetchProductsApi({ search: code, page: 1, page_size: 50 });
  const list: any[] = Array.isArray(data) ? data : data?.results || [];
  const match = list.find((item: any) => productMatchesBarcode(item, code));
  const product = match ? toMassIncomingProduct(match) : null;
  return product?.id
    ? { status: "IN_STOCK", source: "company", barcode: code, product }
    : null;
}

/** Глобальная база NurCRM (GlobalProduct): карточки компании ещё нет. */
export async function findGlobalProduct(code: string): Promise<MassIncomingCheck | null> {
  try {
    const product = toMassIncomingProduct(await getProductByBarcodeApi(code));
    if (product) {
      return { status: "IN_CATALOG", source: "global", barcode: code, product };
    }
  } catch (error) {
    if (!isBarcodeNotFoundError(error)) throw error;
  }
  return null;
}

/**
 * Классификация через `/main/products/` — тот же каталог, что показывает
 * `/crm/sklad`. Не требует склада.
 */
export async function classifyBarcodeFallback(barcode: string): Promise<MassIncomingCheck> {
  const code = String(barcode || "").trim();
  if (!code) return { status: "UNKNOWN", source: "none", barcode: "" };

  const company = await findCompanyProduct(code);
  if (company) return company;

  const global = await findGlobalProduct(code);
  if (global) return global;

  return { status: "UNKNOWN", source: "none", barcode: code };
}

export const isCheckStatus = (value: unknown): value is MassIncomingStatus =>
  value === "IN_STOCK" || value === "IN_CATALOG" || value === "UNKNOWN";
