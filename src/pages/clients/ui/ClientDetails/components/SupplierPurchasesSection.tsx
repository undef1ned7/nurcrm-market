import { Package, RefreshCw } from "lucide-react";

import type { SupplierPurchase } from "../clientDetails.types";

export interface SupplierPurchasesTotals {
  amount: number;
  count: number;
}

export interface SupplierPurchasesSectionProps {
  clientId?: string | number | null;
  onRefresh: () => void;
  loading: boolean;
  err?: string | null;
  apiMissing: boolean;
  purchases: SupplierPurchase[];
  totals: SupplierPurchasesTotals;
}

export function SupplierPurchasesSection({
  clientId,
  onRefresh,
  loading,
  err,
  apiMissing,
  purchases,
  totals,
}: SupplierPurchasesSectionProps) {
  return (
    <div className="cdx__card">
      <div className="cdx__supplier-head">
        <div>
          <h3 className="cdx__card-title">
            <Package /> История закупок
          </h3>
          <div className="cdx__supplier-subtitle">
            Сколько и когда закуплено у этого поставщика
          </div>
        </div>
        <div className="cdx__supplier-actions">
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onRefresh}
            disabled={!clientId || loading}
          >
            <RefreshCw />
            {loading ? "Обновляем..." : "Обновить"}
          </button>
        </div>
      </div>

      <div className="cdx__supplier-summary">
        <div className="cdx__supplier-chip">
          Закупок: <b>{totals.count}</b>
        </div>
        <div className="cdx__supplier-chip">
          На сумму:{" "}
          <b>
            {totals.amount.toLocaleString("ru-RU", {
              maximumFractionDigits: 2,
            })}{" "}
            сом
          </b>
        </div>
      </div>

      {err && (
        <div style={{ padding: "16px 22px 0" }}>
          <div className="cdx__alert">{err}</div>
        </div>
      )}

      {apiMissing ? (
        <div className="cdx__state">
          История закупок станет доступна после обновления сервера
        </div>
      ) : loading ? (
        <div className="cdx__state">Загрузка…</div>
      ) : purchases.length === 0 ? (
        <div className="cdx__state">
          Закупок у этого поставщика пока не было
        </div>
      ) : (
        <div className="cdx__supplier-table-wrap">
          <table className="cdx__supplier-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Товар</th>
                <th>Кол-во</th>
                <th>Ед.</th>
                <th>Сумма</th>
                <th>Оплата</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((row, idx) => (
                <tr key={row?.id || idx}>
                  <td>
                    {row?.purchased_at || row?.created_at
                      ? new Date(
                          row.purchased_at || row.created_at || "",
                        ).toLocaleString("ru-RU")
                      : "—"}
                  </td>
                  <td>{row?.product_name || row?.name || "—"}</td>
                  <td>{row?.quantity ?? "—"}</td>
                  <td>{row?.unit || "—"}</td>
                  <td>
                    {Number(
                      row?.amount ?? row?.total ?? 0,
                    ).toLocaleString("ru-RU", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    сом
                  </td>
                  <td>
                    {row?.payment_type === "debt"
                      ? "Долг"
                      : row?.payment_type === "prepayment"
                        ? "Предоплата"
                        : row?.payment_type
                          ? "Оплачено"
                          : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
