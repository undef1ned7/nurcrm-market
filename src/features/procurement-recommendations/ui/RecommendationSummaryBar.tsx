import { formatMoney } from "../lib/formatRecommendation";
import type { ProcurementRecommendationsVm } from "../model/useProcurementRecommendations";

type Props = {
  vm: ProcurementRecommendationsVm;
};

export function RecommendationSummaryBar({ vm }: Props) {
  const { summary, selectedSupplierId } = vm;
  if (!selectedSupplierId) return null;

  return (
    <div className="procurement-recommendations__summary">
      <div className="procurement-recommendations__summary-item">
        <span>Товаров поставщика</span>
        <strong>{summary.productsCount}</strong>
      </div>
      <div className="procurement-recommendations__summary-item">
        <span>Нужно заказать</span>
        <strong>{summary.recommendedProductsCount}</strong>
      </div>
      <div className="procurement-recommendations__summary-item">
        <span>Критический остаток</span>
        <strong>{summary.criticalProductsCount}</strong>
      </div>
      {summary.estimatedTotal != null ? (
        <div className="procurement-recommendations__summary-item">
          <span>Предварительная сумма</span>
          <strong>{formatMoney(summary.estimatedTotal)}</strong>
        </div>
      ) : null}
    </div>
  );
}
