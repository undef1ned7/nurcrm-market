import { useState } from "react";
import { CalendarDays, Pencil, Receipt, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { DealRecord } from "../clientDetails.types";
import { getDealDateISO, getDebtProgress } from "../clientDetails.utils";
import { resolveDealSaleId } from "../clientDetails.helpers";
import ReceiptPreviewModal from "@pages/documents/ui/components/ReceiptPreviewModal";

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
  const { t } = useTranslation();
  const [previewSaleId, setPreviewSaleId] = useState<string | number | null>(
    null,
  );
  const kindLabel = (kind: unknown) => {
    const map: Record<string, string> = {
      sale: t("crm.clients.details.sale"),
      debt: t("crm.clients.details.debt"),
      prepayment: t("crm.clients.details.prepayment"),
      amount: t("common.amount"),
    };
    return map[String(kind || "")] || String(kind || "") || "—";
  };
  return (
    <div className="cdx__deals">
      <div className="cdx__deals-head">
        <h3 className="cdx__deals-title">
          <ReceiptText /> {t("crm.clients.details.dealsTitle")}
        </h3>
        <span className="cdx__deals-count">{filteredDeals.length}</span>
      </div>

      <div className="cdx__deals-body">
        {dealsLoading && (
          <div className="cdx__state">{t("common.loading")}</div>
        )}
        {dealsErr && <div className="cdx__alert">{dealsErr}</div>}
        {!dealsLoading && !dealsErr && filteredDeals.length === 0 && (
          <div className="cdx__state">{t("crm.clients.details.noDeals")}</div>
        )}

        {filteredDeals.map((deal) => {
          const isDebt = deal.kind === "debt";
          const debtProgress = isDebt ? getDebtProgress(deal) : null;
          const debtStatusLabel =
            isDebt && Number(deal.prepayment || 0) !== 0
              ? t("crm.clients.details.prepayment")
              : t("crm.clients.details.debt");
          const dealDate = getDealDateISO(deal);
          const saleId = resolveDealSaleId(deal);

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
                  {isDebt ? (
                    saleId ? (
                      <button
                        type="button"
                        className="cdx__deal-meta-item cdx__deal-meta-item--link"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewSaleId(saleId);
                        }}
                        title={t("crm.clients.details.viewReceiptHint")}
                      >
                        <Receipt size={14} />
                        {t("crm.clients.details.receiptNumber", {
                          id: saleId,
                        })}
                      </button>
                    ) : (
                      <span className="cdx__deal-meta-item cdx__deal-meta-item--muted">
                        {t("crm.clients.details.noLinkedReceipt")}
                      </span>
                    )
                  ) : (
                    <span className="cdx__deal-meta-item">
                      {t("crm.clients.details.noTasks")}
                    </span>
                  )}
                </div>
              </div>

              <div className="cdx__deal-money">
                <div className="cdx__deal-amount">
                  {Number(deal.amount || 0).toFixed(2)}
                  <span className="cdx__deal-amount-cur">
                    {t("common.currencySom")}
                  </span>
                </div>
                {isDebt && (
                  <div className="cdx__deal-remaining">
                    {t("crm.clients.details.remainderLabel")}:{" "}
                    {Number(deal.remaining_debt || 0).toFixed(2)}{" "}
                    {t("common.currencySom")}
                  </div>
                )}
              </div>

              <div className="cdx__progress">
                {isDebt ? (
                  <>
                    <div className="cdx__progress-top">
                      <span className="cdx__progress-label">
                        {t("crm.clients.details.paidOf", {
                          paid: debtProgress!.paid.toFixed(2),
                          total: debtProgress!.total.toFixed(2),
                        })}
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
                  <Pencil /> {t("common.edit")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewSaleId != null && (
        <ReceiptPreviewModal
          receiptId={previewSaleId}
          receiptData={undefined}
          onClose={() => setPreviewSaleId(null)}
          onEdit={undefined}
        />
      )}
    </div>
  );
}
