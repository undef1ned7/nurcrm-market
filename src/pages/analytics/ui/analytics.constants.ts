export const MARKET_ANALYTICS_TIMEOUT_MS = 160000;
export const START_HIDDEN_SALES_KPI_TITLES = new Set([
  "Валовая прибыль",
  "Маржа",
]);
export const START_HIDDEN_PRODUCTS_KPI_TITLES = new Set([
  "Товаров с низким остатком",
]);
export const DEFAULT_FILTERS = {
  branch: "",
  include_global: false,
  cashbox: "",
  shift: "",
  cashier: "",
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
};
export const DEFAULT_CASHBOX_NAME = "Основная касса";
