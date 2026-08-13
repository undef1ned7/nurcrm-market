import type {
  AnalysisDays,
  CoverageDays,
  ProcurementRecommendationSettings,
  SafetyDays,
} from "./types";

export const ANALYSIS_DAY_OPTIONS: AnalysisDays[] = [7, 14, 30];
export const COVERAGE_DAY_OPTIONS: CoverageDays[] = [3, 7, 14];
export const SAFETY_DAY_OPTIONS: SafetyDays[] = [0, 1, 2, 3];

export const DEFAULT_RECOMMENDATION_SETTINGS: ProcurementRecommendationSettings =
  {
    analysisDays: 30,
    coverageDays: 7,
    safetyDays: 2,
  };

export const SETTINGS_STORAGE_KEY =
  "nur-market.procurement-recommendations.settings";

export const CRITICAL_DAYS_OF_STOCK = 2;
export const ENDING_DAYS_OF_STOCK = 4;

export const WEIGHT_QTY_DECIMALS = 3;

export const RECOMMENDATIONS_API_PATH = (supplierId: string) =>
  `/main/suppliers/${encodeURIComponent(supplierId)}/recommendations/`;

export const SUPPLIER_PRODUCTS_API_PATH = (supplierId: string) =>
  `/main/suppliers/${encodeURIComponent(supplierId)}/products/`;

export const SUPPLIERS_API_PATH = "/main/clients/";
