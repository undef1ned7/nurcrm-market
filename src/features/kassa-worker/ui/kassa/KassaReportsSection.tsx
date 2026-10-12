import { useTranslation } from "react-i18next";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
const KassaReportsSection = ({
  reportType,
  setReportType,
  selectedMonth,
  setSelectedMonth,
  selectedDate,
  setSelectedDate,
  reportLoading,
  reportData,
}: any) => {
  const { t } = useTranslation();
  const tw = (k: string): string => t(`crm.kassa.worker.${k}`) as string;
  return (
    <div className="cashbox-reports">
      <div className="cashbox-reports__tabs">
        <button
          className={`cashbox-reports__tab ${
            reportType === "monthly" ? "cashbox-reports__tab--active" : ""
          }`}
          onClick={() => setReportType("monthly")}
        >
          {tw("monthlyReport")}
        </button>
        <button
          className={`cashbox-reports__tab ${
            reportType === "daily" ? "cashbox-reports__tab--active" : ""
          }`}
          onClick={() => setReportType("daily")}
        >
          {tw("dailyReport")}
        </button>
      </div>

      <div className="cashbox-reports__filters">
        {reportType === "monthly" ? (
          <div className="cashbox-reports__filter-group">
            <label htmlFor="month-select">{tw("pickMonth")}</label>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="cashbox-reports__date-input"
            />
          </div>
        ) : (
          <div className="cashbox-reports__filter-group">
            <label htmlFor="date-select">{tw("pickDate")}</label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="cashbox-reports__date-input"
            />
          </div>
        )}
      </div>

      {reportLoading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          {tw("reportLoading")}
        </div>
      ) : reportData ? (
        <DataContainer>
          <div className="cashbox-reports__content">
            <div className="cashbox-reports__summary">
              <div className="cashbox-reports__summary-item">
                <span className="cashbox-reports__summary-label">
                  {tw("incomeColon")}
                </span>
                <span className="cashbox-reports__summary-value cashbox-reports__summary-value--income">
                  {reportData.totalIncome.toFixed(2)} сом
                </span>
              </div>
              <div className="cashbox-reports__summary-item">
                <span className="cashbox-reports__summary-label">
                  {tw("expenseColon")}
                </span>
                <span className="cashbox-reports__summary-value cashbox-reports__summary-value--expense">
                  {reportData.totalExpense.toFixed(2)} сом
                </span>
              </div>
              <div className="cashbox-reports__summary-item">
                <span className="cashbox-reports__summary-label">
                  {tw("totalLabel")}
                </span>
                <span
                  className={`cashbox-reports__summary-value ${
                    reportData.net >= 0
                      ? "cashbox-reports__summary-value--income"
                      : "cashbox-reports__summary-value--expense"
                  }`}
                >
                  {reportData.net.toFixed(2)} сом
                </span>
              </div>
            </div>

            {reportType === "monthly" && reportData.dailyGroups ? (
              <div className="cashbox-reports__monthly">
                {Object.entries(reportData.dailyGroups)
                  .sort(
                    ([a], [b]) =>
                      Number(new Date(b as any)) - Number(new Date(a as any)),
                  )
                  .map(([date, data]: [string, any]) => (
                    <div key={date} className="cashbox-reports__day-group">
                      <div className="cashbox-reports__day-header">
                        <h4>
                          {new Date(date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </h4>
                        <div className="cashbox-reports__day-totals">
                          <span>
                            {tw("incomeColon")} {data.income.toFixed(2)} сом
                          </span>
                          <span>
                            {tw("expenseColon")} {data.expense.toFixed(2)} сом
                          </span>
                          <span>
                            {tw("totalLabel")}{" "}
                            {(data.income - data.expense).toFixed(2)} сом
                          </span>
                        </div>
                      </div>
                      <table className="nur-table kassa-table">
                        <thead>
                          <tr>
                            <th>{t("crm.kassa.type")}</th>
                            <th>{tw("nameLabel")}</th>
                            <th>{t("common.amount")}</th>
                            <th>{tw("time")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.flows.map((flow) => (
                            <tr key={flow.id}>
                              <td data-label={t("crm.kassa.type")}>
                                {flow.type === "income"
                                  ? t("crm.kassa.income")
                                  : t("crm.kassa.expense")}
                              </td>
                              <td data-label={tw("nameLabel")}>
                                {flow.name || flow.title}
                              </td>
                              <td data-label={t("common.amount")}>
                                {flow.amount}
                              </td>
                              <td data-label={tw("time")}>
                                {new Date(flow.created_at).toLocaleTimeString(
                                  "ru-RU",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="cashbox-reports__daily">
                {reportData.flows && reportData.flows.length > 0 ? (
                  <table className="nur-table kassa-table">
                    <thead>
                      <tr>
                        <th>{t("crm.kassa.type")}</th>
                        <th>{tw("nameLabel")}</th>
                        <th>{t("common.amount")}</th>
                        <th>{tw("time")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.flows.map((flow) => (
                        <tr key={flow.id}>
                          <td data-label={t("crm.kassa.type")}>
                            {flow.type === "income"
                              ? t("crm.kassa.income")
                              : t("crm.kassa.expense")}
                          </td>
                          <td data-label={tw("nameLabel")}>
                            {flow.name || flow.title}
                          </td>
                          <td data-label={t("common.amount")}>{flow.amount}</td>
                          <td data-label={tw("time")}>
                            {new Date(flow.created_at).toLocaleTimeString(
                              "ru-RU",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ padding: "20px", textAlign: "center" }}>
                    {tw("noOpsForDate")}
                  </p>
                )}
              </div>
            )}
          </div>
        </DataContainer>
      ) : (
        <div style={{ padding: "20px", textAlign: "center" }}>
          {tw("pickPeriod")}
        </div>
      )}
    </div>
  );
};

export default KassaReportsSection;
