
export type SectorIconName =
  | "listCheck"
  | "building"
  | "tags"
  | "filePerson"
  | "calendar"
  | "clipboard"
  | "chartBar"
  | "user"
  | "comments"
  | "cashRegister"
  | "chalkboard"
  | "moneyBill"
  | "shoppingCart"
  | "cogs"
  | "boxOpen"
  | "chartLine"
  | "exchangeAlt"
  | "truckLoading"
  | "trashAlt"
  | "layers"
  | "warehouse"
  | "cut"
  | "userTie"
  | "bed"
  | "book"
  | "checkSquare";

export type BaseTabIconKey =
  | "cashRegister"
  | "warehouse"
  | "shoppingCart"
  | "chartLine"
  | "users"
  | "userFriends";

export type BranchTab = {
  id: string;
  label: string;
  icon: unknown;
  route?: string;
};

export type AnalyticsKassa = {
  income: number;
  expense: number;
  balance: number;
  operationsCount: number;
};

export type AnalyticsSales = {
  total: number;
  count: number;
  average: number;
  byStatus: Record<string, number>;
};

export type AnalyticsWarehouse = {
  totalValue: number;
  totalQuantity: number;
  itemsCount: number;
  averagePrice: number;
};

export type AnalyticsData = {
  kassa: AnalyticsKassa;
  sales: AnalyticsSales;
  warehouse: AnalyticsWarehouse;
};
