import { Bar, Doughnut } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import "../analytics.charts";
import { barMaxOf, barPercent } from "../analytics.utils";

export function WarehouseAnalyticsTab({ vm }: any) {
  const { t } = useTranslation();
  const {
    warehouseData,
    stockSort,
    setStockSort,
    formatNumber,
    formatAnalyticsQty,
    sortStockList,
    isStartTariff,
  } = vm;
  const lowStockMax = barMaxOf(warehouseData.lowStock.map((i) => i.stock));
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {warehouseData.kpis.map((kpi, index) => {
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
                  {kpi.change && (
                    <div className="analytics-page__kpi-change analytics-page__kpi-change--positive">
                      <TrendingUp size={14} />
                      {kpi.change}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="analytics-page__grid">
            <div className="analytics-page__chart-card">
              <h3 className="analytics-page__chart-title">
                {t("crm.analytics.warehouse.categoryDistribution")}
              </h3>
              <Doughnut
                data={{
                  labels: warehouseData.categoryChart.labels,
                  datasets: [
                    {
                      data: warehouseData.categoryChart.data,
                      backgroundColor: warehouseData.categoryChart.colors,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
              />
            </div>

            <div className="analytics-page__chart-card">
              <h3 className="analytics-page__chart-title">{t("crm.analytics.warehouse.movement")}</h3>
              <Bar
                data={{
                  labels: warehouseData.movementChart.labels,
                  datasets: [
                    {
                      label: t("crm.analytics.warehouse.soldUnits"),
                      data: warehouseData.movementChart.data,
                      backgroundColor: "#f7d617",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 15,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {!isStartTariff && (
            <div className="analytics-page__table-card">
              <div className="analytics-page__table-header">
                <h3 className="analytics-page__table-title">{t("crm.analytics.warehouse.stockRemaining")}</h3>
                <select
                  className="analytics-page__sort-select"
                  value={stockSort}
                  onChange={(e) => setStockSort(e.target.value)}
                  aria-label={t("crm.analytics.filterFields.sortStock")}
                >
                  <option value="none">{t("crm.analytics.warehouse.sortNone")}</option>
                  <option value="name-asc">{t("crm.analytics.warehouse.sortAlphaAsc")}</option>
                  <option value="name-desc">{t("crm.analytics.warehouse.sortAlphaDesc")}</option>
                  <option value="stock-desc">{t("crm.analytics.warehouse.sortStockDesc")}</option>
                  <option value="stock-asc">{t("crm.analytics.warehouse.sortStockAsc")}</option>
                </select>
              </div>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.sales.goods")}</th>
                    <th>{t("crm.analytics.warehouse.stock")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortStockList(warehouseData.lowStock, stockSort).map(
                    (item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>
                          <div className="analytics-page__bar-cell">
                            <div className="analytics-page__bar-track">
                              <div
                                className="analytics-page__bar-fill"
                                style={{
                                  width: `${barPercent(item.stock, lowStockMax)}%`,
                                }}
                              />
                            </div>
                            <span className="analytics-page__bar-value">
                              {formatAnalyticsQty(item.stock)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {warehouseData.lowStockOnly.length > 0 && (
            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">
                {t("crm.analytics.warehouse.needReorder")}
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.sales.goods")}</th>
                    <th>{t("crm.analytics.warehouse.stock")}</th>
                    <th>{t("crm.analytics.warehouse.minimum")}</th>
                    <th>{t("crm.analytics.products.price")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseData.lowStockOnly.map((item, index) => (
                    <tr key={`${item.id ?? "none"}-${index}`}>
                      <td>{item.name}</td>
                      <td>{formatAnalyticsQty(item.stock)}</td>
                      <td>{formatAnalyticsQty(item.minimum)}</td>
                      <td>
                        {item.price != null
                          ? formatNumber(item.price)
                          : "—"}
                      </td>
                      <td>
                        {item.status ? (
                          <span
                            className={`analytics-page__status analytics-page__status--${item.statusType}`}
                          >
                            {item.status}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </>
  );
}
