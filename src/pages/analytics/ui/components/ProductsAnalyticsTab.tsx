import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function ProductsAnalyticsTab({ vm }: Props) {
  const { t } = useTranslation();
  const {
    productsData,
    isStartTariff,
    openProductTable,
    toggleProductTable,
    openProductAnchorSection,
    formatNumber,
    formatCurrency,
  } = vm;

  const renderProductsAccordion = (key: string, title: string, tableContent: ReactNode) => {
    const isOpen = openProductTable === key;
    return (
      <div
        id={`products-section-${key}`}
        className="analytics-page__table-card analytics-page__accordion"
      >
        <button
          type="button"
          className="analytics-page__accordion-header"
          onClick={() => toggleProductTable(key)}
        >
          <h3 className="analytics-page__table-title analytics-page__accordion-title">
            {title}
          </h3>
          <span
            className={`analytics-page__accordion-icon ${
              isOpen ? "analytics-page__accordion-icon--open" : ""
            }`}
          >
            ▾
          </span>
        </button>
        {isOpen && tableContent}
      </div>
    );
  };

  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {productsData.kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              const isInteractive = Boolean(kpi.anchorKey);
              return (
                <div
                  key={index}
                  className={`analytics-page__kpi-card ${
                    isInteractive ? "analytics-page__kpi-card--interactive" : ""
                  }`}
                  role={isInteractive ? "button" : undefined}
                  tabIndex={isInteractive ? 0 : undefined}
                  onClick={
                    isInteractive
                      ? () => openProductAnchorSection(kpi.anchorKey)
                      : undefined
                  }
                  onKeyDown={
                    isInteractive
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openProductAnchorSection(kpi.anchorKey);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="analytics-page__kpi-header">
                    <span className="analytics-page__kpi-title">
                      {kpi.title}
                    </span>
                    <Icon size={24} style={{ color: kpi.color }} />
                  </div>
                  <div className="analytics-page__kpi-value">
                    {typeof kpi.raw === "number" && Number.isFinite(kpi.raw) ? (
                      <AnimatedNumber value={kpi.raw} format={formatNumber} />
                    ) : (
                      kpi.value
                    )}
                    {kpi.currency && (
                      <span className="analytics-page__kpi-currency">
                        {kpi.currency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="analytics-page__grid">
            {!isStartTariff &&
              renderProductsAccordion(
                "topByRevenue",
                t("crm.analytics.products.topByRevenue"),
                <table className="analytics-page__table">
                  <thead>
                    <tr>
                      <th>{t("crm.analytics.products.goods")}</th>
                      <th>{t("crm.analytics.products.category")}</th>
                      <th>{t("crm.analytics.products.brand")}</th>
                      <th>{t("crm.analytics.sales.sold")}</th>
                      <th>{t("crm.analytics.sales.revenue")}</th>
                      <th>{t("crm.analytics.sales.transactions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsData.topByRevenue.length > 0 ? (
                      productsData.topByRevenue.map((row) => (
                        <tr key={row.product_id}>
                          <td>{row.name}</td>
                          <td>{row.category}</td>
                          <td>{row.brand}</td>
                          <td>{row.qty_sold}</td>
                          <td>{formatCurrency(row.revenue, 0)}</td>
                          <td>{row.transactions}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", color: "#6b7280" }}
                        >
                          {t("crm.analytics.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>,
              )}

            {renderProductsAccordion(
              "topByQuantity",
              t("crm.analytics.products.topByQty"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.products.goods")}</th>
                    <th>{t("crm.analytics.sales.sold")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.topByQuantity.length > 0 ? (
                    productsData.topByQuantity.map((row) => (
                      <tr key={row.product_id}>
                        <td>{row.name}</td>
                        <td>{row.qty_sold}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}
          </div>

          <div className="analytics-page__grid">
            {renderProductsAccordion(
              "categories",
              t("crm.analytics.products.categories"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.products.category")}</th>
                    <th>{t("crm.analytics.sales.revenue")}</th>
                    <th>{t("crm.analytics.products.quantity")}</th>
                    <th>{t("crm.analytics.products.productsCount")}</th>
                    <th>{t("crm.analytics.sales.transactions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.categories.length > 0 ? (
                    productsData.categories.map((row) => (
                      <tr key={row.category_id}>
                        <td>{row.category}</td>
                        <td>{formatCurrency(row.revenue, 0)}</td>
                        <td>{row.qty_sold}</td>
                        <td>{row.products_count}</td>
                        <td>{row.transactions}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderProductsAccordion(
              "brands",
              t("crm.analytics.products.brands"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.products.brand")}</th>
                    <th>{t("crm.analytics.products.productsCount")}</th>
                    <th>{t("crm.analytics.sales.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.brands.length > 0 ? (
                    productsData.brands.map((row) => (
                      <tr key={row.brand_id}>
                        <td>{row.brand}</td>
                        <td>{row.products_count}</td>
                        <td>{formatCurrency(row.revenue, 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}
          </div>

          {!isStartTariff &&
            renderProductsAccordion(
              "lowStockProducts",
              t("crm.analytics.products.lowStock"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.products.code")}</th>
                    <th>{t("crm.analytics.products.goods")}</th>
                    <th>{t("crm.analytics.products.quantity")}</th>
                    <th>{t("crm.analytics.products.price")}</th>
                    <th>{t("crm.analytics.products.purchasePrice")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.lowStockProducts.length > 0 ? (
                    productsData.lowStockProducts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.quantity}</td>
                        <td>{formatCurrency(row.price, 0)}</td>
                        <td>{formatCurrency(row.purchase_price, 0)}</td>
                        <td>
                          <span
                            className={`analytics-page__status analytics-page__status--${row.statusType}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}
          {!isStartTariff &&
            renderProductsAccordion(
              "expiringProducts",
              t("crm.analytics.products.expiringProducts"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.products.code")}</th>
                    <th>{t("crm.analytics.products.goods")}</th>
                    <th>{t("crm.analytics.products.quantity")}</th>
                    <th>{t("crm.analytics.products.expiryDate")}</th>
                    <th>{t("crm.analytics.products.daysLeft")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.expiringProducts.length > 0 ? (
                    productsData.expiringProducts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.quantity}</td>
                        <td>{row.expiry_date || row.expiration_date || "—"}</td>
                        <td>{row.days_left ?? "—"}</td>
                        <td>
                          <span
                            className={`analytics-page__status analytics-page__status--${row.statusType}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}
        </div>
    </>
  );
}
