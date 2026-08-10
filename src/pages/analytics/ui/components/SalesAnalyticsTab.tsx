import { Line, Bar } from "react-chartjs-2";
import { TrendingUp, DollarSign, X, Package, BarChart3, ShoppingCart } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import "../analytics.charts";

export function SalesAnalyticsTab({ vm }: any) {
  const {
    salesData,
    analyticsData,
    showRevenueModal,
    setShowRevenueModal,
    showTxModal,
    setShowTxModal,
    txLoading,
    txError,
    txSales,
    openTransactions,
    formatNumber,
    formatCurrency,
    saleStatusInfo,
    barPercentOfMax,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {salesData.kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              const isRevenue = kpi.title === "Выручка";
              const isTx = kpi.title === "Транзакции";
              const clickable = isRevenue || isTx;
              const handleOpen = isRevenue
                ? () => setShowRevenueModal(true)
                : isTx
                  ? openTransactions
                  : undefined;
              return (
                <div
                  key={index}
                  className={`analytics-page__kpi-card${
                    clickable ? " analytics-page__kpi-card--clickable" : ""
                  }`}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={handleOpen}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") handleOpen();
                        }
                      : undefined
                  }
                  title={
                    isRevenue
                      ? "Себестоимость, валовая прибыль, маржа"
                      : isTx
                        ? "Показать продажи по фильтру"
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

          {showRevenueModal && (
            <ReactPortal wrapperId="analytics-revenue-modal">
              <div
                className="analytics-revenue-modal__overlay"
                role="presentation"
                onClick={() => setShowRevenueModal(false)}
              >
                <div
                  className="analytics-revenue-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Детализация выручки"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="analytics-revenue-modal__head">
                    <div className="analytics-revenue-modal__head-left">
                      <span className="analytics-revenue-modal__head-icon">
                        <DollarSign size={20} />
                      </span>
                      <div>
                        <h3 className="analytics-revenue-modal__title">
                          Выручка
                        </h3>
                        <p className="analytics-revenue-modal__subtitle">
                          {formatNumber(analyticsData?.cards?.revenue || 0)} сом
                          за период
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="analytics-revenue-modal__close"
                      onClick={() => setShowRevenueModal(false)}
                      aria-label="Закрыть"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="analytics-revenue-modal__grid">
                    <div className="analytics-revenue-modal__tile analytics-revenue-modal__tile--cost">
                      <span className="analytics-revenue-modal__tile-icon">
                        <Package size={18} />
                      </span>
                      <span className="analytics-revenue-modal__tile-label">
                        Себестоимость
                      </span>
                      <span className="analytics-revenue-modal__tile-value">
                        {formatNumber(analyticsData?.cards?.cogs || 0)}
                        <em>сом</em>
                      </span>
                    </div>

                    <div className="analytics-revenue-modal__tile analytics-revenue-modal__tile--profit">
                      <span className="analytics-revenue-modal__tile-icon">
                        <TrendingUp size={18} />
                      </span>
                      <span className="analytics-revenue-modal__tile-label">
                        Валовая прибыль
                      </span>
                      <span className="analytics-revenue-modal__tile-value">
                        {formatNumber(analyticsData?.cards?.gross_profit || 0)}
                        <em>сом</em>
                      </span>
                    </div>

                    <div className="analytics-revenue-modal__tile analytics-revenue-modal__tile--margin">
                      <span className="analytics-revenue-modal__tile-icon">
                        <BarChart3 size={18} />
                      </span>
                      <span className="analytics-revenue-modal__tile-label">
                        Маржа
                      </span>
                      <span className="analytics-revenue-modal__tile-value">
                        {Number(
                          analyticsData?.cards?.margin_percent || 0,
                        ).toLocaleString("ru-RU", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                        <em>%</em>
                      </span>
                    </div>
                  </div>

                  {analyticsData?.cards?.cogs_warning && (
                    <div className="analytics-revenue-modal__warn">
                      {analyticsData.cards.cogs_warning}
                    </div>
                  )}
                </div>
              </div>
            </ReactPortal>
          )}

          {showTxModal && (
            <ReactPortal wrapperId="analytics-tx-modal">
              <div
                className="analytics-revenue-modal__overlay"
                role="presentation"
                onClick={() => setShowTxModal(false)}
              >
                <div
                  className="analytics-revenue-modal analytics-tx-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Продажи по фильтру"
                  onClick={(e) => e.stopPropagation()}
                >
                <div className="analytics-revenue-modal__head">
                  <div className="analytics-revenue-modal__head-left">
                    <span className="analytics-revenue-modal__head-icon">
                      <ShoppingCart size={20} />
                    </span>
                    <div>
                      <h3 className="analytics-revenue-modal__title">
                        Транзакции
                      </h3>
                      <p className="analytics-revenue-modal__subtitle">
                        {txLoading
                          ? "Загрузка…"
                          : `Продаж: ${txSales.length}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="analytics-revenue-modal__close"
                    onClick={() => setShowTxModal(false)}
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="analytics-tx-modal__body">
                  {txLoading ? (
                    <div className="analytics-tx-modal__state">Загрузка…</div>
                  ) : txError ? (
                    <div className="analytics-tx-modal__state analytics-tx-modal__state--error">
                      {txError}
                    </div>
                  ) : txSales.length === 0 ? (
                    <div className="analytics-tx-modal__state">
                      Нет продаж по выбранному фильтру
                    </div>
                  ) : (
                    <div className="analytics-tx-modal__list">
                      {txSales.map((s, i) => {
                        const pmLabel =
                          { cash: "Наличные", card: "Карта", transfer: "Перевод" }[
                            String(s.payment_method || "")
                          ] || s.payment_method || "—";
                        const dt = s.created_at || s.paid_at;
                        const dtLabel = dt
                          ? new Date(dt).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—";
                        const st = saleStatusInfo(s);
                        return (
                          <div className="analytics-tx-modal__row" key={s.id || i}>
                            <div className="analytics-tx-modal__row-main">
                              <span className="analytics-tx-modal__row-no">
                                № {i + 1}
                                <span
                                  className={`analytics-tx-modal__badge analytics-tx-modal__badge--${st.variant}`}
                                >
                                  {st.label}
                                </span>
                              </span>
                              <span className="analytics-tx-modal__row-date">
                                {dtLabel}
                              </span>
                            </div>
                            <div className="analytics-tx-modal__row-meta">
                              <span className="analytics-tx-modal__row-pm">
                                {pmLabel}
                              </span>
                              <span className="analytics-tx-modal__row-total">
                                {formatNumber(s.total || 0)} сом
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </ReactPortal>
          )}

          <div className="analytics-page__chart-card analytics-page__chart-card--fit">
            <h3 className="analytics-page__chart-title">Динамика продаж</h3>
            <div className="analytics-page__chart-canvas">
            <Line
              data={{
                labels: salesData.salesChart.labels,
                datasets: [
                  {
                    label: "Выручка (сом)",
                    data: salesData.salesChart.data,
                    borderColor: "#f7d617",
                    // Градиентная заливка под линией (area-график как в дизайне)
                    backgroundColor: (ctx) => {
                      const { chart } = ctx;
                      const { ctx: c, chartArea } = chart;
                      if (!chartArea) return "rgba(247, 214, 23, 0.2)";
                      const g = c.createLinearGradient(
                        0,
                        chartArea.top,
                        0,
                        chartArea.bottom,
                      );
                      g.addColorStop(0, "rgba(247, 214, 23, 0.45)");
                      g.addColorStop(1, "rgba(247, 214, 23, 0)");
                      return g;
                    },
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointBackgroundColor: "#f7d617",
                    pointBorderColor: "#f7d617",
                    pointRadius: 3,
                    pointHoverRadius: 5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: {
                    grid: { display: false },
                  },
                  y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { borderDash: [4, 4] },
                    ticks: {
                      callback: function (value: any) {
                        return value.toLocaleString("ru-RU");
                      },
                    },
                  },
                },
              } as any}
            />
            </div>
          </div>

          {salesData.paymentMethods.labels.length > 0 && (
            <div className="analytics-page__chart-card">
              <h3 className="analytics-page__chart-title">
                Продажи по способам оплаты
              </h3>
              <Bar
                data={{
                  labels: salesData.paymentMethods.labels,
                  datasets: [
                    {
                      label: "Сумма (сом)",
                      data: salesData.paymentMethods.data,
                      backgroundColor: "#f7d617",
                      borderRadius: 6,
                      borderSkipped: false,
                      maxBarThickness: 34,
                    },
                  ],
                }}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (item) =>
                          `${Number(item.raw).toLocaleString("ru-RU")} сом`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      border: { display: false },
                      grid: { borderDash: [4, 4] },
                      ticks: {
                        callback: function (value) {
                          return value.toLocaleString("ru-RU");
                        },
                      },
                    },
                    y: {
                      grid: { display: false },
                    },
                  },
                } as any}
              />
            </div>
          )}

          <div className="analytics-page__grid">
            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">Топ-5 товаров</h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Продано</th>
                    <th>Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.topProducts.length > 0 ? (
                    salesData.topProducts.map((product, index) => (
                      <tr key={index}>
                        <td>{product.name}</td>
                        <td>{product.sold} шт</td>
                        <td>
                          <div className="analytics-page__bar-cell">
                            <div className="analytics-page__bar-track">
                              <div
                                className="analytics-page__bar-fill"
                                style={{
                                  width: `${barPercentOfMax(
                                    product.revenue,
                                    salesData.topProducts.map((p) => p.revenue),
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="analytics-page__bar-value">
                              {formatNumber(product.revenue)} сом
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="analytics-page__table-card">
              <div className="analytics-page__table-header">
                <h3 className="analytics-page__table-title">Документы</h3>
                {/* <button className="analytics-page__date-filter">
                  <Calendar size={16} />
                  неделю
                </button> */}
              </div>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th>Кол-во</th>
                    <th>Сумма</th>
                    <th>Склад</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.documents.length > 0 ? (
                    salesData.documents.map((doc, index) => (
                      <tr key={index}>
                        <td>{doc.name}</td>
                        <td>{doc.quantity}</td>
                        <td>
                          <div className="analytics-page__bar-cell">
                            <div className="analytics-page__bar-track">
                              <div
                                className="analytics-page__bar-fill"
                                style={{
                                  width: `${barPercentOfMax(
                                    doc.amount,
                                    salesData.documents.map((d) => d.amount),
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="analytics-page__bar-value">
                              {formatCurrency(doc.amount, 0)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {doc.warehouse
                            ? formatCurrency(doc.warehouse, 0)
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </>
  );
}
