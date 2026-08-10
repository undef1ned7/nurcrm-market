import { Bar } from "react-chartjs-2";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import "../analytics.charts";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function ShiftsAnalyticsTab({ vm }: Props) {
  const {
    shiftsData,
    formatNumber,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {shiftsData.kpis.map((kpi: any, index: any) => {
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

          <div className="analytics-page__chart-card">
            <h3 className="analytics-page__chart-title">Продажи по сменам</h3>
            <Bar
              data={{
                labels: shiftsData.shiftsChart.labels,
                datasets: [
                  {
                    label: "Выручка (сом)",
                    data: shiftsData.shiftsChart.data,
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
                      stepSize: 60000,
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
            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">Активные смены</h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Кассир</th>
                    <th>Касса</th>
                    <th>Начало смены</th>
                    <th>Продажи</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsData.activeShifts.map((shift: any, index: any) => (
                    <tr key={index}>
                      <td>{shift.cashier}</td>
                      <td>{shift.register}</td>
                      <td>{shift.start}</td>
                      <td>{formatNumber(shift.sales)} сом</td>
                      <td>
                        <span className="analytics-page__status analytics-page__status--active">
                          {shift.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">
                Лучшие кассиры за месяц
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Место</th>
                    <th>Кассир</th>
                    <th>Смен</th>
                    <th>Продажи</th>
                    <th>Средний чек</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsData.bestCashiers.map((cashier: any, index: any) => (
                    <tr key={index}>
                      <td>
                        <span
                          className={`analytics-page__place analytics-page__place--${
                            cashier.place === 1 ? "first" : "other"
                          }`}
                        >
                          {cashier.place}
                        </span>
                      </td>
                      <td>{cashier.cashier}</td>
                      <td>{cashier.shifts}</td>
                      <td>{formatNumber(cashier.sales)} сом</td>
                      <td>{formatNumber(cashier.avgCheck)} сом</td>
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
