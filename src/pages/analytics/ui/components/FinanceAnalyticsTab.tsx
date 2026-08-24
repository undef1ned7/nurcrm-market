import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function FinanceAnalyticsTab({ vm }: Props) {
  const { t } = useTranslation();
  const {
    financeData,
    openFinanceTable,
    toggleFinanceTable,
    formatNumber,
    formatCurrency,
  } = vm;

  const renderFinanceAccordion = (key: string, title: string, tableContent: ReactNode) => {
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
              t("crm.analytics.finance.expenseItems"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.finance.article")}</th>
                    <th>{t("crm.analytics.sales.amount")}</th>
                    <th>{t("crm.analytics.finance.operations")}</th>
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
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderFinanceAccordion(
              "incomeBreakdown",
              t("crm.analytics.finance.incomeSources"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.finance.article")}</th>
                    <th>{t("crm.analytics.sales.amount")}</th>
                    <th>{t("crm.analytics.finance.operations")}</th>
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
                        {t("crm.analytics.noData")}
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
              t("crm.analytics.finance.employeeSalary"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.analytics.finance.employee")}</th>
                    <th>{t("crm.analytics.finance.scheme")}</th>
                    <th>{t("crm.analytics.finance.salaryPerMonth")}</th>
                    <th>%</th>
                    <th>{t("crm.analytics.finance.days")}</th>
                    <th>{t("crm.analytics.finance.salaryForPeriod")}</th>
                    <th>{t("crm.analytics.finance.cashierCol")}</th>
                    <th>{t("crm.analytics.finance.consultantCol")}</th>
                    <th>{t("crm.analytics.finance.commission")}</th>
                    <th>{t("crm.analytics.finance.percentBase")}</th>
                    <th>{t("crm.analytics.finance.bonusPercent")}</th>
                    <th>{t("crm.analytics.finance.total")}</th>
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
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderFinanceAccordion(
              "expenseItems",
              t("crm.analytics.finance.expensesList"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("crm.analytics.sales.amount")}</th>
                    <th>{t("crm.analytics.filterFields.cashbox")}</th>
                    <th>{t("crm.analytics.finance.date")}</th>
                    <th>{t("crm.analytics.finance.createdBy")}</th>
                    <th>{t("crm.analytics.finance.comment")}</th>
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
                        {t("crm.analytics.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>,
            )}

            {renderFinanceAccordion(
              "incomeItems",
              t("crm.analytics.finance.incomesList"),
              <table className="analytics-page__table">
                <thead>
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("crm.analytics.sales.amount")}</th>
                    <th>{t("crm.analytics.finance.date")}</th>
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
                        {t("crm.analytics.noData")}
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
