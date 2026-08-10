import { Bar, Doughnut } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import "../analytics.charts";

export function WarehouseAnalyticsTab({ vm }: any) {
  const {
    warehouseData,
    stockSort,
    setStockSort,
    formatNumber,
    formatAnalyticsQty,
    sortStockList,
    barPercentOfMax,
    isStartTariff,
  } = vm;
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
                Распределение по категориям
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
              <h3 className="analytics-page__chart-title">Движение товаров</h3>
              <Bar
                data={{
                  labels: warehouseData.movementChart.labels,
                  datasets: [
                    {
                      label: "Продано единиц",
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
                <h3 className="analytics-page__table-title">Остатки товаров</h3>
                <select
                  className="analytics-page__sort-select"
                  value={stockSort}
                  onChange={(e) => setStockSort(e.target.value)}
                  aria-label="Сортировка остатков"
                >
                  <option value="none">Без сортировки</option>
                  <option value="name-asc">По алфавиту (А–Я)</option>
                  <option value="name-desc">По алфавиту (Я–А)</option>
                  <option value="stock-desc">По остатку (больше)</option>
                  <option value="stock-asc">По остатку (меньше)</option>
                </select>
              </div>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Остаток</th>
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
                                  width: `${barPercentOfMax(
                                    item.stock,
                                    warehouseData.lowStock.map((i) => i.stock),
                                  )}%`,
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
        </div>
    </>
  );
}
