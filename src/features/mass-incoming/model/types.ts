export type MassIncomingStatus = "IN_STOCK" | "IN_CATALOG" | "UNKNOWN";

export type MassIncomingProduct = {
  id?: string;
  name?: string;
  barcode?: string;
  unit?: string;
  stock_qty?: number;
};

export type MassIncomingCheck = {
  status: MassIncomingStatus;
  barcode: string;
  product?: MassIncomingProduct | null;
  ambiguous?: boolean;
  matches?: unknown[];
};

export type MassIncomingRow = {
  key: string;
  barcode: string;
  status: MassIncomingStatus;
  name: string;
  quantity: number;
  stockQty?: number;
  productId?: string;
  unit?: string;
};
