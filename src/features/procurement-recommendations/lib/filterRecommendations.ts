import type {
  CalculatedRecommendationRow,
  RecommendationEmptyKind,
  RecommendationFilter,
} from "../model/types";
import { matchesSearch, statusSortRank } from "./formatRecommendation";

export function filterRecommendationRows(
  rows: CalculatedRecommendationRow[],
  {
    search,
    filter,
  }: {
    search: string;
    filter: RecommendationFilter;
  },
): CalculatedRecommendationRow[] {
  return rows
    .filter((row) => matchesSearch(row, search))
    .filter((row) => {
      if (filter === "required") return row.recommendedQty > 0;
      if (filter === "critical") return row.stockStatus === "critical";
      return true;
    })
    .sort((a, b) => {
      const byStatus = statusSortRank(a.stockStatus) - statusSortRank(b.stockStatus);
      if (byStatus !== 0) return byStatus;
      if (b.recommendedQty !== a.recommendedQty) {
        return b.recommendedQty - a.recommendedQty;
      }
      return a.productName.localeCompare(b.productName, "ru");
    });
}

export function resolveRecommendationsEmptyKind({
  supplierId,
  loadedCount,
  visibleCount,
  filter,
  search,
}: {
  supplierId: string;
  loadedCount: number;
  visibleCount: number;
  filter: RecommendationFilter;
  search: string;
}): RecommendationEmptyKind | null {
  if (!supplierId) return "no-supplier";
  if (loadedCount === 0) return "no-products";
  if (visibleCount > 0) return null;
  if (search.trim()) return "no-matches";
  if (filter === "required" || filter === "critical") return "none-required";
  return "no-matches";
}
