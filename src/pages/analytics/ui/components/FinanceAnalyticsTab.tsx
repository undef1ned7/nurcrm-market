import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function FinanceAnalyticsTab({ vm }: Props) {
  const {
    financeData,
    openFinanceTable,
    toggleFinanceTable,
    formatNumber,
    formatCurrency,
  } = vm;

  const renderFinanceAccordion = (key: any, title: any, tableContent: any) => {
    const isOpen = openFinanceTable === key;
    return (
      <div className="analytics-page__table-card analytics-page__accordion">
        <button
          type="button"
          className="analytics-page__accordion-header"
          onClick={() => toggleFinanceTable(key)}
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
            {financeData.kpis.map((kpi: any, index: any) => {
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
            {renderFinanceAccordion(
              "expenseBreakdown",
              "Статьи расходов",
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Статья</th>
                    <th>Сумма</th>
                    <th>Операций</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.expenseBreakdown.length > 0 ? (
                    financeData.expenseBreakdown.map((row: any, idx: any) => (
                      <tr key={`${row.name}-${idx}`}>
                        <td>{row.name}</td>
                        <td>{formatCurrency(row.total, 0)}</td>
                        <td>{row.count}</td>
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
              </table>,
            )}

            {renderFinanceAccordion(
              "incomeBreakdown",
              "Источники дохода",
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Статья</th>
                    <th>Сумма</th>
                    <th>Операций</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.incomeBreakdown.length > 0 ? (
                    financeData.incomeBreakdown.map((row: any, idx: any) => (
                      <tr key={`${row.name}-${idx}`}>
                        <td>{row.name}</td>
                        <td>{formatCurrency(row.total, 0)}</td>
                        <td>{row.count}</td>
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
              </table>,
            )}
          </div>

          <div className="analytics-page__grid">
            {renderFinanceAccordion(
              "salaryRows",
              "Зарплата сотрудников (маркет)",
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Схема</th>
                    <th>Оклад/мес</th>
                    <th>%</th>
                    <th>Дней</th>
                    <th>Оклад за период</th>
                    <th>Кассир</th>
                    <th>Консультант</th>
                    <th>Комиссия</th>
                    <th>База %</th>
                    <th>Бонус %</th>
                    <th>Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.salaryRows.length > 0 ? (
                    financeData.salaryRows.map((row: any, idx: any) => (
                      <tr key={`${row.user_id || "user"}-${idx}`}>
                        <td>{row.employee_label || "-"}</td>
                        <td>{row.pay_scheme_label || row.pay_scheme || "-"}</td>
                        <td>
                          {formatCurrency(row.monthly_base_salary || 0, 2)}
                        </td>
                        <td>{formatCurrency(row.sales_percent || 0, 2)}</td>
                        <td>{formatNumber(row.period_days || 0)}</td>
                        <td>{formatCurrency(row.base_prorated || 0, 2)}</td>
                        <td>
                          {formatCurrency(
                            row.cashier_sales_period ??
                              row.employee_sales_period ??
                              0,
                            2,
                          )}
                        </td>
                        <td>
                          {formatCurrency(row.consultant_sales_period || 0, 2)}
                        </td>
                        <td>
                          {formatCurrency(
                            row.consultant_commission_period || 0,
                            2,
                          )}
                        </td>
                        <td>
                          {formatCurrency(row.employee_sales_period || 0, 2)}
                        </td>
                        <td>{formatCurrency(row.percent_bonus || 0, 2)}</td>
                        <td>{formatCurrency(row.total || 0, 2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderFinanceAccordion(
              "expenseItems",
              "Расходы",
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Сумма</th>
                    <th>Касса</th>
                    <th>Дата</th>
                    <th>Создал</th>
                    <th>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.expenseItems.length > 0 ? (
                    financeData.expenseItems.map((row: any) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{formatCurrency(row.amount, 0)}</td>
                        <td>{row.cashbox}</td>
                        <td>{row.created_at}</td>
                        <td>{row.created_by}</td>
                        <td>{row.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", color: "#6b7280" }}
                      >
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderFinanceAccordion(
              "incomeItems",
              "Доходы",
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Сумма</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.incomeItems.length > 0 ? (
                    financeData.incomeItems.map((row: any) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{formatCurrency(row.amount, 0)}</td>
                        <td>{row.created_at}</td>
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
              </table>,
            )}
          </div>
        </div>
    </>
  );
}
