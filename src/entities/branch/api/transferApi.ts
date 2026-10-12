import api from "@shared/api";

/**
 * Перемещение товаров между складами/филиалах.
 * Контракт бэка: docs/backend/branch-transfers-backend.md
 *
 * `null` в from_branch / to_branch = «Главный склад» компании (товары без филиала).
 */

export type TransferStatus = "completed" | "cancelled";

export type TransferBranchRef = { id: string; name: string } | null;

export type TransferItem = {
  id?: string;
  product: string;
  name: string;
  article?: string | null;
  barcode?: string | null;
  unit?: string | null;
  quantity: number | string;
  price?: number | string | null;
  amount?: number | string | null;
};

export type BranchTransfer = {
  id: string;
  number: string;
  status: TransferStatus;
  date: string;
  from_branch: TransferBranchRef;
  to_branch: TransferBranchRef;
  comment?: string | null;
  created_by?: { id: string; full_name?: string } | null;
  items: TransferItem[];
  items_count?: number;
  total_quantity?: number | string;
  total_amount?: number | string;
  seller?: {
    name?: string;
    inn?: string;
    okpo?: string;
    address?: string;
    phone?: string;
  } | null;
  created_at?: string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
};

export type TransferListParams = {
  branch?: string;
  from_branch?: string;
  to_branch?: string;
  status?: TransferStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
};

export type CreateTransferPayload = {
  from_branch: string | null;
  to_branch: string | null;
  date: string;
  comment?: string;
  items: Array<{ product: string; quantity: number }>;
};

/** Значение фильтра/поля для «Главный склад». */
export const MAIN_WAREHOUSE = "main";

const BASE = "/main/branch-transfers/";

const listFrom = (data: any) => data?.results ?? data ?? [];

export type TransferPage = {
  items: BranchTransfer[];
  count: number;
  next: string | null;
  previous: string | null;
};

export async function fetchTransfers(
  params: TransferListParams = {},
): Promise<TransferPage> {
  const { data } = await api.get(BASE, { params });
  const items = listFrom(data);
  return {
    items: Array.isArray(items) ? items : [],
    count: typeof data?.count === "number" ? data.count : items.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}

export async function fetchTransfer(id: string): Promise<BranchTransfer> {
  const { data } = await api.get(`${BASE}${id}/`);
  return data;
}

export async function createTransfer(
  payload: CreateTransferPayload,
): Promise<BranchTransfer> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function cancelTransfer(
  id: string,
  reason?: string,
): Promise<BranchTransfer> {
  const { data } = await api.post(`${BASE}${id}/cancel/`, {
    reason: reason || undefined,
  });
  return data;
}

export type TransferProduct = {
  id: string;
  name: string;
  article?: string | null;
  barcode?: string | null;
  unit?: string | null;
  /** Остаток на складе-источнике; null — неизвестен (например, «Повторить»). */
  quantity: number | null;
  price?: number | null;
  purchase_price?: number | null;
  is_weight?: boolean;
};

/**
 * Остатки на складе-источнике. `branch` — id филиала; `null` — главный склад:
 * запрос без `branch`, как у страницы склада /crm/sklad.
 */
export async function searchStockProducts(
  branch: string | null,
  search: string,
  pageSize = 30,
): Promise<TransferProduct[]> {
  const { data } = await api.get("/main/products/list/", {
    params: {
      branch: branch || undefined,
      search: search || undefined,
      page_size: pageSize,
    },
  });
  const rows = listFrom(data);
  return (Array.isArray(rows) ? rows : []).map((p: any) => ({
    id: String(p.id),
    name: p.name || p.title || "Без названия",
    article: p.article ?? null,
    barcode: p.barcode ?? null,
    unit: p.unit ?? null,
    quantity: Number(p.quantity ?? p.remainder ?? 0),
    price: p.price != null ? Number(p.price) : null,
    purchase_price: p.purchase_price != null ? Number(p.purchase_price) : null,
    is_weight: Boolean(p.is_weight),
  }));
}
