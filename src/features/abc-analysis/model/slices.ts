export type AbcSliceId =
  | "productRevenue"
  | "productProfit"
  | "productQty"
  | "category"
  | "brand"
  | "stock";

export type AbcSliceDef = {
  id: AbcSliceId;
  /** Группировка для `GET /main/analytics/market/?tab=abc`. Нет — срез по каталогу. */
  by?: "product" | "category" | "brand";
  metric?: "revenue" | "qty" | "profit";
  /** Мера: деньги (сом) или штуки. */
  unit: "som" | "qty";
  /** Товары без закупочной цены в срез не входят. */
  needsCost?: boolean;
  /** Срез — снимок на сейчас, от периода не зависит. */
  snapshot?: boolean;
  /** Строка ведёт на карточку товара (`/crm/sklad/:id`). */
  linksToProduct?: boolean;
};

export const ABC_SLICES: AbcSliceDef[] = [
  { id: "productRevenue", by: "product", metric: "revenue", unit: "som", linksToProduct: true },
  { id: "productProfit", by: "product", metric: "profit", unit: "som", needsCost: true, linksToProduct: true },
  { id: "productQty", by: "product", metric: "qty", unit: "qty", linksToProduct: true },
  { id: "category", by: "category", metric: "revenue", unit: "som" },
  { id: "brand", by: "brand", metric: "revenue", unit: "som" },
  { id: "stock", unit: "som", needsCost: true, snapshot: true, linksToProduct: true },
];

export const getAbcSlice = (id: AbcSliceId): AbcSliceDef =>
  ABC_SLICES.find((s) => s.id === id) ?? ABC_SLICES[0];
