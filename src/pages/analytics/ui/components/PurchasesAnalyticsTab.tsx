import { AnimatedNumber } from "@shared/ui/AnimatedNumber";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function PurchasesAnalyticsTab({ vm }: Props) {
  const {
    purchasesData,
    formatNumber,
    formatCurrency,
    formatAnalyticsQty,
  } = vm;
  return (
    <>
        <div className="analytics-page__content">
          <div className="analytics-page__kpis">
            {purchasesData.kpis.map((kpi: any, index: any) => {
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

          <div className="analytics-page__table-card analytics-page__table-card--scrollable">
            <h3 className="analytics-page__table-title">Закупки по поставщикам</h3>
            <div className="analytics-page__table-scroll analytics-page__table-scroll--suppliers">
              <table className="analytics-page__table analytics-page__table--suppliers">
                <thead>
                  <tr>
                    <th>Поставщик</th>
                    <th>SKU</th>
                    <th>Ед. закуплено</th>
                    <th>Сумма закупок</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesData.bySupplier.length > 0 ? (
                    purchasesData.bySupplier.map((row: any, idx: any) => (
                      <tr key={row?.supplier_id || row?.id || row?.name || idx}>
                        <td>
                          {row?.supplier || row?.name || row?.supplier_name || "—"}
                        </td>
                        <td>{row?.purchased_sku_count ?? row?.sku_count ?? 0}</td>
                        <td>
                          {formatAnalyticsQty(
                            row?.purchased_units ?? row?.units ?? 0,
                          )}
                        </td>
                        <td>
                          {formatCurrency(
                            row?.purchased_value ?? row?.value ?? 0,
                            0,
                          )}
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
