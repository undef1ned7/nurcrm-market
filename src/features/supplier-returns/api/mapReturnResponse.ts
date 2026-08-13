import {
  COMPENSATION_TYPES,
  RETURN_REASONS,
} from "../model/types";
import type {
  CompensationType,
  ReturnReason,
  SupplierReturn,
  SupplierReturnItem,
  SupplierReturnListPayload,
  SupplierReturnSource,
  SupplierReturnStatus,
} from "../model/types";
import { productLabel, supplierLabel } from "../lib/formatReturn";
import {
  isWeightProduct,
  lineTotal,
  sanitizeNonNegative,
  toFiniteNumber,
} from "../lib/returnMath";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const asReason = (value: unknown): ReturnReason => {
  const key = String(value || "").trim() as ReturnReason;
  return RETURN_REASONS.includes(key) ? key : "other";
};

const asCompensation = (value: unknown): CompensationType => {
  const key = String(value || "").trim();
  if ((COMPENSATION_TYPES as readonly string[]).includes(key)) {
    return key as CompensationType;
  }
  if (key === "money" || key === "cashbox") return "cash";
  if (key === "debt" || key === "credit") return "debt_offset";
  return "none";
};

const asStatus = (value: unknown): SupplierReturnStatus =>
  String(value || "").toLowerCase() === "draft" ? "draft" : "posted";

export function mapReturnItem(raw: unknown): SupplierReturnItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const product = asRecord(row.product) || row;
  const productId = pickString(
    row.product_id,
    row.productId,
    product.id,
    product.uuid,
    row.id,
  );
  if (!productId) return null;
  const qty = sanitizeNonNegative(row.qty ?? row.quantity);
  const purchasePrice = sanitizeNonNegative(
    row.purchase_price ?? row.purchasePrice ?? row.price,
  );
  return {
    id: pickString(row.id, row.uuid) || undefined,
    productId,
    productName: productLabel({
      productName: row.product_name,
      product_name: row.product_name,
      name: product.name,
      title: product.title,
    }),
    barcode: pickString(row.barcode, product.barcode) || undefined,
    article: pickString(row.article, product.article) || undefined,
    unit: pickString(row.unit, product.unit) || "шт",
    isWeight: isWeightProduct(product) || isWeightProduct(row),
    qty,
    purchasePrice,
    lineTotal: toFiniteNumber(row.line_total ?? row.amount, lineTotal(qty, purchasePrice)),
    receiptItemId: pickString(row.receipt_item_id, row.receiptItemId) || null,
    currentStock:
      row.current_stock == null ? null : sanitizeNonNegative(row.current_stock),
    purchasedQty:
      row.purchased_qty == null && row.purchasedQty == null
        ? null
        : sanitizeNonNegative(row.purchased_qty ?? row.purchasedQty),
    alreadyReturnedQty:
      row.already_returned_qty == null
        ? null
        : sanitizeNonNegative(row.already_returned_qty),
    returnableQty:
      row.returnable_qty == null ? null : sanitizeNonNegative(row.returnable_qty),
  };
}

export function mapSupplierReturn(
  raw: unknown,
  source: SupplierReturnSource = "backend",
): SupplierReturn | null {
  const row = asRecord(raw);
  if (!row) return null;
  const supplier = asRecord(row.supplier);
  const id = pickString(row.id, row.uuid);
  if (!id) return null;
  const items = asArray(row.items ?? row.lines)
    .map(mapReturnItem)
    .filter((item): item is SupplierReturnItem => Boolean(item));
  const totalAmount = toFiniteNumber(
    row.total_amount ?? row.amount ?? row.sum,
    items.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  return {
    id,
    supplierId: pickString(row.supplier_id, row.supplierId, supplier?.id, supplier?.uuid),
    supplierName:
      pickString(row.supplier_name, row.supplierName, supplierLabel(supplier)) ||
      "—",
    receiptId: pickString(row.receipt_id, row.receiptId) || null,
    createdAt: pickString(row.created_at, row.createdAt, row.date),
    createdByName: pickString(
      row.created_by_name,
      row.createdByName,
      asRecord(row.created_by)?.full_name,
      asRecord(row.created_by)?.name,
    ),
    reason: asReason(row.reason),
    comment: pickString(row.comment, row.note, row.description),
    compensation: asCompensation(row.compensation ?? row.compensation_type),
    status: asStatus(row.status),
    items,
    itemsCount: toFiniteNumber(row.items_count ?? row.itemsCount, items.length),
    totalAmount,
    source,
  };
}

export function mapReturnListResponse(
  data: unknown,
  source: SupplierReturnSource = "backend",
): SupplierReturnListPayload {
  const root = asRecord(data);
  const rows = asArray(root?.results ?? root?.items ?? data);
  const list = rows
    .map((row) => mapSupplierReturn(row, source))
    .filter((row): row is SupplierReturn => Boolean(row));
  const meta = asRecord(root?.meta) || {};
  const rawTotal = meta.total_amount ?? root?.total_amount;
  const totalAmount =
    rawTotal == null || rawTotal === ""
      ? null
      : toFiniteNumber(rawTotal, NaN);
  return {
    list,
    count: toFiniteNumber(root?.count, list.length),
    next: root?.next ? String(root.next) : null,
    previous: root?.previous ? String(root.previous) : null,
    totalAmount: Number.isFinite(totalAmount) ? totalAmount : null,
    source,
  };
}
