import { STORAGE_KEY_PREFIX } from "../model/constants";
import type { SupplierReturn, SupplierReturnFilters } from "../model/types";

const keyFor = (companyId: string) =>
  `${STORAGE_KEY_PREFIX}.${String(companyId || "local")}`;

const readAll = (companyId: string): SupplierReturn[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (companyId: string, rows: SupplierReturn[]) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(keyFor(companyId), JSON.stringify(rows));
};

const inDateRange = (iso: string, from: string, to: string) => {
  const day = String(iso || "").slice(0, 10);
  if (from && day && day < from) return false;
  if (to && day && day > to) return false;
  return true;
};

export function loadLocalReturns(companyId: string): SupplierReturn[] {
  return readAll(companyId).sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
}

export function saveLocalReturn(companyId: string, row: SupplierReturn) {
  const next = [row, ...readAll(companyId).filter((item) => item.id !== row.id)];
  writeAll(companyId, next);
}

export function filterLocalReturns(
  rows: SupplierReturn[],
  filters: SupplierReturnFilters,
): SupplierReturn[] {
  const search = String(filters.search || "")
    .trim()
    .toLowerCase();
  return rows.filter((row) => {
    if (filters.supplier_id && String(row.supplierId) !== String(filters.supplier_id)) {
      return false;
    }
    if (filters.reason && row.reason !== filters.reason) return false;
    if (!inDateRange(row.createdAt, filters.date_from, filters.date_to)) return false;
    if (search) {
      const haystack = [
        row.supplierName,
        row.createdByName,
        row.comment,
        ...row.items.map((item) => item.productName),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function alreadyReturnedQtyForProduct({
  rows,
  productId,
  receiptId,
  receiptItemId,
}: {
  rows: SupplierReturn[];
  productId: string;
  receiptId?: string | null;
  receiptItemId?: string | null;
}): number {
  return rows.reduce((sum, row) => {
    if (receiptId && String(row.receiptId || "") !== String(receiptId)) return sum;
    return (
      sum +
      row.items.reduce((inner, item) => {
        if (String(item.productId) !== String(productId)) return inner;
        if (receiptItemId && item.receiptItemId && String(item.receiptItemId) !== String(receiptItemId)) {
          return inner;
        }
        return inner + Number(item.qty || 0);
      }, 0)
    );
  }, 0);
}
