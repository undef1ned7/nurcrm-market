export type AnalyticsTab =
  | "sales"
  | "warehouse"
  | "purchases"
  | "cashiers"
  | "shifts"
  | "products"
  | "suppliers"
  | "users"
  | "finance";

export type AnalyticsPeriod = {
  from: Date;
  to: Date;
};

export type AnalyticsFilters = Record<string, unknown> & {
  branch?: string;
  include_global?: boolean;
  cashbox?: string;
  shift?: string;
  cashier?: string;
  consultant?: string;
  payment_method?: string;
  min_total?: string | number;
  max_total?: string | number;
  purchase_date_from?: string;
  purchase_date_to?: string;
  product?: string;
  category?: string;
  kind?: string;
  low_only?: boolean;
  status?: string;
  limit?: string | number;
};

export type AnalyticsData = Record<string, unknown> | null;

export type StockSortMode =
  | "none"
  | "name-asc"
  | "name-desc"
  | "stock-asc"
  | "stock-desc";
