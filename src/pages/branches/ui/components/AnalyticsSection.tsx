import { useTranslation } from "react-i18next";
import {
  FaCalendarAlt,
  FaCashRegister,
  FaTimes,
  FaShoppingCart,
  FaWarehouse,
} from "react-icons/fa";
import { formatCurrency } from "../branchDetails.utils";
import type { AnalyticsData } from "../branchDetails.types";
import { BranchSection } from "./BranchSection";

type AnalyticsSectionProps = {
  analyticsData: AnalyticsData;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
};

export default function AnalyticsSection({
  analyticsData,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: AnalyticsSectionProps) {
  const { t } = useTranslation();
  return (
    <BranchSection
      title={t("crm.branches.details.analytics.title")}
      actions={
        <div className="bd-range">
          <FaCalendarAlt aria-hidden="true" />
          <span>{t("crm.branches.details.analytics.from")}</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label={t("crm.branches.details.analytics.fromAria")}
          />
          <span>{t("crm.branches.details.analytics.to")}</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label={t("crm.branches.details.analytics.toAria")}
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              className="bd-range__reset"
              onClick={onClearFilters}
              aria-label={t("crm.branches.details.analytics.resetPeriod")}
              title={t("crm.branches.details.analytics.resetPeriod")}
            >
              <FaTimes />
            </button>
          )}
        </div>
      }
    >
      {!analyticsData ? (
        <p className="branch-details__empty">{t("crm.branches.details.analytics.empty")}</p>
      ) : (
        <div className="branch-details__analytics">
          <div className="branch-details__analytics-card">
            <h3>
              <FaCashRegister /> {t("crm.branches.details.analytics.kassa")}
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">{t("crm.branches.details.analytics.income")}</span>
                <span className="branch-details__analytics-value branch-details__analytics-value--positive">
                  {formatCurrency(analyticsData.kassa.income)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">{t("crm.branches.details.analytics.expense")}</span>
                <span className="branch-details__analytics-value branch-details__analytics-value--negative">
                  {formatCurrency(analyticsData.kassa.expense)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">{t("crm.branches.details.analytics.balance")}</span>
                <span
                  className={`branch-details__analytics-value ${
                    analyticsData.kassa.balance >= 0
                      ? "branch-details__analytics-value--positive"
                      : "branch-details__analytics-value--negative"
                  }`}
                >
                  {formatCurrency(analyticsData.kassa.balance)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">{t("crm.branches.details.analytics.operations")}</span>
                <span className="branch-details__analytics-value">
                  {analyticsData.kassa.operationsCount}
                </span>
              </div>
            </div>
          </div>

          <div className="branch-details__analytics-card">
            <h3>
              <FaShoppingCart /> {t("crm.branches.details.analytics.sales")}
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.salesTotal")}
                </span>
                <span className="branch-details__analytics-value branch-details__analytics-value--positive">
                  {formatCurrency(analyticsData.sales.total)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.salesCount")}
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.sales.count}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.averageCheck")}
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.sales.average)}
                </span>
              </div>
            </div>
            {Object.keys(analyticsData.sales.byStatus).length > 0 && (
              <div className="branch-details__analytics-status">
                <h4>{t("crm.branches.details.analytics.byStatus")}</h4>
                <div className="branch-details__analytics-status-grid">
                  {Object.entries(analyticsData.sales.byStatus).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className="branch-details__analytics-status-item"
                      >
                        <span className="branch-details__analytics-status-label">
                          {status}
                        </span>
                        <span className="branch-details__analytics-status-value">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="branch-details__analytics-card">
            <h3>
              <FaWarehouse /> {t("crm.branches.details.analytics.warehouse")}
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.totalValue")}
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.warehouse.totalValue)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.totalQuantity")}
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.warehouse.totalQuantity}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.itemsCount")}
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.warehouse.itemsCount}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  {t("crm.branches.details.analytics.averagePrice")}
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.warehouse.averagePrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </BranchSection>
  );
}
