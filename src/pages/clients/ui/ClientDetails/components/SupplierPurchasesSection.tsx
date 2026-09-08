import { Package, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <div className="cdx__card">
      <div className="cdx__supplier-head">
        <div>
          <h3 className="cdx__card-title">
            <Package /> {t("crm.clients.details.sphTitle")}
          </h3>
          <div className="cdx__supplier-subtitle">
            {t("crm.clients.details.sphSubtitle")}
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
            {loading
              ? t("crm.clients.details.refreshing")
              : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="cdx__supplier-summary">
        <div className="cdx__supplier-chip">
          {t("crm.clients.details.sphCount")}: <b>{totals.count}</b>
        </div>
        <div className="cdx__supplier-chip">
          {t("crm.clients.details.sphSum")}:{" "}
          <b>
            {totals.amount.toLocaleString("ru-RU", {
              maximumFractionDigits: 2,
            })}{" "}
            {t("common.currencySom")}
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
          {t("crm.clients.details.sphApiMissing")}
        </div>
      ) : loading ? (
        <div className="cdx__state">{t("common.loading")}</div>
      ) : purchases.length === 0 ? (
        <div className="cdx__state">{t("crm.clients.details.sphEmpty")}</div>
      ) : (
        <div className="cdx__supplier-table-wrap">
          <table className="cdx__supplier-table">
            <thead>
              <tr>
                <th>{t("common.date")}</th>
                <th>{t("crm.clients.details.colProduct")}</th>
                <th>{t("crm.clients.details.colQty")}</th>
                <th>{t("crm.clients.details.colUnitShort")}</th>
                <th>{t("common.amount")}</th>
                <th>{t("crm.clients.details.colPayment")}</th>
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
                    {t("common.currencySom")}
                  </td>
                  <td>
                    {row?.payment_type === "debt"
                      ? t("crm.clients.details.debt")
                      : row?.payment_type === "prepayment"
                        ? t("crm.clients.details.prepayment")
                        : row?.payment_type
                          ? t("crm.clients.details.paymentPaid")
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
