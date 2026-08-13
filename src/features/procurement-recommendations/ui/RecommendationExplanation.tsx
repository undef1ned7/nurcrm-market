import { buildExplanationLines } from "../lib/explainRecommendation";
import { formatMoney, formatQty, formatUnit } from "../lib/formatRecommendation";
import type { CalculatedRecommendationRow } from "../model/types";

type Props = {
  row: CalculatedRecommendationRow;
};

export function RecommendationExplanation({ row }: Props) {
  const lines = buildExplanationLines(row.explanation);
  const last = row.lastPurchase;

  return (
    <div className="procurement-recommendations__explain">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {last ? (
        <p>
          Последняя закупка: {formatQty(last.quantity, row.isWeight)}{" "}
          {formatUnit(row.unit)}
          {last.purchasePrice != null
            ? ` по ${formatMoney(last.purchasePrice)}`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
