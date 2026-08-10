 

import {
  Search,
  Plus,
  Check,
  X,
  ChevronDown,
  Pencil,
  Folder,
} from "lucide-react";
import { PageShell, PageHeader } from "@shared/ui/page-shell";
import { formatPrice } from "./utils";

export default function CreateSaleDocumentView(props: any) {
  const {
    _createdDocument,
    _warehouseToName,
    a,
    activeTab,
    addingProduct,
    blob,
    cartItems,
    cashBoxes,
    clientId,
    clients,
    comment,
    company,
    counterpartyLabel,
    createResult,
    currentDate,
    date,
    dateInputRef,
    debounceTimerRef,
    debouncedProductSearch,
    discountPercent,
    dispatch,
    displayDate,
    docNumber,
    docType,
    documentData,
    documentDateValue,
    documentDiscount,
    documentDiscountAmount,
    documentId,
    documentSearch,
    downloadBlob,
    error,
    errorMessage,
    existingItemIndex,
    filterClient,
    filteredDocumentItems,
    formatDisplayDate,
    formatPrice,
    handleAddProduct,
    handleQuantityChange,
    handleRemoveProduct,
    handleSave,
    handleSaveAndPrint,
    invoiceData,
    isCounterpartyRequired,
    isDocumentPosted,
    isWarehouseToRequired,
    itemDiscount,
    itemDiscountAmount,
    itemDiscountPercent,
    itemQty,
    itemSubtotal,
    itemSubtotalAfterItemDiscount,
    items,
    itemsDiscount,
    ko1Data,
    list,
    loadProducts,
    name,
    navigate,
    newItem,
    paid,
    product,
    productId,
    productIdsInCart,
    productSearch,
    products,
    productsLoading,
    profile,
    qty,
    receiptData,
    result,
    selectedClient,
    selectedCounterparty,
    selectedProductIds,
    setActiveTab,
    setAddingProduct,
    setCartItems,
    setClientId,
    setComment,
    setDebouncedProductSearch,
    setDocumentDateValue,
    setDocumentDiscount,
    setDocumentSearch,
    setIsDocumentPosted,
    setProductSearch,
    setProducts,
    setProductsLoading,
    setSelectedProductIds,
    setShowMoreProducts,
    setShowSavePrintMenu,
    setWarehouseTo,
    showMoreProducts,
    showSavePrintMenu,
    subtotal,
    subtotalAfterItemsDiscount,
    total,
    totalDiscount,
    totals,
    updated,
    url,
    userProfile,
    warehouse,
    warehouseName,
    warehouseTo,
    warehouses,
  } = props;

    return (
    <PageShell className="create-sale-document">
      <PageHeader
        title="Создание документа продажи"
        subtitle="Подбор товаров, клиент и сохранение"
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => navigate("/crm/documents")}
          >
            <X size={16} />
            Назад
          </button>
        }
      />
      <div className="create-sale-document__progress" aria-label="Шаги">
        <span className="create-sale-document__progress-step create-sale-document__progress-step--active">
          1. Товары
        </span>
        <span className="create-sale-document__progress-step">2. Клиент и оплата</span>
        <span className="create-sale-document__progress-step">3. Сохранение</span>
      </div>
      <div className="create-sale-document__container">
        {/* Левая панель с товарами */}
        <div className="create-sale-document__sidebar">
          <div className="create-sale-document__search-wrapper">
            <div className="create-sale-document__search">
              <Search size={18} className="create-sale-document__search-icon" />
              <input
                type="text"
                className="nur-input"
                placeholder="Поиск товаров"
                value={productSearch}
                onChange={(e: any) => setProductSearch(e.target.value)}
              />
            </div>
            <div className="create-sale-document__search-actions">
              <Folder size={18} />
              <Check size={18} />
            </div>
          </div>

          <button type="button" className="nur-btn nur-btn--primary create-sale-document__create-product-btn">
            <Plus size={16} />
            Создать товар
          </button>

          <div className="create-sale-document__products-list">

            {
              products?.length === 0 && <div className="create-sale-document__empty">
                Товары не найдены
              </div>
            }
            {
              products.map((product: any) => {
                const isSelected = selectedProductIds.has(product.id);
                const isInCart = cartItems.some(
                  (item: any) => String(item.productId) === String(product.id)
                );

                return (
                  <div
                    key={product.id}
                    className={`create-sale-document__product-item ${isSelected || isInCart ? "active" : ""
                      }`}
                    onClick={() => handleAddProduct(product.id)}
                    style={{
                      cursor: addingProduct ? "wait" : "pointer",
                      opacity: addingProduct ? 0.6 : 1,
                    }}
                  >
                    <div className="create-sale-document__product-info">
                      <div className="create-sale-document__product-name">
                        {product.name}
                      </div>
                      <div className="create-sale-document__product-details">
                        <span className="create-sale-document__product-price">
                          {formatPrice(product.price)} сом
                        </span>
                        <span className="create-sale-document__product-qty">
                          {product.quantity || 0} {product.unit || "шт"}
                        </span>
                      </div>
                    </div>
                    {(isSelected || isInCart) && (
                      <Check
                        size={18}
                        className="create-sale-document__product-check"
                      />
                    )}
                  </div>
                );
              })
            }
          </div>
          
          {
            productsLoading && <div className="create-sale-document__loading">Загрузка...</div>
          }
          {products.length > 0 && (
            <button
              className="create-sale-document__show-more"
              onClick={() => setShowMoreProducts(!showMoreProducts)}
            >
              ПОКАЗАТЬ ЕЩЕ
            </button>
          )}
        </div>

        {/* Основная область */}
        <div className="create-sale-document__main">
          {/* Верхняя панель */}
          <div className="create-sale-document__header">
            <div className="create-sale-document__header-left">
              <button
                type="button"
                className="nur-btn nur-btn--primary create-sale-document__save-btn"
                onClick={handleSave}
              >
                Сохранить
              </button>
              <div className="create-sale-document__save-print-wrapper">
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary create-sale-document__save-print-btn"
                  onClick={() => setShowSavePrintMenu(!showSavePrintMenu)}
                >
                  Сохранить и распечатать.
                  <ChevronDown size={16} />
                </button>
                {showSavePrintMenu && (
                  <div className="create-sale-document__save-print-menu">
                    <button onClick={() => handleSaveAndPrint("invoice")}>
                      Накладная
                    </button>
                    <button onClick={() => handleSaveAndPrint("receipt")}>
                      Товарный чек
                    </button>
                    <button onClick={() => handleSaveAndPrint("ko1")}>
                      ПКО (КО-1)
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="create-sale-document__header-right">
              <label className="create-sale-document__toggle">
                <input
                  type="checkbox"
                  checked={isDocumentPosted}
                  onChange={(e: any) => setIsDocumentPosted(e.target.checked)}
                />
                <span>Документ проведён</span>
              </label>
              {/* <label className="create-sale-document__checkbox">
                <input
                  type="checkbox"
                  checked={isOrder}
                  onChange={(e: any) => setIsOrder(e.target.checked)}
                />
                <span>Заказ</span>
              </label> */}
              <div className="create-sale-document__date-wrapper">
                <input
                  ref={dateInputRef}
                  type="date"
                  id="document-date-picker"
                  className="create-sale-document__date-input"
                  value={documentDateValue}
                  onChange={(e: any) => setDocumentDateValue(e.target.value)}
                />
                <div
                  className="create-sale-document__date"
                  onClick={() => {
                    const input = dateInputRef.current;
                    if (input) {
                      input.showPicker?.() || input.click();
                    }
                  }}
                >
                  {displayDate}
                  <Pencil size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Основной контент */}
          <div className="create-sale-document__content">
            <h2 className="create-sale-document__title">
              Продажа{" "}
              {documentId ? `#${documentId.slice(0, 8)}` : "(новый документ)"}
            </h2>

            <div className="create-sale-document__fields">
              <div className="create-sale-document__field">
                <label>Клиент</label>
                <select
                  value={clientId}
                  onChange={(e: any) => setClientId(e.target.value)}
                >
                  <option value="">Выберите клиента</option>
                  {filterClient.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name || client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Вкладки */}
            <div className="create-sale-document__tabs">
              <button
                className={`create-sale-document__tab ${activeTab === "products" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("products")}
              >
                Товары
              </button>
              {/* <button
                className={`create-sale-document__tab ${
                  activeTab === "payment" ? "active" : ""
                }`}
                onClick={() => setActiveTab("payment")}
              >
                Счета и оплата
              </button> */}
            </div>

            {/* Поиск по товарам в документе */}
            {activeTab === "products" && (
              <>
                <div className="create-sale-document__document-search">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Поиск по товарам в документе"
                    value={documentSearch}
                    onChange={(e: any) => setDocumentSearch(e.target.value)}
                  />
                </div>

                {/* Таблица товаров */}
                <div className="nur-table-wrap create-sale-document__table-wrapper">
                  <table className="nur-table nur-table--dense create-sale-document__table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Наименование</th>
                        <th>Ед. изм.</th>
                        <th>Кол-во</th>
                        <th>Цена, сом</th>
                        <th>Скидка, %</th>
                        <th>Итог</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocumentItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="create-sale-document__empty-table"
                          >
                            Нет товаров в документе
                          </td>
                        </tr>
                      ) : (
                        filteredDocumentItems.map((item: any, index: any) => {
                          const itemName =
                            item.productName || item.name || "Товар";
                          const itemPrice = Number(
                            item.price || item.unit_price || 0
                          );
                          const itemQuantity = Number(item.quantity || 1);
                          const itemTotal = itemPrice * itemQuantity;

                          return (
                            <tr key={item.id || index}>
                              <td>{index + 1}</td>
                              <td>{itemName}</td>
                              <td>{item.unit || "шт"}</td>
                              <td>
                                <input
                                  type="text"
                                  min="0"
                                  value={itemQuantity}
                                  onChange={(e: any) =>
                                    handleQuantityChange(
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                  className="nur-input create-sale-document__qty-input"
                                />
                              </td>
                              <td>{formatPrice(itemPrice)}</td>
                              <td>
                                {item.discount_percent || item.discount || 0}%
                              </td>
                              <td>{formatPrice(itemTotal)}</td>
                              <td>
                                <button
                                  className="nur-btn nur-btn--ghost nur-btn--sm create-sale-document__remove-btn"
                                  onClick={() => handleRemoveProduct(item.id)}
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Итоги */}
                <div className="create-sale-document__totals">
                  <div className="create-sale-document__total-row">
                    <span>Итог:</span>
                    <span>{formatPrice(totals.total)} сом</span>
                  </div>
                  <div className="create-sale-document__total-row">
                    <span>Оплаченные:</span>
                    <span>{formatPrice(totals.paid)} сом</span>
                  </div>
                  {/* <div className="create-sale-document__total-row">
                    <span>
                      Налоги:
                      <span className="create-sale-document__help-icon">?</span>
                    </span>
                    <span>{formatPrice(totals.taxes)} сом</span>
                  </div> */}
                  <div className="create-sale-document__total-row">
                    <span>Скидка по документу:</span>
                    <div className="create-sale-document__discount-input-wrapper">
                      <input
                        type="text"
                        min="0"
                        max="100"
                        value={documentDiscount}
                        onChange={(e: any) => {
                          const value = e.target.value;
                          // Разрешаем пустое значение во время ввода
                          if (value === "") {
                            setDocumentDiscount("");
                          } else {
                            const numValue = Number(value);
                            if (
                              !isNaN(numValue) &&
                              numValue >= 0 &&
                              numValue <= 100
                            ) {
                              setDocumentDiscount(value);
                            }
                          }
                        }}
                        onBlur={(e: any) => {
                          const value = e.target.value;
                          // При потере фокуса валидируем и устанавливаем 0, если пусто
                          if (
                            value === "" ||
                            value === null ||
                            isNaN(Number(value))
                          ) {
                            setDocumentDiscount("0");
                          } else {
                            const numValue = Number(value);
                            if (numValue < 0) {
                              setDocumentDiscount("0");
                            } else if (numValue > 100) {
                              setDocumentDiscount("100");
                            } else {
                              setDocumentDiscount(String(numValue));
                            }
                          }
                        }}
                        className="create-sale-document__discount-input"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="create-sale-document__total-row">
                    <span>Общая скидка:</span>
                    <span>
                      {documentDiscount > 0 || totals.itemsDiscount > 0
                        ? `${(
                          (totals.totalDiscount / totals.subtotal) *
                          100
                        ).toFixed(2)}% (${formatPrice(
                          totals.totalDiscount
                        )} сом)`
                        : `% (${formatPrice(0)} сом)`}
                    </span>
                  </div>
                </div>

                {/* Комментарий */}
                <div className="create-sale-document__comment-section">
                  <label className="nur-label create-sale-document__comment-label">
                    Комментарий
                  </label>
                  <textarea
                    className="nur-textarea create-sale-document__comment-textarea"
                    placeholder="Введите комментарий..."
                    value={comment}
                    onChange={(e: any) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}

            {activeTab === "payment" && (
              <div className="create-sale-document__payment-tab">
                <p>Раздел "Счета и оплата" в разработке</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
