export type AnalysisDays = 7 | 14 | 30;
export type CoverageDays = 3 | 7 | 14;
export type SafetyDays = 0 | 1 | 2 | 3;

export type ProcurementRecommendationSettings = {
  analysisDays: AnalysisDays;
  coverageDays: CoverageDays;
  safetyDays: SafetyDays;
};

export type StockStatus = "critical" | "ending" | "low" | "ok";

export type RecommendationFilter = "all" | "required" | "critical";

export type LastPurchase = {
  date: string;
  quantity: number;
  purchasePrice?: number | null;
};

export type RecommendationExplanation = {
  averageDailySales: number;
  daysOfStock: number | null;
  coverageDays: number;
  safetyDays: number;
  requiredStock: number;
  currentStock: number;
  rawRecommendedQty: number;
  recommendedQty: number;
  packSize: number | null;
  roundedToPack: boolean;
  isWeight: boolean;
  unit: string;
};

export type ProcurementRecommendationItem = {
  productId: string;
  productName: string;
  barcode?: string;
  article?: string;
  code?: string;
  unit: string;
  isWeight: boolean;
  currentStock: number;
  sales7d: number;
  sales14d: number;
  sales30d: number;
  previous7d: number;
  previous14d: number;
  previous30d: number;
  purchasePrice?: number | null;
  packSize?: number | null;
  lastPurchase?: LastPurchase | null;
};

export type CalculatedRecommendationRow = ProcurementRecommendationItem & {
  salesAnalysisPeriod: number;
  previousPeriodSales: number;
  averageDailySales: number;
  salesTrendPercent: number | null;
  daysOfStock: number | null;
  stockStatus: StockStatus;
  recommendedQty: number;
  explanation: RecommendationExplanation;
};

export type ProcurementRecommendationSummary = {
  productsCount: number;
  recommendedProductsCount: number;
  criticalProductsCount: number;
  estimatedTotal: number | null;
};

export type RecommendationDataSource = "backend" | "composed";

export type ProcurementRecommendationPayload = {
  supplier: { id: string; name: string };
  source: RecommendationDataSource;
  items: ProcurementRecommendationItem[];
};

export type ProcurementReceiptDraftItem = {
  productId: string;
  qty: number;
  purchasePrice?: number | null;
};

export type ProcurementReceiptDraft = {
  supplierId: string;
  items: ProcurementReceiptDraftItem[];
};

export type RecommendationEmptyKind =
  | "no-supplier"
  | "no-products"
  | "no-matches"
  | "none-required";
