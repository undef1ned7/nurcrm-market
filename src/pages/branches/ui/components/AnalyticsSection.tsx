import {
  FaCalendarAlt,
  FaCashRegister,
  FaShoppingCart,
  FaWarehouse,
} from "react-icons/fa";
import { formatCurrency } from "../branchDetails.utils";
import type { AnalyticsData } from "../branchDetails.types";

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
  return (
    <div className="branch-details__section">
      <div className="branch-details__section-header">
        <h2 className="branch-details__section-title">Аналитика</h2>
        <div className="branch-details__date-filters">
          <div className="branch-details__date-filter">
            <FaCalendarAlt />
            <label>От:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="branch-details__date-input"
            />
          </div>
          <div className="branch-details__date-filter">
            <FaCalendarAlt />
            <label>До:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="branch-details__date-input"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              className="branch-details__clear-filter"
              onClick={onClearFilters}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>
      {!analyticsData ? (
        <p className="branch-details__empty">Нет данных аналитики</p>
      ) : (
        <div className="branch-details__analytics">
          <div className="branch-details__analytics-card">
            <h3>
              <FaCashRegister /> Касса
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">Доходы</span>
                <span className="branch-details__analytics-value branch-details__analytics-value--positive">
                  {formatCurrency(analyticsData.kassa.income)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">Расходы</span>
                <span className="branch-details__analytics-value branch-details__analytics-value--negative">
                  {formatCurrency(analyticsData.kassa.expense)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">Баланс</span>
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
                <span className="branch-details__analytics-label">Операций</span>
                <span className="branch-details__analytics-value">
                  {analyticsData.kassa.operationsCount}
                </span>
              </div>
            </div>
          </div>

          <div className="branch-details__analytics-card">
            <h3>
              <FaShoppingCart /> Продажи
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Общая сумма
                </span>
                <span className="branch-details__analytics-value branch-details__analytics-value--positive">
                  {formatCurrency(analyticsData.sales.total)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Количество продаж
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.sales.count}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Средний чек
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.sales.average)}
                </span>
              </div>
            </div>
            {Object.keys(analyticsData.sales.byStatus).length > 0 && (
              <div className="branch-details__analytics-status">
                <h4>По статусам:</h4>
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
              <FaWarehouse /> Склад
            </h3>
            <div className="branch-details__analytics-grid">
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Общая стоимость
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.warehouse.totalValue)}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Общее количество
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.warehouse.totalQuantity}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Количество позиций
                </span>
                <span className="branch-details__analytics-value">
                  {analyticsData.warehouse.itemsCount}
                </span>
              </div>
              <div className="branch-details__analytics-item">
                <span className="branch-details__analytics-label">
                  Средняя цена
                </span>
                <span className="branch-details__analytics-value">
                  {formatCurrency(analyticsData.warehouse.averagePrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
