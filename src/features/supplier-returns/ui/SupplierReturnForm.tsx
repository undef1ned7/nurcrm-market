import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Clock,
  FileText,
  MoreHorizontal,
  PackagePlus,
  PackageSearch,
  PackageX,
  Scale,
  Search,
  Truck,
  Undo2,
  Warehouse,
} from "lucide-react";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import { PageHeader, PageShell } from "@shared/ui/page-shell";
import { formatMoney, formatQty } from "../lib/formatReturn";
import { lineTotal } from "../lib/returnMath";
import { COMPENSATION_OPTIONS, REASON_OPTIONS } from "../model/constants";
import type { CompensationType, ReturnReason } from "../model/types";
import { useSupplierReturnForm } from "../model/useSupplierReturnForm";
import "./SupplierReturnForm.scss";

const REASON_ICONS: Record<ReturnReason, ReactNode> = {
  defect: <AlertTriangle size={15} />,
  surplus: <PackagePlus size={15} />,
  wrong_item: <Truck size={15} />,
  expired: <Clock size={15} />,
  other: <MoreHorizontal size={15} />,
};

const COMPENSATION_ICONS: Record<CompensationType, ReactNode> = {
  cash: <Banknote size={18} />,
  debt_offset: <Scale size={18} />,
  none: <Warehouse size={18} />,
};

