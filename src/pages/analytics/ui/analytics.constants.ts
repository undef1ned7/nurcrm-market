export const MARKET_ANALYTICS_TIMEOUT_MS = 160000;
export const START_HIDDEN_SALES_KPI_TITLES = new Set([
  "crm.analytics.sales.grossProfit",
  "crm.analytics.sales.margin",
]);
export const START_HIDDEN_PRODUCTS_KPI_TITLES = new Set([
  "crm.analytics.products.lowStock",
]);
export const DEFAULT_FILTERS = {
  branch: "",
  include_global: false,
  cashbox: "",
  shift: "",
  cashier: "",
  consultant: "",
  payment_method: "",
  min_total: "",
  max_total: "",
  purchase_date_from: "",
  purchase_date_to: "",
  product: "",
  category: "",
  kind: "",
  low_only: false,
  status: "",
  limit: "",
  supplier: "",
  abc_by: "product",
  abc_metric: "revenue",
};
export const DEFAULT_CASHBOX_NAME = "Основная касса";
