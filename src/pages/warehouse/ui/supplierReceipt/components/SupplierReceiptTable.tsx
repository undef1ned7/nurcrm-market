import { PackageCheck } from "lucide-react";
import {
  buildProductLabel,
  formatQty,
} from "../supplierReceiptUtils";
import Pagination from "../../components/Pagination";
import type { SupplierReceiptVm } from "../hooks/useSupplierReceipt";

type Props = {
  vm: SupplierReceiptVm;
};

export function SupplierReceiptTable({ vm }: Props) {
  const {
    selectedSupplierId,
    productsLoading,
    tableProducts,
    paginatedProducts,
    receiptPage,
    setReceiptPage,
    receiptTotalPages,
    products,
    priceByProductId,
    qtyByProductId,
    handlePriceChange,
    handleQtyChange,
    receiptItems,
    submitting,
    handleOpenPaymentModal,
  } = vm;

  return (
    <>
      {!selectedSupplierId ? (
        <div className="market-receipt-page__empty">
          Сначала выберите поставщика, чтобы загрузить его товары.
        </div>
      ) : productsLoading ? (
        <div className="market-receipt-page__empty">Загрузка товаров...</div>
      ) : tableProducts.length === 0 ? (
        <div className="market-receipt-page__empty">
          {products.length === 0
            ? "У выбранного поставщика пока нет товаров."
            : "По вашему поиску товары не найдены."}
        </div>
      ) : (
        <div className="market-receipt-page__results">
          <div className="market-receipt-page__table-wrap">
            <table className="market-receipt-page__table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Код</th>
                  <th>Артикул</th>
                  <th>Текущий остаток</th>
                  <th>Цена закупки</th>
                  <th>Количество для приема</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product: any) => {
                  const productId = String(product.id || "");
                  return (
                    <tr key={productId}>
                      <td>{buildProductLabel(product)}</td>
                      <td>{product.code || "—"}</td>
                      <td>{product.article || "—"}</td>
                      <td>{formatQty(product.quantity || 0)}</td>
                      <td>
                        <input
                          className="market-receipt-page__price-input"
                          type="text"
                          inputMode="decimal"
                          value={priceByProductId[productId] ?? ""}
                          onChange={(e: any) =>
                            handlePriceChange(productId, e.target.value)
                          }
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          className="market-receipt-page__qty-input"
                          type="text"
                          inputMode="decimal"
                          value={qtyByProductId[productId] ?? ""}
                          onChange={(e: any) =>
                            handleQtyChange(productId, e.target.value)
                          }
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="market-receipt-page__cards">
            {paginatedProducts.map((product: any) => {
              const productId = String(product.id || "");
              return (
                <div className="market-receipt-page__product-card" key={`card-${productId}`}>
                  <div className="market-receipt-page__product-title">
                    {buildProductLabel(product)}
                  </div>

                  <div className="market-receipt-page__product-meta">
                    <div className="market-receipt-page__product-meta-item">
                      <span>Код</span>
                      <strong>{product.code || "—"}</strong>
                    </div>
                    <div className="market-receipt-page__product-meta-item">
                      <span>Артикул</span>
                      <strong>{product.article || "—"}</strong>
                    </div>
                    <div className="market-receipt-page__product-meta-item">
                      <span>Остаток</span>
                      <strong>{formatQty(product.quantity || 0)}</strong>
                    </div>
                  </div>

                  <div className="market-receipt-page__product-inputs">
                    <div className="market-receipt-page__field">
                      <label className="market-receipt-page__label">
                        Цена закупки
                      </label>
                      <input
                        className="market-receipt-page__price-input market-receipt-page__price-input--mobile"
                        type="text"
                        inputMode="decimal"
                        value={priceByProductId[productId] ?? ""}
                        onChange={(e: any) =>
                          handlePriceChange(productId, e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="market-receipt-page__field">
                      <label className="market-receipt-page__label">
                        Количество для приема
                      </label>
                      <input
                        className="market-receipt-page__qty-input market-receipt-page__qty-input--mobile"
                        type="text"
                        inputMode="decimal"
                        value={qtyByProductId[productId] ?? ""}
                        onChange={(e: any) =>
                          handleQtyChange(productId, e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={receiptPage}
            totalPages={receiptTotalPages}
            count={tableProducts.length}
            countLabel="товаров"
            loading={productsLoading}
            hasNextPage={receiptPage < receiptTotalPages}
            hasPrevPage={receiptPage > 1}
            onPageChange={setReceiptPage}
          />
        </div>
      )}
      <div className="market-receipt-page__actions market-receipt-page__submit-actions">
        <button
          type="button"
          className="market-receipt-page__primary-button"
          onClick={handleOpenPaymentModal}
          disabled={!selectedSupplierId || receiptItems.length === 0 || submitting}
        >
          <PackageCheck size={16} />
          Оприходовать товары
        </button>
      </div>
    </>
  );
}