export function SupplierReturnForm() {
  const { t } = useTranslation();
  const COMPENSATION_SHORT_LABELS: Record<CompensationType, string> = {
    cash: t("crm.procurement.compensationShortCash"),
    debt_offset: t("crm.procurement.compensationShortDebtOffset"),
    none: t("crm.procurement.compensationShortNone"),
  };
  const vm = useSupplierReturnForm();
  const {
    navigate,
    suppliersLoading,
    supplierOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    productsLoading,
    receiptLoading,
    receiptId,
    visibleProducts,
    search,
    setSearch,
    qtyByProductId,
    priceByProductId,
    handleQtyChange,
    handlePriceChange,
    fillMax,
    reason,
    setReason,
    comment,
    setComment,
    compensation,
    setCompensation,
    cashBoxes,
    cashboxId,
    setCashboxId,
    selectedCount,
    totalAmount,
    submitting,
    source,
    submit,
    canSubmit,
    validationError,
  } = vm;

  const selectedCompensation = COMPENSATION_OPTIONS.find(
    (option) => option.value === compensation,
  );
  const loadingCatalog = productsLoading || receiptLoading;
  const hasSupplier = Boolean(selectedSupplierId);

  return (
    <PageShell className="supplier-return-form">
      <PageHeader
        title={t("crm.procurement.returnTitle")}
        subtitle={
          receiptId
            ? t("crm.procurement.returnSubtitleReceipt")
            : t("crm.procurement.returnSubtitleDefault")
        }
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => navigate("/crm/market/procurement?tab=returns")}
          >
            <ArrowLeft size={16} />
            {t("crm.procurement.returnsTab")}
          </button>
        }
      />

      {source === "composed" ? (
        <div className="srf__banner" role="status">
          {t("crm.procurement.returnFormApiBanner")}
        </div>
      ) : null}

      <div className="srf">
        <div className="srf__grid">
          <aside className="srf__aside">
            <section className="srf__card">
              <header className="srf__card-head">
                <span className="srf__step">1</span>
                <div>
                  <h2>{t("crm.procurement.returnFormDocument")}</h2>
                  <p>{t("crm.procurement.returnFormDocumentHint")}</p>
                </div>
              </header>

              <label className="srf__field">
                <span>{t("crm.procurement.colSupplier")}</span>
                <SearchableCombobox
                  value={selectedSupplierId}
                  onChange={(value: string) =>
                    setSelectedSupplierId(String(value || ""))
                  }
                  options={supplierOptions}
                  placeholder={
                    suppliersLoading
                      ? t("crm.procurement.suppliersLoading")
                      : t("crm.procurement.findSupplier")
                  }
                  classNamePrefix="searchableCombo"
                  menuPortal
                  disabled={Boolean(receiptId)}
                />
              </label>

              {receiptId ? (
                <div className="srf__receipt">
                  <FileText size={15} />
                  {t("crm.procurement.returnFormReceiptHint")}
                </div>
              ) : null}

              <div className="srf__field">
                <span>{t("crm.procurement.reasonLabel")}</span>
                <div
                  className="srf__chips"
                  role="radiogroup"
                  aria-label={t("crm.procurement.reasonLabel")}
                >
                  {REASON_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`srf__chip${reason === option.value ? " is-active" : ""}`}
                      aria-pressed={reason === option.value}
                      onClick={() => setReason(option.value)}
                    >
                      {REASON_ICONS[option.value]}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="srf__field">
                <span>
                  {t("crm.procurement.commentLabel")}
                  {reason === "other" ? " *" : ""}
                </span>
                <textarea
                  className="srf__textarea"
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={
                    reason === "other"
                      ? t("crm.procurement.commentPlaceholderRequired")
                      : t("crm.procurement.commentPlaceholderOptional")
                  }
                />
              </label>
            </section>

            <section className="srf__card">
              <header className="srf__card-head">
                <span className="srf__step">2</span>
                <div>
                  <h2>{t("crm.procurement.returnFormMoney")}</h2>
                  <p>{t("crm.procurement.returnFormMoneyHint")}</p>
                </div>
              </header>

              <div
                className="srf__money"
                role="radiogroup"
                aria-label={t("crm.procurement.colCompensation")}
              >
                {COMPENSATION_OPTIONS.map((option) => {
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`srf__money-btn${
                        compensation === option.value ? " is-active" : ""
                      }`}
                      aria-pressed={compensation === option.value}
                      onClick={() => setCompensation(option.value)}
                    >
                      <span className="srf__money-icon">
                        {COMPENSATION_ICONS[option.value]}
                      </span>
                      <strong>{COMPENSATION_SHORT_LABELS[option.value]}</strong>
                    </button>
                  );
                })}
              </div>

              {selectedCompensation ? (
                <p className="srf__hint">{selectedCompensation.hint}</p>
              ) : null}

              {compensation === "cash" ? (
                <p className="srf__hint">{t("crm.procurement.cashCompensationHint")}</p>
              ) : null}

              {compensation === "debt_offset" && source === "composed" ? (
                <p className="srf__warn">{t("crm.procurement.debtOffsetNoApiWarn")}</p>
              ) : null}
            </section>
          </aside>

          <section className="srf__stage">
            <header className="srf__stage-head">
              <div>
                <h2>{t("crm.procurement.returnFormProducts")}</h2>
                <p>
                  {hasSupplier
                    ? t("crm.procurement.returnFormProductsSummary", {
                        count: visibleProducts.length,
                        selected: selectedCount,
                      })
                    : t("crm.procurement.returnFormSelectSupplierFirst")}
                </p>
              </div>
              <label className="srf__search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("crm.procurement.returnFormSearchPlaceholder")}
                  disabled={!hasSupplier}
                />
              </label>
            </header>

            {!hasSupplier ? (
              <div className="srf__empty">
                <PackageSearch size={36} />
                <strong>{t("crm.procurement.returnFormSelectSupplier")}</strong>
                <span>{t("crm.procurement.returnFormSelectSupplierHint")}</span>
              </div>
            ) : loadingCatalog ? (
              <div className="srf__empty">
                <span className="srf__spinner" aria-hidden />
                <strong>{t("crm.procurement.returnFormLoadingProducts")}</strong>
                <span>{t("crm.procurement.returnFormLoadingProductsHint")}</span>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="srf__empty">
                <PackageX size={36} />
                <strong>{t("crm.procurement.returnFormNothingToReturn")}</strong>
                <span>
                  {receiptId
                    ? t("crm.procurement.returnFormNoReturnableInReceipt")
                    : search
                      ? t("crm.procurement.returnFormSearchEmpty")
                      : t("crm.procurement.returnFormSupplierNoStock")}
                </span>
              </div>
            ) : (
              <div className="srf__table-wrap">
                <table className="srf__table">
                  <thead>
                    <tr>
                      <th>{t("crm.procurement.returnFormColProduct")}</th>
                      <th>{t("crm.procurement.returnFormColInStock")}</th>
                      {receiptId ? (
                        <th>{t("crm.procurement.returnFormColPurchasedReturned")}</th>
                      ) : null}
                      <th>{t("crm.procurement.returnFormColAvailable")}</th>
                      <th>{t("crm.procurement.returnFormColPrice")}</th>
                      <th>{t("crm.procurement.colQty")}</th>
                      <th>{t("crm.procurement.colAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => {
                      const qty = Number(
                        String(qtyByProductId[product.productId] || "").replace(
                          ",",
                          ".",
                        ),
                      );
                      const selected = Number.isFinite(qty) && qty > 0;
                      const price = Number(
                        String(
                          priceByProductId[product.productId] ??
                            product.purchasePrice,
                        ).replace(",", "."),
                      );
                      const sum = selected
                        ? lineTotal(qty, Number.isFinite(price) ? price : 0)
                        : 0;
                      return (
                        <tr
                          key={product.productId}
                          className={selected ? "is-selected" : undefined}
                        >
                          <td>
                            <div className="srf__product">
                              <strong>{product.productName}</strong>
                              <span>
                                {[product.barcode, product.article, product.code]
                                  .filter(Boolean)
                                  .join(" · ") || product.unit}
                              </span>
                            </div>
                          </td>
                          <td>
                            {formatQty(product.currentStock)}{" "}
                            <small>{product.unit}</small>
                          </td>
                          {receiptId ? (
                            <td>
                              {formatQty(product.purchasedQty ?? 0)}
                              <small> / {formatQty(product.alreadyReturnedQty)}</small>
                            </td>
                          ) : null}
                          <td>
                            <span className="srf__returnable">
                              {formatQty(product.returnableQty)}
                            </span>
                          </td>
                          <td>
                            <input
                              className="srf__num"
                              inputMode="decimal"
                              value={priceByProductId[product.productId] ?? ""}
                              onChange={(event) =>
                                handlePriceChange(
                                  product.productId,
                                  event.target.value,
                                )
                              }
                              aria-label={t("crm.procurement.returnFormPriceFor", {
                                name: product.productName,
                              })}
                            />
                          </td>
                          <td>
                            <div className="srf__qty">
                              <input
                                className="srf__num"
                                inputMode="decimal"
                                value={qtyByProductId[product.productId] ?? ""}
                                onChange={(event) =>
                                  handleQtyChange(
                                    product.productId,
                                    event.target.value,
                                    product.isWeight,
                                  )
                                }
                                placeholder="0"
                                disabled={product.returnableQty <= 0}
                                aria-label={t("crm.procurement.returnFormQtyFor", {
                                  name: product.productName,
                                })}
                              />
                              <button
                                type="button"
                                onClick={() => fillMax(product)}
                                disabled={product.returnableQty <= 0}
                              >
                                {t("crm.procurement.returnFormFillMax")}
                              </button>
                            </div>
                          </td>
                          <td className="srf__sum">
                            {selected ? formatMoney(sum) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="srf__dock">
          <div className="srf__dock-stats">
            <div>
              <span>{t("crm.procurement.colItems")}</span>
              <strong>{selectedCount}</strong>
            </div>
            <div>
              <span>{t("crm.procurement.returnFormTotalAmount")}</span>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>
          </div>
          <div className="srf__dock-action">
            {validationError && selectedCount > 0 ? (
              <p className="srf__dock-error">{validationError}</p>
            ) : (
              <p className="srf__dock-hint">{t("crm.procurement.returnFormDockHint")}</p>
            )}
            <button
              type="button"
              className="nur-btn nur-btn--primary srf__submit"
              onClick={submit}
              disabled={!canSubmit}
            >
              <Undo2 size={18} />
              {submitting ? t("common.saving") : t("crm.procurement.submitReturn")}
            </button>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
