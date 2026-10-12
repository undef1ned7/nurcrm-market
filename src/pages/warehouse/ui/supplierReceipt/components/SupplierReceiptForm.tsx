import { Plus, RefreshCw } from "lucide-react";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import { FilterBar } from "@shared/ui/page-shell";
import {
  buildSupplierLabel,
  formatMoney,
  formatQty,
} from "../supplierReceiptUtils";
import type { SupplierReceiptVm } from "../hooks/useSupplierReceipt";

type Props = {
  vm: SupplierReceiptVm;
};

export function SupplierReceiptForm({ vm }: Props) {
  const {
    suppliersLoading,
    selectedSupplierId,
    setSelectedSupplierId,
    setCreateSupplierOpen,
    selectedSupplier,
    receiptItems,
    totalReceiptQty,
    totalReceiptAmount,
    setProductsModalOpen,
    setCreateProductOpen,
    loadSupplierProducts,
    productsLoading,
    submitting,
    handleClearQty,
  } = vm;

  return (
    <>
      <FilterBar className="market-receipt-page__toolbar">
        <div className="market-receipt-page__field">
          <label className="nur-label">Поставщик</label>
          <div className="market-receipt-page__supplier-row">
            <SearchableCombobox
              value={selectedSupplierId}
              onChange={setSelectedSupplierId}
              options={vm.supplierOptions}
              placeholder={
                suppliersLoading ? "Загрузка поставщиков..." : "Выберите поставщика"
              }
              classNamePrefix="searchableCombo"
            />
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm market-receipt-page__supplier-add"
              onClick={() => setCreateSupplierOpen(true)}
              title="Добавить поставщика"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </FilterBar>

      <div className="market-receipt-page__summary">
        <div className="market-receipt-page__summary-item">
          <span className="market-receipt-page__summary-label">Поставщик</span>
          <strong>{selectedSupplier ? buildSupplierLabel(selectedSupplier) : "—"}</strong>
        </div>
        <div className="market-receipt-page__summary-item">
          <span className="market-receipt-page__summary-label">Выбрано товаров</span>
          <strong>{receiptItems.length}</strong>
        </div>
        <div className="market-receipt-page__summary-item">
          <span className="market-receipt-page__summary-label">Общее количество</span>
          <strong>{formatQty(totalReceiptQty)}</strong>
        </div>
        <div className="market-receipt-page__summary-item">
          <span className="market-receipt-page__summary-label">Сумма накладной</span>
          <strong>{formatMoney(totalReceiptAmount)}</strong>
        </div>
      </div>

      <div className="market-receipt-page__actions">
        <button
          type="button"
          className="market-receipt-page__secondary-button"
          onClick={() => setProductsModalOpen(true)}
          disabled={productsLoading}
        >
          Товары
        </button>
        <button
          type="button"
          className="market-receipt-page__secondary-button"
          onClick={() => setCreateProductOpen(true)}
          disabled={!selectedSupplierId || submitting || productsLoading}
        >
          <Plus size={16} />
          Добавить товар
        </button>
        <button
          type="button"
          className="market-receipt-page__secondary-button"
          onClick={() => loadSupplierProducts(selectedSupplierId)}
          disabled={!selectedSupplierId || productsLoading || submitting}
        >
          <RefreshCw size={16} />
          Обновить товары
        </button>
        <button
          type="button"
          className="market-receipt-page__secondary-button"
          onClick={handleClearQty}
          disabled={receiptItems.length === 0 || submitting}
        >
          Очистить количества
        </button>
      </div>
    </>
  );
}
