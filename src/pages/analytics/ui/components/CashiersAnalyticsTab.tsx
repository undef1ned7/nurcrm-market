import { Line, Bar, Doughnut } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import "../analytics.charts";

export function CashiersAnalyticsTab({ vm }: any) {
  const {
    cashierData,
    formatNumber,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {cashierData.kpis.map((kpi, index) => {
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

          <div className="analytics-page__chart-card analytics-page__chart-card--large">
            <h3 className="analytics-page__chart-title">Продажи по часам</h3>
            <Line
              data={{
                labels: cashierData.hourlyChart.labels,
                datasets: [
                  {
                    label: "Выручка (сом)",
                    data: cashierData.hourlyChart.data,
                    borderColor: "#f7d617",
                    backgroundColor: "rgba(247, 214, 23, 0.1)",
                    fill: true,
                    tension: 0.4,
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
                      stepSize: 30000,
                      callback: function (value) {
                        return value.toLocaleString("ru-RU");
                      },
                    },
                  },
                },
              }}
            />
          </div>

          <div className="analytics-page__grid">
            <div className="analytics-page__chart-card">
              <h3 className="analytics-page__chart-title">Способы оплаты</h3>
              <Doughnut
                data={{
                  labels: cashierData.paymentMethods.labels,
                  datasets: [
                    {
                      data: cashierData.paymentMethods.data,
                      backgroundColor: cashierData.paymentMethods.colors,
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
              <h3 className="analytics-page__chart-title">
                Транзакции за неделю
              </h3>
              <Bar
                data={{
                  labels: cashierData.weeklyTransactions.labels,
                  datasets: [
                    {
                      label: "Транзакции",
                      data: cashierData.weeklyTransactions.data,
                      backgroundColor: "#f7d617",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 35,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="analytics-page__grid">
            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">
                Детализация по способам оплаты
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Способ оплаты</th>
                    <th>Транзакций</th>
                    <th>Сумма</th>
                    <th>Доля</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierData.paymentDetails.map((detail, index) => (
                    <tr key={index}>
                      <td>{detail.method}</td>
                      <td>{detail.transactions}</td>
                      <td>{formatNumber(detail.amount)} сом</td>
                      <td>{detail.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">
                Пиковые часы работы
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Транзакций</th>
                    <th>Выручка</th>
                    <th>Средний чек</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierData.peakHours.map((hour, index) => (
                    <tr key={index}>
                      <td>{hour.time}</td>
                      <td>{hour.transactions}</td>
                      <td>{formatNumber(hour.revenue)} сом</td>
                      <td>{formatNumber(hour.avgCheck)} сом</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </>
  );
}
