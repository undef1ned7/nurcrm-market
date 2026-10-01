import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchSaleConsultants, type SaleConsultant } from "@entities/sale";
import { fetchCategories, fetchProductsApi } from "@entities/product";
import api from "@shared/api";
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
    cashBoxes,
  } = vm;
  const [consultants, setConsultants] = useState<SaleConsultant[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [shifts, setShifts] = useState<Array<{ id: string; label: string }>>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [productLabel, setProductLabel] = useState("");
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

  useEffect(() => {
    if (!showFilters || activeTab !== "warehouse") return undefined;
    let cancelled = false;
    fetchCategories()
      .then((data: any) => {
        if (cancelled) return;
        const list = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
        setCategories(
          list
            .filter((c: any) => c?.id != null)
            .map((c: any) => ({ id: String(c.id), name: c.name || "—" })),
        );
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showFilters, activeTab]);

  const usesSalesFilters =
    activeTab === "sales" ||
    activeTab === "cashiers" ||
    activeTab === "suppliers" ||
    activeTab === "purchases";

  // Поставщики (клиенты type=suppliers) — фильтр `supplier` на вкладке «Товары»
  useEffect(() => {
    if (!showFilters || activeTab !== "products") return undefined;
    let cancelled = false;
    api
      .get("/main/clients/", { params: { type: "suppliers", page_size: 500 } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setSuppliers(
          list
            .filter((c: any) => c?.id != null)
            .map((c: any) => ({
              id: String(c.id),
              name: c.full_name || c.name || c.phone || "—",
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setSuppliers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showFilters, activeTab]);

  // Смены, пересекающиеся с периодом, — фильтр `shift`
  useEffect(() => {
    if (!showFilters || !usesSalesFilters) return undefined;
    let cancelled = false;
    const fromT = period.from.getTime();
    const toT = period.to.getTime();
    api
      .get("/construction/shifts/", { params: { page_size: 100 } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setShifts(
          list
            .filter((sh: any) => {
              const opened = new Date(sh.opened_at).getTime();
              const closed = sh.closed_at ? new Date(sh.closed_at).getTime() : Infinity;
              return !(opened > toT || closed < fromT);
            })
            .map((sh: any) => ({
              id: String(sh.id),
              label: `${sh.cashier_display || sh.cashier || "—"} · ${
                sh.opened_at ? new Date(sh.opened_at).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }) : "—"
              }`,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setShifts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showFilters, usesSalesFilters, period.from, period.to]);

  // Поиск товара для фильтра `product` на вкладке «Склад»
  useEffect(() => {
    if (!showFilters || activeTab !== "warehouse") return undefined;
    const q = productQuery.trim();
    if (q.length < 2) {
      setProductOptions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchProductsApi({ search: q, page_size: 20 })
        .then((data: any) => {
          if (cancelled) return;
          const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          setProductOptions(
            list
              .filter((p: any) => p?.id != null)
              .map((p: any) => ({ id: String(p.id), name: p.name || "—" })),
          );
        })
        .catch(() => {
          if (!cancelled) setProductOptions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showFilters, activeTab, productQuery]);

  const limitOptions = ["10", "20", "50", "100", "all"];
  const currentLimit = String(filters.limit ?? "");

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
                    <option value="card">{t("crm.analytics.sales.card")}</option>
                    <option value="qr">{t("crm.analytics.sales.qr")}</option>
                    <option value="bank_transfer">{t("crm.analytics.sales.bankTransfer")}</option>
                    <option value="debt">{t("crm.analytics.cashiers.debt")}</option>
                    <option value="mixed">{t("crm.analytics.sales.mixed")}</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.cashbox`)}</label>
                  <select
                    value={filters.cashbox}
                    onChange={(e) => updateFilter("cashbox", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allCashboxes`)}</option>
                    {(Array.isArray(cashBoxes) ? cashBoxes : []).map((box: any) => (
                      <option key={`cashbox-${box.id}`} value={String(box.id)}>
                        {box.name || box.department_name || box.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.shift`)}</label>
                  <select
                    value={filters.shift}
                    onChange={(e) => updateFilter("shift", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allShifts`)}</option>
                    {filters.shift &&
                      !shifts.some((sh) => sh.id === String(filters.shift)) && (
                        <option value={filters.shift}>{t(`${ff}.selectedShift`)}</option>
                      )}
                    {shifts.map((sh) => (
                      <option key={`shift-${sh.id}`} value={sh.id}>
                        {sh.label}
                      </option>
                    ))}
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
                  <label>{t(`${ff}.category`)}</label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilter("category", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allCategories`)}</option>
                    {categories.map((item) => (
                      <option key={`category-${item.id}`} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.productKind`)}</label>
                  <select
                    value={filters.kind}
                    onChange={(e) => updateFilter("kind", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allKinds`)}</option>
                    <option value="piece">{t(`${ff}.kindPiece`)}</option>
                    <option value="weight">{t(`${ff}.kindWeight`)}</option>
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.product`)}</label>
                  {filters.product ? (
                    <div className="analytics-page__filter-chip">
                      <span>{productLabel || t(`${ff}.selectedProduct`)}</span>
                      <button
                        type="button"
                        aria-label={t("common.reset")}
                        onClick={() => {
                          updateFilter("product", "");
                          setProductLabel("");
                          setProductQuery("");
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="search"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        placeholder={t(`${ff}.productSearch`)}
                      />
                      {productOptions.length > 0 && (
                        <ul className="analytics-page__filter-suggest" role="listbox">
                          {productOptions.map((p) => (
                            <li key={`product-${p.id}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                  updateFilter("product", p.id);
                                  setProductLabel(p.name);
                                  setProductOptions([]);
                                }}
                              >
                                {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
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
              activeTab === "abc" ||
              activeTab === "procurement" ||
              activeTab === "suppliers" ||
              activeTab === "purchases" ||
              activeTab === "users" ||
              activeTab === "finance") && (
              <>
              <div className="analytics-page__filter-group">
                <label>{t(`${ff}.recordLimit`)}</label>
                <select
                  value={currentLimit}
                  onChange={(e) => updateFilter("limit", e.target.value)}
                >
                  <option value="">{t(`${ff}.defaultLimit`)}</option>
                  {currentLimit && !limitOptions.includes(currentLimit) && (
                    <option value={currentLimit}>{currentLimit}</option>
                  )}
                  {limitOptions.map((v) => (
                    <option key={`limit-${v}`} value={v}>
                      {v === "all" ? t(`${ff}.allRecords`) : v}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === "products" && (
                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.supplier`)}</label>
                  <select
                    value={filters.supplier}
                    onChange={(e) => updateFilter("supplier", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allSuppliers`)}</option>
                    {suppliers.map((sup) => (
                      <option key={`supplier-${sup.id}`} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              </>
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
                  <label>{t(`${ff}.cashier`)}</label>
                  <select
                    value={filters.cashier}
                    onChange={(e) => updateFilter("cashier", e.target.value)}
                  >
                    <option value="">{t(`${ff}.all`)}</option>
                    {consultants.map((item) => (
                      <option key={`shift-cashier-${item.id}`} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="analytics-page__filter-group">
                  <label>{t(`${ff}.cashbox`)}</label>
                  <select
                    value={filters.cashbox}
                    onChange={(e) => updateFilter("cashbox", e.target.value)}
                  >
                    <option value="">{t(`${ff}.allCashboxes`)}</option>
                    {(Array.isArray(cashBoxes) ? cashBoxes : []).map((box: any) => (
                      <option key={`shift-cashbox-${box.id}`} value={String(box.id)}>
                        {box.name || box.department_name || box.id}
                      </option>
                    ))}
                  </select>
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
