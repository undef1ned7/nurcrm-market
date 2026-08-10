import { CalendarDays, Pencil, ReceiptText } from "lucide-react";

import { kindLabel } from "../clientDetails.helpers";
import type { DealRecord } from "../clientDetails.types";
import { getDealDateISO, getDebtProgress } from "../clientDetails.utils";

export interface DealsSectionProps {
  filteredDeals: DealRecord[];
  dealsLoading: boolean;
  dealsErr?: string | null;
  onDealClick: (deal: DealRecord) => void;
  onEditDeal: (deal: DealRecord) => void;
}

export function DealsSection({
  filteredDeals,
  dealsLoading,
  dealsErr,
  onDealClick,
  onEditDeal,
}: DealsSectionProps) {
  return (
    <div className="cdx__deals">
      <div className="cdx__deals-head">
        <h3 className="cdx__deals-title">
          <ReceiptText /> Сделки
        </h3>
        <span className="cdx__deals-count">{filteredDeals.length}</span>
      </div>

      <div className="cdx__deals-body">
        {dealsLoading && <div className="cdx__state">Загрузка…</div>}
        {dealsErr && <div className="cdx__alert">{dealsErr}</div>}
        {!dealsLoading && !dealsErr && filteredDeals.length === 0 && (
          <div className="cdx__state">Сделок нет</div>
        )}

        {filteredDeals.map((deal) => {
          const isDebt = deal.kind === "debt";
          const debtProgress = isDebt ? getDebtProgress(deal) : null;
          const debtStatusLabel =
            isDebt && Number(deal.prepayment || 0) !== 0
              ? "Предоплата"
              : "Долг";
          const dealDate = getDealDateISO(deal);

          return (
            <div
              key={deal.id}
              onClick={() => {
                if (deal.kind === "debt") onDealClick(deal);
              }}
              className={`cdx__deal${
                isDebt ? " cdx__deal--clickable" : ""
              }`}
            >
              <div className="cdx__deal-main">
                <span className="cdx__deal-name">{deal.title}</span>
                <div className="cdx__deal-meta">
                  {isDebt ? (
                    <span className="cdx__badge cdx__badge--debt">
                      {debtStatusLabel}
                    </span>
                  ) : (
                    <span className="cdx__badge cdx__badge--neutral">
                      {kindLabel(deal.kind)}
                    </span>
                  )}
                  {dealDate && (
                    <span className="cdx__deal-meta-item">
                      <CalendarDays />
                      {dealDate}
                    </span>
                  )}
                  <span className="cdx__deal-meta-item">Нет задач</span>
                </div>
              </div>

              <div className="cdx__deal-money">
                <div className="cdx__deal-amount">
                  {Number(deal.amount || 0).toFixed(2)}
                  <span className="cdx__deal-amount-cur">сом</span>
                </div>
                {isDebt && (
                  <div className="cdx__deal-remaining">
                    Остаток: {Number(deal.remaining_debt || 0).toFixed(2)} сом
                  </div>
                )}
              </div>

              <div className="cdx__progress">
                {isDebt ? (
                  <>
                    <div className="cdx__progress-top">
                      <span className="cdx__progress-label">
                        Оплачено {debtProgress!.paid.toFixed(2)} из{" "}
                        {debtProgress!.total.toFixed(2)}
                      </span>
                      <span className="cdx__progress-pct">
                        {debtProgress!.percent}%
                      </span>
                    </div>
                    <div className="cdx__progress-track">
                      <div
                        className="cdx__progress-fill"
                        style={{
                          width: `${debtProgress!.percent}%`,
                          backgroundColor: debtProgress!.fill,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <span className="cdx__deal-meta-item">
                    {kindLabel(deal.kind)}
                  </span>
                )}
              </div>

              <div
                className="cdx__deal-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onEditDeal(deal)}
                  className="cdx__btn cdx__btn--secondary"
                >
                  <Pencil /> Редактировать
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
