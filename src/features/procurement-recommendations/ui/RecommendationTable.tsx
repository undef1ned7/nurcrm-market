import { Info } from "lucide-react";
import { StatusChip } from "@shared/ui/page-shell";
import { RecommendationExplanation } from "./RecommendationExplanation";
import {
  compactDate,
  formatDaysOfStock,
  formatLastPurchase,
  formatMoney,
  formatQty,
  formatTrend,
  formatUnit,
  trendTone,
} from "../lib/formatRecommendation";
import { stockStatusLabel, stockStatusTone } from "../lib/stockStatus";
import type { CalculatedRecommendationRow } from "../model/types";
import type { ProcurementRecommendationsVm } from "../model/useProcurementRecommendations";

type Props = {
  vm: ProcurementRecommendationsVm;
};

function ProductCell({ row }: { row: CalculatedRecommendationRow }) {
  return (
    <div className="procurement-recommendations__product">
      <strong>{row.productName}</strong>
      <span>
        {[row.barcode, row.article || row.code].filter(Boolean).join(" · ") ||
          formatUnit(row.unit)}
      </span>
    </div>
  );
}

export function RecommendationTable({ vm }: Props) {
  const {
    visibleRows,
    orderQtyById,
    handleQtyChange,
    explanationId,
    setExplanationId,
  } = vm;

  return (
    <div className="procurement-recommendations__table-wrap">
      <table className="procurement-recommendations__table">
        <thead>
          <tr>
            <th>Товар</th>
            <th className="is-num">Остаток</th>
            <th className="is-num is-secondary">Продажи 7 дн.</th>
            <th className="is-num is-secondary">Продажи 30 дн.</th>
            <th className="is-num is-secondary">Ср./день</th>
            <th className="is-num">Запаса на</th>
            <th className="is-secondary">Последняя закупка</th>
            <th>Статус</th>
            <th className="is-num">Рекомендация</th>
            <th className="is-num">Заказать</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const unit = formatUnit(row.unit);
            const open = explanationId === row.productId;
            const trendClass = `procurement-recommendations__trend is-${trendTone(row.salesTrendPercent)}`;
            return (
              <tr key={row.productId}>
                <td>
                  <ProductCell row={row} />
                  <span className={trendClass}>
                    {formatTrend(row.salesTrendPercent, row.salesAnalysisPeriod)}
                  </span>
                </td>
                <td className="is-num">
                  {formatQty(row.currentStock, row.isWeight)} {unit}
                </td>
                <td className="is-num is-secondary">
                  {formatQty(row.sales7d, row.isWeight)}
                </td>
                <td className="is-num is-secondary">
                  {formatQty(row.sales30d, row.isWeight)}
                </td>
                <td className="is-num is-secondary">
                  {formatQty(row.averageDailySales, true)}
                </td>
                <td className="is-num">{formatDaysOfStock(row.daysOfStock)}</td>
                <td
                  className="is-secondary"
                  title={
                    row.lastPurchase?.purchasePrice != null
                      ? `Последняя закупка: ${formatQty(row.lastPurchase.quantity, row.isWeight)} ${unit} по ${formatMoney(row.lastPurchase.purchasePrice)}`
                      : formatLastPurchase({
                          date: row.lastPurchase?.date,
                          quantity: row.lastPurchase?.quantity,
                          unit,
                          isWeight: row.isWeight,
                        })
                  }
                >
                  {row.lastPurchase
                    ? `${compactDate(row.lastPurchase.date)} · ${formatQty(row.lastPurchase.quantity, row.isWeight)} ${unit}`
                    : "—"}
                </td>
                <td>
                  <StatusChip tone={stockStatusTone(row.stockStatus)}>
                    {stockStatusLabel(row.stockStatus)}
                  </StatusChip>
                </td>
                <td className="is-num">
                  <div className="procurement-recommendations__recommend">
                    <span>
                      {formatQty(row.recommendedQty, row.isWeight)} {unit}
                    </span>
                    <button
                      type="button"
                      className="procurement-recommendations__info"
                      aria-expanded={open}
                      aria-label="Почему такая рекомендация"
                      onClick={() =>
                        setExplanationId(open ? null : row.productId)
                      }
                    >
                      <Info size={16} />
                    </button>
                  </div>
                  {open ? <RecommendationExplanation row={row} /> : null}
                </td>
                <td className="is-num">
                  <input
                    className="nur-input procurement-recommendations__qty"
                    type="text"
                    inputMode="decimal"
                    value={orderQtyById[row.productId] ?? ""}
                    onChange={(e) =>
                      handleQtyChange(row.productId, e.target.value, row.isWeight)
                    }
                    placeholder="0"
                    aria-label={`Заказать ${row.productName}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
