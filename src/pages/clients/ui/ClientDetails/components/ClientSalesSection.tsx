import { CalendarDays, ReceiptText } from "lucide-react";

import type { PosSaleRecord } from "../clientDetails.types";
import { fmtSaleDate, saleStatusRu } from "../clientDetails.utils";

export interface ClientSalesSectionProps {
  filteredClientSales: PosSaleRecord[];
  clientSalesLoading: boolean;
  clientSalesErr?: string | null;
}

export function ClientSalesSection({
  filteredClientSales,
  clientSalesLoading,
  clientSalesErr,
}: ClientSalesSectionProps) {
  return (
    <div className="cdx__deals">
      <div className="cdx__deals-head">
        <h3 className="cdx__deals-title">
          <ReceiptText /> История продаж
        </h3>
        <span className="cdx__deals-count">{filteredClientSales.length}</span>
      </div>

      <div className="cdx__deals-body">
        {clientSalesLoading && <div className="cdx__state">Загрузка…</div>}
        {clientSalesErr && <div className="cdx__alert">{clientSalesErr}</div>}
        {!clientSalesLoading &&
          !clientSalesErr &&
          filteredClientSales.length === 0 && (
            <div className="cdx__state">Продаж нет</div>
          )}

        {filteredClientSales.map((sale, idx) => {
          const st = saleStatusRu(sale.status);
          const items = Array.isArray(sale.items) ? sale.items : [];
          const itemsLabel = items
            .slice(0, 3)
            .map(
              (it) =>
                `${it.product_name || it.name_snapshot || "Товар"} ×${Number(
                  it.quantity || 0,
                )}`,
            )
            .join(", ");
          const moreCount = Math.max(0, items.length - 3);
          return (
            <div key={sale.id || idx} className="cdx__deal">
              <div className="cdx__deal-main">
                <span className="cdx__deal-name">
                  Продажа №{filteredClientSales.length - idx}
                </span>
                <div className="cdx__deal-meta">
                  <span className={`cdx__badge cdx__badge--${st.mod}`}>
                    {st.label}
                  </span>
                  <span className="cdx__deal-meta-item">
                    <CalendarDays />
                    {fmtSaleDate(sale.created_at || sale.paid_at)}
                  </span>
                  {itemsLabel && (
                    <span className="cdx__deal-meta-item" title={itemsLabel}>
                      {itemsLabel}
                      {moreCount > 0 ? ` +${moreCount}` : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="cdx__deal-money">
                <div className="cdx__deal-amount">
                  {Number(sale.total || 0).toFixed(2)}
                  <span className="cdx__deal-amount-cur">сом</span>
                </div>
                {Number(sale.discount_total || 0) > 0 && (
                  <div className="cdx__deal-remaining">
                    Скидка: {Number(sale.discount_total).toFixed(2)} сом
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
