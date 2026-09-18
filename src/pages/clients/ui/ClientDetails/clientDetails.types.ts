import type { Dispatch, SetStateAction } from "react";

export type ClientRecord = {
  id?: string | number;
  fio?: string;
  full_name?: string;
  type?: string;
  status?: string;
  phone?: string;
  email?: string;
  address?: string;
  llc?: string;
  inn?: string;
  okpo?: string;
  score?: string;
  bik?: string;
  date?: string;
  [key: string]: unknown;
};

export type DealRecord = {
  id?: string | number;
  title?: string;
  kind?: string;
  amount?: number | string;
  remaining_debt?: number | string;
  prepayment?: number | string;
  debt_amount?: number | string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  /** id чека POS, из которого создан долг (null — долг создан вручную). */
  sale_id?: string | number | null;
  [key: string]: unknown;
};

export type PosSaleItem = {
  product_name?: string;
  name_snapshot?: string;
  quantity?: number | string;
  [key: string]: unknown;
};

export type PosSaleRecord = {
  id?: string | number;
  status?: string;
  created_at?: string;
  paid_at?: string;
  total?: number | string;
  discount_total?: number | string;
  client?: unknown;
  items?: PosSaleItem[];
  [key: string]: unknown;
};

export type SupplierProduct = {
  id?: string | number;
  name?: string;
  title?: string;
  code?: string;
  article?: string;
  barcode?: string;
  quantity?: number | string;
  unit?: string;
  purchase_price?: number | string;
  price?: number | string;
  [key: string]: unknown;
};

export type SupplierPurchase = {
  id?: string | number;
  purchased_at?: string;
  created_at?: string;
  product_name?: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  amount?: number | string;
  total?: number | string;
  payment_type?: string;
  [key: string]: unknown;
};

export type SupplierPurchasesSummary = {
  total_amount?: number | string;
  total_count?: number | string;
};

export type DealTotals = {
  debt: number;
  prepayment: number;
  sale: number;
  amount: number;
};

export type DetailsView = "debt" | "prepayment" | "sale" | null;

export type DetailRow = {
  id: string | number | undefined;
  title: string;
  date: string;
  amount: number;
};

export type DebtProgress = {
  percent: number;
  paid: number;
  total: number;
  remaining: number;
  fill?: string;
  bg?: string;
  border?: string;
  glow?: string;
};

export type DatePreset = "today" | "week" | "month" | "clear";

export type AlertState = {
  open: boolean;
  type: string;
  message: string;
};

export type ClientsOutletContext = {
  clients?: ClientRecord[];
  setClients?: Dispatch<SetStateAction<ClientRecord[]>>;
};
