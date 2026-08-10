import React from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";

export function UsersAnalyticsTab({ vm }: any) {
  const {
    usersData,
    expandedUserPerformanceId,
    setExpandedUserPerformanceId,
    formatNumber,
    formatCurrency,
    formatAnalyticsQty,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {usersData.kpis.map((kpi, index) => {
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
                </div>
              );
            })}
          </div>

          <div className="analytics-page__grid">
            <div className="analytics-page__table-card">
              <h3 className="analytics-page__table-title">
                Эффективность сотрудников
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Email</th>
                    <th>Телефон</th>
                    <th>Выручка</th>
                    <th>Транзакций</th>
                    <th>Средний чек</th>
                    <th>Ед. продано</th>
                    <th>Уник. позиций</th>
                    <th className="analytics-page__users-products-col">
                      Товары
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.usersPerformance.length > 0 ? (
                    usersData.usersPerformance.map((row, rowIndex) => {
                      const soldProducts = Array.isArray(row.sold_products)
                        ? row.sold_products
                        : [];
                      const namesFallback = Array.isArray(row.product_names)
                        ? row.product_names
                        : [];
                      const hasProducts =
                        soldProducts.length > 0 || namesFallback.length > 0;
                      const rowKey = String(
                        row.user_id != null && row.user_id !== ""
                          ? row.user_id
                          : `idx-${rowIndex}`,
                      );
                      const isOpen =
                        hasProducts && expandedUserPerformanceId === rowKey;
                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            className={
                              hasProducts
                                ? "analytics-page__table-row--expandable"
                                : undefined
                            }
                            onClick={() => {
                              if (!hasProducts) return;
                              setExpandedUserPerformanceId((prev) =>
                                prev === rowKey ? null : rowKey,
                              );
                            }}
                            onKeyDown={(e) => {
                              if (!hasProducts) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setExpandedUserPerformanceId((prev) =>
                                  prev === rowKey ? null : rowKey,
                                );
                              }
                            }}
                            tabIndex={hasProducts ? 0 : undefined}
                            aria-expanded={hasProducts ? isOpen : undefined}
                          >
                            <td>{row.user}</td>
                            <td>{row.email}</td>
                            <td>{row.phone}</td>
                            <td>{formatCurrency(row.revenue, 0)}</td>
                            <td>{row.transactions}</td>
                            <td>{formatCurrency(row.avg_check, 0)}</td>
                            <td className="analytics-page__users-sold-qty">
                              {formatAnalyticsQty(row.units_sold)}
                            </td>
                            <td>
                              {row.products_sold_count != null
                                ? row.products_sold_count
                                : "—"}
                            </td>
                            <td className="analytics-page__users-products-toggle">
                              {hasProducts ? (
                                <span className="analytics-page__users-products-toggle-inner">
                                  <ChevronDown
                                    size={18}
                                    className={
                                      isOpen
                                        ? "analytics-page__users-chevron analytics-page__users-chevron--open"
                                        : "analytics-page__users-chevron"
                                    }
                                    aria-hidden
                                  />
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="analytics-page__users-products-dropdown">
                              <td colSpan={9}>
                                <div
                                  className="analytics-page__users-products-dropdown-panel"
                                  role="region"
                                  aria-label={String(row.user ?? "Товары")}
                                >
                                  {soldProducts.length > 0 ? (
                                    <ul className="analytics-page__users-sold-products">
                                      {soldProducts.map((p, i) => (
                                        <li key={`${rowKey}-sp-${i}`}>
                                          {p.name ?? "—"} —{" "}
                                          {formatAnalyticsQty(p.quantity)}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="analytics-page__users-product-names-line">
                                      {namesFallback.join(", ")}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
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
              <h3 className="analytics-page__table-title">
                Расхождения по сменам
              </h3>
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Кассир</th>
                    <th>Касса</th>
                    <th>Открыта</th>
                    <th>Закрыта</th>
                    <th>Ожидалось</th>
                    <th>Фактически</th>
                    <th>Разница</th>
                    <th>Тип</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.shiftDiscrepancies.length > 0 ? (
                    usersData.shiftDiscrepancies.map((row) => (
                      <tr key={row.shift_id}>
                        <td>{row.cashier}</td>
                        <td>{row.cashbox}</td>
                        <td>{row.opened_at}</td>
                        <td>{row.closed_at}</td>
                        <td>{formatCurrency(row.expected_cash, 0)}</td>
                        <td>{formatCurrency(row.closing_cash, 0)}</td>
                        <td>{formatCurrency(row.diff, 0)}</td>
                        <td>{row.type}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
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
