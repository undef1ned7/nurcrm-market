export const RETURN_REASONS = [
  "defect",
  "surplus",
  "wrong_item",
  "expired",
  "other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export const COMPENSATION_TYPES = ["cash", "debt_offset", "none"] as const;

export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export type SupplierReturnStatus = "posted" | "draft";

export type SupplierReturnSource = "backend" | "composed";

export type SupplierReturnItem = {
  id?: string;
  productId: string;
  productName: string;
  barcode?: string;
  article?: string;
  unit: string;
  isWeight: boolean;
  qty: number;
  purchasePrice: number;
  lineTotal: number;
  receiptItemId?: string | null;
  currentStock?: number | null;
  purchasedQty?: number | null;
  alreadyReturnedQty?: number | null;
  returnableQty?: number | null;
};

export type SupplierReturn = {
  id: string;
  supplierId: string;
  supplierName: string;
  receiptId?: string | null;
  createdAt: string;
  createdByName: string;
  reason: ReturnReason;
  comment: string;
  compensation: CompensationType;
  status: SupplierReturnStatus;
  items: SupplierReturnItem[];
  itemsCount: number;
  totalAmount: number;
  source: SupplierReturnSource;
};

export type SupplierReturnListPayload = {
  list: SupplierReturn[];
  count: number;
  next: string | null;
  previous: string | null;
  totalAmount: number | null;
  source: SupplierReturnSource;
};

export type SupplierReturnFilters = {
  supplier_id: string;
  date_from: string;
  date_to: string;
  reason: string;
  search: string;
};

export type CreateSupplierReturnPayload = {
  supplierId: string;
  supplierName: string;
  receiptId?: string | null;
  reason: ReturnReason;
  comment: string;
  compensation: CompensationType;
  cashboxId?: string;
  createdByName: string;
  items: Array<{
    productId: string;
    productName: string;
    unit: string;
    isWeight: boolean;
    qty: number;
    purchasePrice: number;
    receiptItemId?: string | null;
    currentStock: number;
  }>;
};

export type ReturnableProduct = {
  productId: string;
  productName: string;
  barcode: string;
  article: string;
  code: string;
  unit: string;
  isWeight: boolean;
  currentStock: number;
  purchasePrice: number;
  purchasedQty: number | null;
  alreadyReturnedQty: number;
  returnableQty: number;
  receiptItemId: string | null;
};
