import type { RecommendationExplanation } from "../model/types";
import { formatQty, formatUnit } from "./formatRecommendation";

export function buildExplanationLines(
  explanation: RecommendationExplanation,
): string[] {
  const unit = formatUnit(explanation.unit);
  const lines = [
    `В среднем продаётся ${formatQty(explanation.averageDailySales, explanation.isWeight)} ${unit}/день.`,
  ];

  if (explanation.daysOfStock == null) {
    lines.push("По выбранному периоду продаж нет — запас в днях не рассчитывается.");
  } else {
    lines.push(
      `Текущего остатка хватит примерно на ${formatQty(explanation.daysOfStock, true)} дня.`,
    );
  }

  const horizon = explanation.coverageDays + explanation.safetyDays;
  const safetyPart =
    explanation.safetyDays > 0
      ? ` (включая страховой запас ${explanation.safetyDays} дн.)`
      : "";
  lines.push(
    `Для запаса на ${horizon} дн.${safetyPart} требуется ${formatQty(explanation.requiredStock, explanation.isWeight)} ${unit}.`,
  );
  lines.push(
    `Текущий остаток: ${formatQty(explanation.currentStock, explanation.isWeight)} ${unit}.`,
  );

  if (explanation.roundedToPack && explanation.packSize) {
    lines.push(
      `Расчёт без упаковки: ${formatQty(explanation.rawRecommendedQty, explanation.isWeight)} ${unit}.`,
    );
    lines.push(
      `Округлено до упаковки (${formatQty(explanation.packSize, false)} ${unit}): ${formatQty(explanation.recommendedQty, explanation.isWeight)} ${unit}.`,
    );
  } else {
    lines.push(
      `Рекомендуемый заказ: ${formatQty(explanation.recommendedQty, explanation.isWeight)} ${unit}.`,
    );
  }

  return lines;
}
