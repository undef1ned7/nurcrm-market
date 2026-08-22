import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchSaleConsultants, type SaleConsultant } from "@entities/sale";
import { formatDateForAPI } from "../analytics.utils";

export function AnalyticsFiltersPanel({ vm }: any) {
  const { t } = useTranslation();
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
  const ff = "crm.analytics.filterFields";

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
            <h3>{t("crm.analytics.filters")}</h3>
            <button
              className="analytics-page__filters-close"
              onClick={() => setShowFilters(false)}
              aria-label={t("common.close")}
            >
              <X size={20} />
            </button>
          </div>

          <div className="analytics-page__filters-content">
            <div className="analytics-page__filter-group analytics-page__filter-group--period">
              <label>{t(`${ff}.period`)}</label>
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
                  <label>{t(`${ff}.cashier`)}</label>
                  <select
                    value={filters.cashier}
                    onChange={(e) => updateFilter("cashier", e.target.value)}
                  >
                    <option value="">{t(`${ff}.all`)}</option>
                    {consultants.map((item) => (
                      <option key={`cashier-${item.id}`} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.consultant`)}</label>
                  <select
                    value={filters.consultant}
                    onChange={(e) =>
                      updateFilter("consultant", e.target.value)
                    }
                  >
                    <option value="">{t(`${ff}.all`)}</option>
                    {consultants.map((item) => (
                      <option key={`consultant-${item.id}`} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(activeTab === "sales" ||
              activeTab === "cashiers" ||
              activeTab === "suppliers" ||
              activeTab === "purchases") && (
              <>
                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.paymentMethod`)}</label>
                  <select
                    value={filters.payment_method}
                    onChange={(e) =>
                      updateFilter("payment_method", e.target.value)
                    }
                  >
                    <option value="">{t(`${ff}.allMethods`)}</option>
                    <option value="cash">{t("crm.analytics.sales.cash")}</option>
                    <option value="transfer">{t("crm.analytics.cashiers.transfer")}</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.amountFrom`)}</label>
                  <input
                    type="number"
                    value={filters.min_total}
                    onChange={(e) => updateFilter("min_total", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.amountTo`)}</label>
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
                      <label>{t(`${ff}.purchaseDateFrom`)}</label>
                      <input
                        type="date"
                        value={filters.purchase_date_from}
                        onChange={(e) =>
                          updateFilter("purchase_date_from", e.target.value)
                        }
                      />
                    </div>

                    <div className="analytics-page__filter-group">
                      <label>{t(`${ff}.purchaseDateTo`)}</label>
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

            {(currentUser?.role === "owner" ||
              currentUser?.role === "admin") && (
              <div className="analytics-page__filter-group">
                <label>{t(`${ff}.branch`)}</label>
                <select
                  value={filters.branch}
                  onChange={(e) => updateFilter("branch", e.target.value)}
                >
                  <option value="">{t(`${ff}.allBranches`)}</option>
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
                    {t(`${ff}.includeGlobal`)}
                  </label>
                )}
              </div>
            )}

            {activeTab === "warehouse" && (
              <>
                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.productKind`)}</label>
                  <select
                    value={filters.kind}
                    onChange={(e) => updateFilter("kind", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allKinds`)}</option>
                    <option value="product">{t(`${ff}.kindProduct`)}</option>
                    <option value="service">{t(`${ff}.kindService`)}</option>
                    <option value="bundle">{t(`${ff}.kindBundle`)}</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group analytics-page__filter-group--checkbox">
                  <span className="analytics-page__filter-group-label">{t(`${ff}.stock`)}</span>
                  <label className="analytics-page__filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.low_only}
                      onChange={(e) =>
                        updateFilter("low_only", e.target.checked)
                      }
                    />
                    {t(`${ff}.lowStockOnly`)}
                  </label>
                </div>
              </>
            )}

            {(activeTab === "products" ||
              activeTab === "suppliers" ||
              activeTab === "purchases" ||
              activeTab === "users" ||
              activeTab === "finance") && (
              <div className="analytics-page__filter-group">
                <label>{t(`${ff}.recordLimit`)}</label>
                <input
                  type="number"
                  min="1"
                  value={filters.limit}
                  onChange={(e) => updateFilter("limit", e.target.value)}
                  placeholder={t(`${ff}.noLimit`)}
                />
              </div>
            )}

            {activeTab === "shifts" && (
              <>
                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.status`)}</label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allStatuses`)}</option>
                    <option value="open">{t("crm.analytics.employees.opened")}</option>
                    <option value="closed">{t("crm.analytics.employees.closed")}</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.cashbox`)}</label>
                  <input value={mainCashboxTitle} disabled readOnly />
                </div>
              </>
            )}

            <div className="analytics-page__filters-actions">
              <button
                className="analytics-page__filter-reset"
                onClick={resetFilters}
              >
                {t("common.reset")}
              </button>
              <button
                className="analytics-page__filter-apply"
                onClick={() => {
                  fetchAnalytics(activeTab);
                  setShowFilters(false);
                }}
              >
                {t("common.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
