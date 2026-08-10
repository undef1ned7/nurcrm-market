import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function SuppliersAnalyticsTab({ vm }: Props) {
  const {
    suppliersData,
    formatNumber,
    formatCurrency,
    formatAnalyticsQty,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {suppliersData.kpis.map((kpi: any, index: any) => {
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

          <div className="analytics-page__grid">
            <div className="analytics-page__table-card analytics-page__table-card--scrollable">
              <h3 className="analytics-page__table-title">
                Поставщики по продажам
              </h3>
              <div className="analytics-page__table-scroll analytics-page__table-scroll--suppliers">
                <table className="analytics-page__table analytics-page__table--suppliers">
                  <thead>
                    <tr>
                      <th>Поставщик</th>
                      <th>Телефон</th>
                      <th>SKU</th>
                      <th>Остаток</th>
                      <th>Стоимость остатков</th>
                      <th>Продано</th>
                      <th>Выручка</th>
                      <th>Чеков</th>
                      <th>Место по продажам</th>
                      <th>Место по складу</th>
                      <th>Рейтинг</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersData.suppliers.length > 0 ? (
                      suppliersData.suppliers.map((row: any) => (
                        <tr key={row.supplier_id || row.name}>
                          <td>{row.name}</td>
                          <td>{row.phone}</td>
                          <td>{row.products_count}</td>
                          <td>{formatAnalyticsQty(row.stock_qty)}</td>
                          <td>{formatCurrency(row.stock_value, 0)}</td>
                          <td>{formatAnalyticsQty(row.period_qty_sold)}</td>
                          <td>{formatCurrency(row.period_revenue, 0)}</td>
                          <td>{row.period_transactions}</td>
                          <td>{row.rank_by_qty}</td>
                          <td>{row.rank_by_stock}</td>
                          <td>{Number(row.rating || 0).toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
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

            <div className="analytics-page__table-card analytics-page__table-card--scrollable">
              <h3 className="analytics-page__table-title">
                Поставщики по складу
              </h3>
              <div className="analytics-page__table-scroll analytics-page__table-scroll--suppliers">
                <table className="analytics-page__table analytics-page__table--suppliers">
                  <thead>
                    <tr>
                      <th>Поставщик</th>
                      <th>Телефон</th>
                      <th>SKU</th>
                      <th>Остаток</th>
                      <th>Стоимость остатков</th>
                      <th>Продано</th>
                      <th>Выручка</th>
                      <th>Чеков</th>
                      <th>Место по продажам</th>
                      <th>Место по складу</th>
                      <th>Рейтинг</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliersData.suppliersByStock.length > 0 ? (
                      suppliersData.suppliersByStock.map((row: any) => (
                        <tr key={`stock-${row.supplier_id || row.name}`}>
                          <td>{row.name}</td>
                          <td>{row.phone}</td>
                          <td>{row.products_count}</td>
                          <td>{formatAnalyticsQty(row.stock_qty)}</td>
                          <td>{formatCurrency(row.stock_value, 0)}</td>
                          <td>{formatAnalyticsQty(row.period_qty_sold)}</td>
                          <td>{formatCurrency(row.period_revenue, 0)}</td>
                          <td>{row.period_transactions}</td>
                          <td>{row.rank_by_qty}</td>
                          <td>{row.rank_by_stock}</td>
                          <td>{Number(row.rating || 0).toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
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
        </div>
    </>
  );
}
