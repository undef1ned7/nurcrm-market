import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  PackageCheck,
  X,
} from "lucide-react";
import AddProductPage from "@features/warehouse-ops/ui/AddProductPage";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import {
  buildProductLabel,
  buildSupplierLabel,
  formatMoney,
} from "../supplierReceiptUtils";
import type { SupplierReceiptVm } from "../hooks/useSupplierReceipt";

type Props = {
  vm: SupplierReceiptVm;
};

/**
 * Renders receipt overlays on document.body so `position: fixed`
 * is not trapped by `.nur-route-enter` transform animations.
 */
export function SupplierReceiptModals({ vm }: Props) {
  const {
    createSupplierOpen,
    setCreateSupplierOpen,
    createSupplierName,
    setCreateSupplierName,
    createSupplierPhone,
    setCreateSupplierPhone,
    createSupplierSaving,
    handleCreateSupplier,
    createProductOpen,
    setCreateProductOpen,
    selectedSupplierId,
    loadSupplierProducts,
    alert,
    productsModalOpen,
    setProductsModalOpen,
    productsModalSearch,
    setProductsModalSearch,
    loadModalProducts,
    modalProductsLoading,
    productsLoading,
    modalProducts,
    addProductToReceipt,
    modalProductsPage,
    modalProductsHasPrev,
    modalProductsHasNext,
    modalProductsCount,
    paymentModalOpen,
    setPaymentModalOpen,
    submitting,
    selectedSupplier,
    receiptItems,
    totalReceiptAmount,
    paymentType,
    setPaymentType,
    prepayment,
    setPrepayment,
    debtMonths,
    setDebtMonths,
    firstPaymentDate,
    setFirstPaymentDate,
    paymentSummaryDebt,
    cashExpenseAmount,
    handleConfirmReceipt,
    successModalOpen,
    completedReceiptSnapshot,
    handleCloseSuccessModal,
    handleDownloadInvoice,
    downloadingInvoice,
  } = vm;

  const anyModalOpen =
    createSupplierOpen ||
    createProductOpen ||
    productsModalOpen ||
    paymentModalOpen ||
    (successModalOpen && Boolean(completedReceiptSnapshot));

  if (!anyModalOpen) return null;

  return (
    <ReactPortal wrapperId="supplier-receipt-modals">
      {createSupplierOpen && (
        <div className="market-receipt-page__modal-overlay" onClick={() => setCreateSupplierOpen(false)}>
          <div className="market-receipt-page__modal-card" onClick={(e: any) => e.stopPropagation()}>
            <h3 className="market-receipt-page__modal-title">Новый поставщик</h3>
            <div className="market-receipt-page__field">
              <label className="market-receipt-page__label">Имя *</label>
              <input
                className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                value={createSupplierName}
                onChange={(e: any) => setCreateSupplierName(e.target.value)}
                placeholder="Название/ФИО"
              />
            </div>
            <div className="market-receipt-page__field">
              <label className="market-receipt-page__label">Телефон *</label>
              <input
                className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                value={createSupplierPhone}
                onChange={(e: any) => setCreateSupplierPhone(e.target.value)}
                placeholder="+996..."
              />
            </div>
            <div className="market-receipt-page__actions">
              <button
                type="button"
                className="market-receipt-page__secondary-button"
                onClick={() => setCreateSupplierOpen(false)}
                disabled={createSupplierSaving}
              >
                Отмена
              </button>
              <button
                type="button"
                className="market-receipt-page__primary-button"
                onClick={handleCreateSupplier}
                disabled={createSupplierSaving}
              >
                {createSupplierSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
      {createProductOpen && (
        <div className="market-receipt-page__modal-overlay" onClick={() => setCreateProductOpen(false)}>
          <div
            className="market-receipt-page__modal-card market-receipt-page__modal-card--full"
            onClick={(e: any) => e.stopPropagation()}
          >
            <AddProductPage
              embedded
              forceProductOnly
              embeddedPrefillSupplierId={selectedSupplierId}
              embeddedReturnTo="/crm/market/procurement/receipt"
              onEmbeddedClose={() => setCreateProductOpen(false)}
              onEmbeddedSaved={async () => {
                setCreateProductOpen(false);
                await loadSupplierProducts(selectedSupplierId);
                alert("Товар создан и привязан к поставщику");
              }}
            />
          </div>
        </div>
      )}
      {productsModalOpen && (
        <div
          className="market-receipt-page__modal-overlay"
          onClick={() => setProductsModalOpen(false)}
        >
          <div
            className="market-receipt-page__modal-card market-receipt-page__modal-card--products"
            onClick={(e: any) => e.stopPropagation()}
          >
            <h3 className="market-receipt-page__modal-title">Товары поставщика</h3>
            <div className="market-receipt-page__field market-receipt-page__modal-search-row">
              <input
                className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                value={productsModalSearch}
                onChange={(e: any) => setProductsModalSearch(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void loadModalProducts(1, productsModalSearch);
                  }
                }}
                placeholder="Название, код, артикул, штрихкод"
              />
              <button
                type="button"
                className="market-receipt-page__secondary-button"
                onClick={() => void loadModalProducts(1, productsModalSearch)}
                disabled={modalProductsLoading}
              >
                Поиск
              </button>
            </div>
            <div className="market-receipt-page__field market-receipt-page__modal-products-list">
              {modalProductsLoading || productsLoading ? (
                <div className="market-receipt-page__empty">Загрузка товаров...</div>
              ) : modalProducts.length === 0 ? (
                <div className="market-receipt-page__empty">Товары не найдены</div>
              ) : (
                <div className="market-receipt-page__modal-products-grid">
                  {modalProducts.map((product: any) => {
                    const productId = String(product?.id || "");
                    return (
                      <button
                        key={`modal-product-${productId}`}
                        type="button"
                        className="market-receipt-page__modal-product-item"
                        onClick={() => {
                          addProductToReceipt(productId, product);
                          setProductsModalOpen(false);
                        }}
                      >
                        <span className="market-receipt-page__modal-product-title">
                          {buildProductLabel(product)}
                        </span>
                        <span className="market-receipt-page__modal-product-code">
                          {product.code || product.article || "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="market-receipt-page__actions market-receipt-page__modal-actions market-receipt-page__modal-pagination">
              <button
                type="button"
                className="market-receipt-page__secondary-button market-receipt-page__pagination-button"
                onClick={() => void loadModalProducts(modalProductsPage - 1, productsModalSearch)}
                disabled={!modalProductsHasPrev || modalProductsLoading}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="market-receipt-page__modal-hint">
                Страница {modalProductsPage}, всего: {modalProductsCount}
              </span>
              <button
                type="button"
                className="market-receipt-page__secondary-button market-receipt-page__pagination-button"
                onClick={() => void loadModalProducts(modalProductsPage + 1, productsModalSearch)}
                disabled={!modalProductsHasNext || modalProductsLoading}
                aria-label="Следующая страница"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="market-receipt-page__actions">
              <button
                type="button"
                className="market-receipt-page__secondary-button"
                onClick={() => setProductsModalOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      {paymentModalOpen && (
        <div
          className="market-receipt-page__modal-overlay"
          onClick={() => !submitting && setPaymentModalOpen(false)}
        >
          <div
            className="market-receipt-page__modal-card market-receipt-page__modal-card--payment"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="market-receipt-page__payment-modal-head">
              <h3 className="market-receipt-page__modal-title">
                Подтверждение оплаты
              </h3>
              <button
                type="button"
                className="market-receipt-page__detail-close"
                onClick={() => !submitting && setPaymentModalOpen(false)}
                disabled={submitting}
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="market-receipt-page__payment-modal-summary">
              <div>
                <span>Поставщик</span>
                <strong>{buildSupplierLabel(selectedSupplier)}</strong>
              </div>
              <div>
                <span>Позиций</span>
                <strong>{receiptItems.length}</strong>
              </div>
              <div>
                <span>Сумма накладной</span>
                <strong>{formatMoney(totalReceiptAmount)}</strong>
              </div>
            </div>

            {totalReceiptAmount > 0 ? (
              <>
                <div className="market-receipt-page__payment-grid">
                  <div className="market-receipt-page__field">
                    <label className="market-receipt-page__label">Тип оплаты</label>
                    <select
                      className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                      value={paymentType}
                      onChange={(e: any) => setPaymentType(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="full">Наличные (полная оплата)</option>
                      <option value="prepayment">Предоплата</option>
                      <option value="debt">В долг поставщику</option>
                    </select>
                  </div>
                  {paymentType === "prepayment" && (
                    <div className="market-receipt-page__field">
                      <label className="market-receipt-page__label">Сумма предоплаты</label>
                      <input
                        className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                        type="number"
                        min={0}
                        step="0.01"
                        value={prepayment}
                        onChange={(e: any) => setPrepayment(e.target.value)}
                        disabled={submitting}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                  {(paymentType === "debt" || paymentType === "prepayment") && (
                    <>
                      <div className="market-receipt-page__field">
                        <label className="market-receipt-page__label">Срок долга (мес.)</label>
                        <input
                          className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                          type="number"
                          min={1}
                          step={1}
                          value={debtMonths}
                          onChange={(e: any) => setDebtMonths(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="market-receipt-page__field">
                        <label className="market-receipt-page__label">Дата первой оплаты</label>
                        <input
                          className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                          type="date"
                          value={firstPaymentDate}
                          onChange={(e: any) => setFirstPaymentDate(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </>
                  )}
                </div>
                <p className="market-receipt-page__payment-hint">
                  {paymentType === "debt" ? (
                    <>
                      Долг поставщику:{" "}
                      <strong>{formatMoney(paymentSummaryDebt)}</strong>
                    </>
                  ) : (
                    <>
                      К списанию из кассы:{" "}
                      <strong>{formatMoney(cashExpenseAmount)}</strong>
                      {paymentSummaryDebt > 0 && (
                        <>
                          {" "}
                          · остаток в долг:{" "}
                          <strong>{formatMoney(paymentSummaryDebt)}</strong>
                        </>
                      )}
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="market-receipt-page__modal-hint">
                Сумма накладной равна нулю — оплата не требуется. Подтвердите
                оприходование товаров.
              </p>
            )}

            <div className="market-receipt-page__actions market-receipt-page__modal-actions">
              <button
                type="button"
                className="market-receipt-page__secondary-button"
                onClick={() => setPaymentModalOpen(false)}
                disabled={submitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="market-receipt-page__primary-button"
                onClick={() => void handleConfirmReceipt()}
                disabled={submitting}
              >
                <PackageCheck size={16} />
                {submitting ? "Оприходуем..." : "Подтвердить и оприходовать"}
              </button>
            </div>
          </div>
        </div>
      )}
      {successModalOpen && completedReceiptSnapshot && (
        <div className="market-receipt-page__modal-overlay">
          <div
            className="market-receipt-page__modal-card market-receipt-page__modal-card--success"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="market-receipt-page__success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="market-receipt-page__modal-title">Оприходование завершено</h3>
            <p className="market-receipt-page__modal-hint market-receipt-page__success-text">
              Товары успешно оприходованы у поставщика{" "}
              <strong>{buildSupplierLabel((completedReceiptSnapshot as any).supplier)}</strong>
              . Сумма накладной:{" "}
              <strong>{formatMoney((completedReceiptSnapshot as any).total)}</strong>
            </p>
            <div className="market-receipt-page__actions market-receipt-page__modal-actions">
              <button
                type="button"
                className="market-receipt-page__secondary-button"
                onClick={handleCloseSuccessModal}
              >
                Закрыть
              </button>
              <button
                type="button"
                className="market-receipt-page__primary-button"
                onClick={() =>
                  void handleDownloadInvoice(completedReceiptSnapshot)
                }
                disabled={downloadingInvoice}
              >
                <Download size={16} />
                {downloadingInvoice ? "Скачиваем..." : "Скачать накладную"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ReactPortal>
  );
}
