import api from "@shared/api";
import { addCashFlows } from "@entities/cash";
import { updateProductAsync } from "@entities/product";
import {
  RETURNS_CREATE_PATH,
  RETURNS_DETAIL_PATH,
  RETURNS_LIST_PATH,
} from "../model/constants";
import type {
  CreateSupplierReturnPayload,
  SupplierReturn,
  SupplierReturnFilters,
  SupplierReturnListPayload,
} from "../model/types";
import { lineTotal, sumReturnItems } from "../lib/returnMath";
import {
  filterLocalReturns,
  loadLocalReturns,
  saveLocalReturn,
} from "./localStore";
import { mapReturnListResponse, mapSupplierReturn } from "./mapReturnResponse";

type AppDispatch = (action: unknown) => { unwrap: () => Promise<unknown> };

export const isMissingEndpoint = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
};

const listFrom = (res: { data?: unknown } | unknown): unknown[] => {
  const data =
    res && typeof res === "object" && "data" in res
      ? (res as { data?: unknown }).data
      : res;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: unknown[] }).results;
  }
  return [];
};

const paginate = <T,>(rows: T[], page: number, limit: number) => {
  const start = Math.max(0, (page - 1) * limit);
  return rows.slice(start, start + limit);
};

export async function fetchSupplierReturns({
  companyId,
  page = 1,
  limit = 20,
  filters,
}: {
  companyId: string;
  page?: number;
  limit?: number;
  filters: SupplierReturnFilters;
}): Promise<SupplierReturnListPayload> {
  try {
    const params: Record<string, string | number> = { page, limit };
    if (filters.supplier_id) params.supplier_id = filters.supplier_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.reason) params.reason = filters.reason;
    if (filters.search) params.search = filters.search;
    const res = await api.get(RETURNS_LIST_PATH, { params });
    return mapReturnListResponse(res.data, "backend");
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error;
    const all = filterLocalReturns(loadLocalReturns(companyId), filters);
    const list = paginate(all, page, limit);
    const totalAmount = all.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    return {
      list,
      count: all.length,
      next: page * limit < all.length ? "local-next" : null,
      previous: page > 1 ? "local-prev" : null,
      totalAmount,
      source: "composed",
    };
  }
}

export async function fetchSupplierReturnDetail(
  id: string,
  companyId: string,
): Promise<SupplierReturn | null> {
  try {
    const { data } = await api.get(RETURNS_DETAIL_PATH(id));
    return mapSupplierReturn(data, "backend");
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error;
    return loadLocalReturns(companyId).find((row) => String(row.id) === String(id)) || null;
  }
}

export async function fetchSuppliers() {
  const res = await api.get("/main/clients/", {
    params: { type: "suppliers", page_size: 500 },
  });
  return listFrom(res);
}

export async function fetchSupplierProducts(supplierId: string) {
  const res = await api.get(
    `/main/suppliers/${encodeURIComponent(supplierId)}/products/`,
  );
  return listFrom(res);
}

export async function fetchReceiptDetail(receiptId: string) {
  const { data } = await api.get(
    `/main/suppliers/receipts/${encodeURIComponent(receiptId)}/`,
  );
  return data;
}

const buildLocalReturn = (payload: CreateSupplierReturnPayload): SupplierReturn => {
  const items = payload.items.map((item, index) => ({
    id: `local-item-${Date.now()}-${index}`,
    productId: item.productId,
    productName: item.productName,
    unit: item.unit || "шт",
    isWeight: item.isWeight,
    qty: item.qty,
    purchasePrice: item.purchasePrice,
    lineTotal: lineTotal(item.qty, item.purchasePrice),
    receiptItemId: item.receiptItemId || null,
    currentStock: item.currentStock,
  }));
  return {
    id: `local-${Date.now()}`,
    supplierId: payload.supplierId,
    supplierName: payload.supplierName,
    receiptId: payload.receiptId || null,
    createdAt: new Date().toISOString(),
    createdByName: payload.createdByName || "—",
    reason: payload.reason,
    comment: payload.comment,
    compensation: payload.compensation,
    status: "posted",
    items,
    itemsCount: items.length,
    totalAmount: sumReturnItems(items),
    source: "composed",
  };
};

export async function createSupplierReturn({
  payload,
  companyId,
  companyPlanName,
  dispatch,
}: {
  payload: CreateSupplierReturnPayload;
  companyId: string;
  companyPlanName?: string;
  dispatch: AppDispatch;
}): Promise<{ row: SupplierReturn; source: "backend" | "composed" }> {
  const body = {
    receipt_id: payload.receiptId || undefined,
    reason: payload.reason,
    comment: payload.comment || "",
    compensation: payload.compensation,
    cashbox_id: payload.compensation === "cash" ? payload.cashboxId : undefined,
    items: payload.items.map((item) => ({
      product_id: item.productId,
      qty: item.qty,
      purchase_price: item.purchasePrice,
      receipt_item_id: item.receiptItemId || undefined,
    })),
  };

  try {
    const { data } = await api.post(RETURNS_CREATE_PATH(payload.supplierId), body);
    const mapped = mapSupplierReturn(data, "backend");
    if (!mapped) {
      throw new Error("Сервер не вернул документ возврата");
    }
    return { row: mapped, source: "backend" };
  } catch (error) {
    if (!isMissingEndpoint(error)) throw error;

    for (const item of payload.items) {
      await dispatch(
        updateProductAsync({
          productId: item.productId,
          updatedData: {
            quantity: Math.max(0, Number(item.currentStock || 0) - item.qty),
          },
        }),
      ).unwrap();
    }

    if (payload.compensation === "cash" && payload.cashboxId) {
      const amount = sumReturnItems(payload.items);
      if (amount > 0) {
        try {
          await dispatch(
            addCashFlows({
              cashbox: payload.cashboxId,
              type: "income",
              name: `Возврат поставщику: ${payload.supplierName}`,
              amount: amount.toFixed(2),
              source_business_operation_id: "Возврат поставщику",
              status: companyPlanName === "Старт" ? "approved" : "pending",
            }),
          ).unwrap();
        } catch {
          /* остаток уже списан; документ всё равно сохраняем локально */
        }
      }
    }

    const row = buildLocalReturn(payload);
    saveLocalReturn(companyId, row);
    return { row, source: "composed" };
  }
}
