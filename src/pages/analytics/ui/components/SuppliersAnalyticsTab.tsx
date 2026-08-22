import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function SuppliersAnalyticsTab({ vm }: Props) {
  const { t } = useTranslation();
  const {
    suppliersData,
    formatNumber,
    formatCurrency,
    formatAnalyticsQty,
  } = vm;

  const tableHeaders = (
    <tr>
      <th>{t("crm.analytics.purchases.supplier")}</th>
      <th>{t("crm.analytics.suppliers.phone")}</th>
      <th>{t("crm.analytics.suppliers.sku")}</th>
      <th>{t("crm.analytics.suppliers.stock")}</th>
      <th>{t("crm.analytics.suppliers.stockValue")}</th>
      <th>{t("crm.analytics.suppliers.sold")}</th>
      <th>{t("crm.analytics.suppliers.revenue")}</th>
      <th>{t("crm.analytics.suppliers.receipts")}</th>
      <th>{t("crm.analytics.suppliers.salesRank")}</th>
      <th>{t("crm.analytics.suppliers.warehouseRank")}</th>
      <th>{t("crm.analytics.suppliers.rating")}</th>
    </tr>
  );

  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {suppliersData.kpis.map((kpi: any, index: any) => {
              const Icon = kpi.icon;
              return (
                <div key={index} className="analytics-page__kpi-card">
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
                  {kpi.subtitle && (
                    <div className="analytics-page__kpi-subtitle">
                      {kpi.subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="analytics-page__grid">
            <div className="analytics-page__table-card analytics-page__table-card--scrollable">
              <h3 className="analytics-page__table-title">
                {t("crm.analytics.suppliers.bySales")}
              </h3>
              <div className="analytics-page__table-scroll analytics-page__table-scroll--suppliers">
                <table className="analytics-page__table analytics-page__table--suppliers">
                  <thead>{tableHeaders}</thead>
                  <tbody>
                    {suppliersData.suppliers.length > 0 ? (
                      suppliersData.suppliers.map((row: any) => (
                        <tr key={row.supplier_id || row.name}>
                          <td>{row.name}</td>
                          <td>{row.phone}</td>
                          <td>{row.products_count}</td>
                          <td>{formatAnalyticsQty(row.stock_qty)}</td>
                          <td>{formatCurrency(row.stock_value, 0)}</td>
                          <td>{formatAnalyticsQty(row.period_qty_sold)}</td>
                          <td>{formatCurrency(row.period_revenue, 0)}</td>
                          <td>{row.period_transactions}</td>
                          <td>{row.rank_by_qty}</td>
                          <td>{row.rank_by_stock}</td>
                          <td>{Number(row.rating || 0).toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          style={{ textAlign: "center", color: "#6b7280" }}
                        >
                          {t("crm.analytics.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytics-page__table-card analytics-page__table-card--scrollable">
              <h3 className="analytics-page__table-title">
                {t("crm.analytics.suppliers.byWarehouse")}
              </h3>
              <div className="analytics-page__table-scroll analytics-page__table-scroll--suppliers">
                <table className="analytics-page__table analytics-page__table--suppliers">
                  <thead>{tableHeaders}</thead>
                  <tbody>
                    {suppliersData.suppliersByStock.length > 0 ? (
                      suppliersData.suppliersByStock.map((row: any) => (
                        <tr key={`stock-${row.supplier_id || row.name}`}>
                          <td>{row.name}</td>
                          <td>{row.phone}</td>
                          <td>{row.products_count}</td>
                          <td>{formatAnalyticsQty(row.stock_qty)}</td>
                          <td>{formatCurrency(row.stock_value, 0)}</td>
                          <td>{formatAnalyticsQty(row.period_qty_sold)}</td>
                          <td>{formatCurrency(row.period_revenue, 0)}</td>
                          <td>{row.period_transactions}</td>
                          <td>{row.rank_by_qty}</td>
                          <td>{row.rank_by_stock}</td>
                          <td>{Number(row.rating || 0).toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          style={{ textAlign: "center", color: "#6b7280" }}
                        >
                          {t("crm.analytics.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
