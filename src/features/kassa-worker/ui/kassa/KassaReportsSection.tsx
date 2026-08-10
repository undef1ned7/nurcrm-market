import DataContainer from "@shared/ui/DataContainer/DataContainer";
const KassaReportsSection = ({
  reportType, setReportType, selectedMonth, setSelectedMonth,
  selectedDate, setSelectedDate, reportLoading, reportData,
}: any) => (
        <div className="cashbox-reports">
          <div className="cashbox-reports__tabs">
            <button
              className={`cashbox-reports__tab ${reportType === "monthly" ? "cashbox-reports__tab--active" : ""
                }`}
              onClick={() => setReportType("monthly")}
            >
              Ежемесячный отчет
            </button>
            <button
              className={`cashbox-reports__tab ${reportType === "daily" ? "cashbox-reports__tab--active" : ""
                }`}
              onClick={() => setReportType("daily")}
            >
              Дневной отчет
            </button>
          </div>

          <div className="cashbox-reports__filters">
            {reportType === "monthly" ? (
              <div className="cashbox-reports__filter-group">
                <label htmlFor="month-select">Выберите месяц:</label>
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
                <label htmlFor="date-select">Выберите дату:</label>
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
              Загрузка отчета...
            </div>
          ) : reportData ? (
            <DataContainer>

              <div className="cashbox-reports__content">
                <div className="cashbox-reports__summary">
                  <div className="cashbox-reports__summary-item">
                    <span className="cashbox-reports__summary-label">
                      Приход:
                    </span>
                    <span className="cashbox-reports__summary-value cashbox-reports__summary-value--income">
                      {reportData.totalIncome.toFixed(2)} сом
                    </span>
                  </div>
                  <div className="cashbox-reports__summary-item">
                    <span className="cashbox-reports__summary-label">
                      Расход:
                    </span>
                    <span className="cashbox-reports__summary-value cashbox-reports__summary-value--expense">
                      {reportData.totalExpense.toFixed(2)} сом
                    </span>
                  </div>
                  <div className="cashbox-reports__summary-item">
                    <span className="cashbox-reports__summary-label">Итого:</span>
                    <span
                      className={`cashbox-reports__summary-value ${reportData.net >= 0
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
                      .sort(([a], [b]) => Number(new Date(b as any)) - Number(new Date(a as any)))
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
                              <span>Приход: {data.income.toFixed(2)} сом</span>
                              <span>Расход: {data.expense.toFixed(2)} сом</span>
                              <span>
                                Итого: {(data.income - data.expense).toFixed(2)}{" "}
                                сом
                              </span>
                            </div>
                          </div>
                          <table className="nur-table kassa-table">
                            <thead>
                              <tr>
                                <th>Тип</th>
                                <th>Наименование</th>
                                <th>Сумма</th>
                                <th>Время</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.flows.map((flow) => (
                                <tr key={flow.id}>
                                  <td data-label="Тип">
                                    {flow.type === "income" ? "Приход" : "Расход"}
                                  </td>
                                  <td data-label="Наименование">
                                    {flow.name || flow.title}
                                  </td>
                                  <td data-label="Сумма">{flow.amount}</td>
                                  <td data-label="Время">
                                    {new Date(flow.created_at).toLocaleTimeString(
                                      "ru-RU",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
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
                            <th>Тип</th>
                            <th>Наименование</th>
                            <th>Сумма</th>
                            <th>Время</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.flows.map((flow) => (
                            <tr key={flow.id}>
                              <td data-label="Тип">
                                {flow.type === "income" ? "Приход" : "Расход"}
                              </td>
                              <td data-label="Наименование">
                                {flow.name || flow.title}
                              </td>
                              <td data-label="Сумма">{flow.amount}</td>
                              <td data-label="Время">
                                {new Date(flow.created_at).toLocaleTimeString(
                                  "ru-RU",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ padding: "20px", textAlign: "center" }}>
                        Нет операций за выбранную дату
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DataContainer>

          ) : (
            <div style={{ padding: "20px", textAlign: "center" }}>
              Выберите период для просмотра отчета
            </div>
          )}
        </div>
);

export default KassaReportsSection;
