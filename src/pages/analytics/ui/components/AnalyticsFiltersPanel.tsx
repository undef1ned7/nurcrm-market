import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchSaleConsultants, type SaleConsultant } from "@entities/sale";
import { formatDateForAPI } from "../analytics.utils";

export function AnalyticsFiltersPanel({ vm }: any) {
  const {
    showFilters,
    setShowFilters,
    activeTab,
    period,
    setPeriod,
    filters,
    updateFilter,
    resetFilters,
    fetchAnalytics,
    branches,
    currentUser,
    mainCashboxTitle,
  } = vm;
  const [consultants, setConsultants] = useState<SaleConsultant[]>([]);

  useEffect(() => {
    if (!showFilters) return undefined;
    let cancelled = false;
    fetchSaleConsultants()
      .then((list) => {
        if (!cancelled) setConsultants(list);
      })
      .catch(() => {
        if (!cancelled) setConsultants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showFilters]);

  const showPeopleFilters =
    activeTab === "sales" ||
    activeTab === "cashiers" ||
    activeTab === "users" ||
    activeTab === "finance";

  return (
    <>
      {showFilters && (
        <div className="analytics-page__filters">
          <div className="analytics-page__filters-header">
            <h3>Фильтры</h3>
            <button
              className="analytics-page__filters-close"
              onClick={() => setShowFilters(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="analytics-page__filters-content">
            {/* Период */}
            <div className="analytics-page__filter-group analytics-page__filter-group--period">
              <label>Период</label>
              <div className="analytics-page__filter-row">
                <input
                  type="datetime-local"
                  value={formatDateForAPI(period.from, true).slice(0, 16)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (Number.isNaN(date.getTime())) return;
                    setPeriod((prev) => ({ ...prev, from: date }));
                  }}
                />
                <span>—</span>
                <input
                  type="datetime-local"
                  value={formatDateForAPI(period.to, true).slice(0, 16)}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (Number.isNaN(date.getTime())) return;
                    date.setSeconds(59, 999);
                    setPeriod((prev) => ({ ...prev, to: date }));
                  }}
                />
              </div>
            </div>

            {showPeopleFilters && (
              <>
                <div className="analytics-page__filter-group">
                  <label>Кассир</label>
                  <select
                    value={filters.cashier}
                    onChange={(e) => updateFilter("cashier", e.target.value)}
                  >
                    <option value="">Все</option>
                    {consultants.map((item) => (
                      <option key={`cashier-${item.id}`} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="analytics-page__filter-group">
                  <label>Консультант</label>
                  <select
                    value={filters.consultant}
                    onChange={(e) =>
                      updateFilter("consultant", e.target.value)
                    }
                  >
                    <option value="">Все</option>
                    {consultants.map((item) => (
                      <option key={`consultant-${item.id}`} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Фильтры для Sales и Cashiers */}
            {(activeTab === "sales" ||
              activeTab === "cashiers" ||
              activeTab === "suppliers" ||
              activeTab === "purchases") && (
              <>
                <div className="analytics-page__filter-group">
                  <label>Способ оплаты</label>
                  <select
                    value={filters.payment_method}
                    onChange={(e) =>
                      updateFilter("payment_method", e.target.value)
                    }
                  >
                    <option value="">Все способы</option>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Безналичные</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>Сумма от</label>
                  <input
                    type="number"
                    value={filters.min_total}
                    onChange={(e) => updateFilter("min_total", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="analytics-page__filter-group">
                  <label>Сумма до</label>
                  <input
                    type="number"
                    value={filters.max_total}
                    onChange={(e) => updateFilter("max_total", e.target.value)}
                    placeholder="0"
                  />
                </div>

                {(activeTab === "suppliers" || activeTab === "purchases") && (
                  <>
                    <div className="analytics-page__filter-group">
                      <label>Дата закупки от</label>
                      <input
                        type="date"
                        value={filters.purchase_date_from}
                        onChange={(e) =>
                          updateFilter("purchase_date_from", e.target.value)
                        }
                      />
                    </div>

                    <div className="analytics-page__filter-group">
                      <label>Дата закупки до</label>
                      <input
                        type="date"
                        value={filters.purchase_date_to}
                        onChange={(e) =>
                          updateFilter("purchase_date_to", e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Филиал (только для owner/admin) - показываем после основных фильтров */}
            {(currentUser?.role === "owner" ||
              currentUser?.role === "admin") && (
              <div className="analytics-page__filter-group">
                <label>Филиал</label>
                <select
                  value={filters.branch}
                  onChange={(e) => updateFilter("branch", e.target.value)}
                >
                  <option value="">Все филиалы</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {filters.branch && (
                  <label className="analytics-page__filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.include_global}
                      onChange={(e) =>
                        updateFilter("include_global", e.target.checked)
                      }
                    />
                    Включить глобальные записи
                  </label>
                )}
              </div>
            )}

            {/* Фильтры для Warehouse */}
            {activeTab === "warehouse" && (
              <>
                <div className="analytics-page__filter-group">
                  <label>Тип товара</label>
                  <select
                    value={filters.kind}
                    onChange={(e) => updateFilter("kind", e.target.value)}
                  >
                    <option value="">Все типы</option>
                    <option value="product">Товар</option>
                    <option value="service">Услуга</option>
                    <option value="bundle">Комплект</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group analytics-page__filter-group--checkbox">
                  <span className="analytics-page__filter-group-label">Остаток</span>
                  <label className="analytics-page__filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.low_only}
                      onChange={(e) =>
                        updateFilter("low_only", e.target.checked)
                      }
                    />
                    Только товары с низким остатком
                  </label>
                </div>
              </>
            )}

            {/* Лимит записей для детальных вкладок */}
            {(activeTab === "products" ||
              activeTab === "suppliers" ||
              activeTab === "purchases" ||
              activeTab === "users" ||
              activeTab === "finance") && (
              <div className="analytics-page__filter-group">
                <label>Лимит записей</label>
                <input
                  type="number"
                  min="1"
                  value={filters.limit}
                  onChange={(e) => updateFilter("limit", e.target.value)}
                  placeholder="Без лимита"
                />
              </div>
            )}

            {/* Фильтры для Shifts */}
            {activeTab === "shifts" && (
              <>
                <div className="analytics-page__filter-group">
                  <label>Статус</label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                  >
                    <option value="">Все статусы</option>
                    <option value="open">Открыта</option>
                    <option value="closed">Закрыта</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>Касса</label>
                  <input value={mainCashboxTitle} disabled readOnly />
                </div>
              </>
            )}

            <div className="analytics-page__filters-actions">
              <button
                className="analytics-page__filter-reset"
                onClick={resetFilters}
              >
                Сбросить
              </button>
              <button
                className="analytics-page__filter-apply"
                onClick={() => {
                  fetchAnalytics(activeTab);
                  setShowFilters(false);
                }}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
