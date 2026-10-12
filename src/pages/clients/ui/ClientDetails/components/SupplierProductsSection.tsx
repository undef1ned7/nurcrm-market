import { Package, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { SupplierProduct } from "../clientDetails.types";

export interface SupplierProductsSectionProps {
  clientId?: string | number | null;
  supplierProductSearch: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  supplierProductsLoading: boolean;
  supplierProductsErr?: string | null;
  supplierProductsLength: number;
  filteredSupplierProducts: SupplierProduct[];
  supplierProductsCountLabel: string | number;
}

export function SupplierProductsSection({
  clientId,
  supplierProductSearch,
  onSearchChange,
  onRefresh,
  supplierProductsLoading,
  supplierProductsErr,
  supplierProductsLength,
  filteredSupplierProducts,
  supplierProductsCountLabel,
}: SupplierProductsSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="cdx__card">
      <div className="cdx__supplier-head">
        <div>
          <h3 className="cdx__card-title">
            <Package /> {t("crm.clients.details.spTitle")}
          </h3>
          <div className="cdx__supplier-subtitle">
            {t("crm.clients.details.spSubtitle")}
          </div>
        </div>

        <div className="cdx__supplier-actions">
          <input
            type="text"
            className="cdx__input"
            placeholder={t("crm.clients.details.spSearchPlaceholder")}
            value={supplierProductSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            type="button"
            className="cdx__btn cdx__btn--secondary"
            onClick={onRefresh}
            disabled={!clientId || supplierProductsLoading}
          >
            <RefreshCw />
            {supplierProductsLoading
              ? t("crm.clients.details.refreshing")
              : t("crm.clients.details.spRefresh")}
          </button>
        </div>
      </div>

      <div className="cdx__supplier-summary">
        <div className="cdx__supplier-chip">
          {t("crm.clients.details.spTotal")}: <b>{supplierProductsLength}</b>
        </div>
        <div className="cdx__supplier-chip">
          {t("crm.clients.details.shown")}: <b>{supplierProductsCountLabel}</b>
        </div>
      </div>

      {supplierProductsErr && (
        <div style={{ padding: "16px 22px 0" }}>
          <div className="cdx__alert">{supplierProductsErr}</div>
        </div>
      )}

      {supplierProductsLoading ? (
        <div className="cdx__state">{t("common.loading")}</div>
      ) : filteredSupplierProducts.length === 0 ? (
        <div className="cdx__state">
          {supplierProductSearch.trim()
            ? t("crm.clients.details.spEmptySearch")
            : t("crm.clients.details.spEmpty")}
        </div>
      ) : (
        <>
          <div className="cdx__supplier-table-wrap">
            <table className="cdx__supplier-table">
              <thead>
                <tr>
                  <th>{t("crm.clients.details.colProduct")}</th>
                  <th>{t("crm.clients.details.colCode")}</th>
                  <th>{t("crm.clients.details.colArticle")}</th>
                  <th>{t("crm.clients.details.colBarcode")}</th>
                  <th>{t("crm.clients.details.colStock")}</th>
                  <th>{t("crm.clients.details.colUnit")}</th>
                  <th>{t("crm.clients.details.colPurchasePrice")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplierProducts.map((product) => (
                  <tr key={product?.id || product?.code || product?.barcode}>
                    <td>
                      {product?.name ||
                        product?.title ||
                        t("crm.clients.details.noTitle")}
                    </td>
                    <td>{product?.code || "—"}</td>
                    <td>{product?.article || "—"}</td>
                    <td>{product?.barcode || "—"}</td>
                    <td>{product?.quantity ?? 0}</td>
                    <td>{product?.unit || "—"}</td>
                    <td>
                      {product?.purchase_price ?? product?.price ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cdx__supplier-cards">
            {filteredSupplierProducts.map((product) => (
              <div
                key={`card-${product?.id || product?.code || product?.barcode}`}
                className="cdx__supplier-card"
              >
                <div className="cdx__supplier-card-name">
                  {product?.name ||
                    product?.title ||
                    t("crm.clients.details.noTitle")}
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colCode")}</span>
                  <strong>{product?.code || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colArticle")}</span>
                  <strong>{product?.article || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colBarcode")}</span>
                  <strong>{product?.barcode || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colStock")}</span>
                  <strong>{product?.quantity ?? 0}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colUnit")}</span>
                  <strong>{product?.unit || "—"}</strong>
                </div>
                <div className="cdx__supplier-card-row">
                  <span>{t("crm.clients.details.colPurchasePrice")}</span>
                  <strong>
                    {product?.purchase_price ?? product?.price ?? "—"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
