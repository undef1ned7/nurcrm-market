 
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

export default function CreateSaleDocumentForMarketView(props) {
  const {
    a,
    activeTab,
    addingProduct,
    alert,
    all,
    blob,
    cartItems,
    cashBoxes,
    clientId,
    comment,
    company,
    counterparties,
    counterpartyLabel,
    createResult,
    createdDocument,
    currentDate,
    date,
    dateInputRef,
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
    filteredCounterparties,
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
    isNextPageProducts,
    isWarehouseToRequired,
    itemDiscount,
    itemDiscountAmount,
    itemDiscountPercent,
    itemQty,
    itemSubtotal,
    itemSubtotalAfterItemDiscount,
    items,
    itemsDiscount,
    list,
    loadProducts,
    loadWarehouses,
    loading,
    name,
    navigate,
    newItem,
    next,
    paid,
    product,
    productId,
    productIdsInCart,
    productSearch,
    products,
    productsFetchError,
    productsLoading,
    profile,
    qty,
    receiptData,
    reduced,
    result,
    selectedCounterparty,
    selectedProductIds,
    setActiveTab,
    setAddingProduct,
    setCartItems,
    setClientId,
    setComment,
    setDocType,
    setDocumentDateValue,
    setDocumentDiscount,
    setDocumentSearch,
    setIsDocumentPosted,
    setProductSearch,
    setProducts,
    setSelectedProductIds,
    setShowMoreProducts,
    setShowSavePrintMenu,
    setWarehouse,
    setWarehouseTo,
    setWarehouses,
    showMoreProducts,
    showSavePrintMenu,
    subtotal,
    subtotalAfterItemsDiscount,
    total,
    totalDiscount,
    totals,
    uniqueProductsList,
    updated,
    url,
    userProfile,
    warehouse,
    warehouseName,
    warehouseTo,
    warehouseToName,
    warehouses,
  } = props;

      return (
        <div className="create-sale-document">
            <div className="create-sale-document__container">
                {/* Левая панель с товарами */}
                <div className="create-sale-document__sidebar">
                    <div className="create-sale-document__search-wrapper">
                        <div className="create-sale-document__search">
                            <Search size={18} className="create-sale-document__search-icon" />
                            <input
                                type="text"
                                placeholder="Поиск товаров"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                        </div>
                        <div className="create-sale-document__search-actions">
                            <Folder size={18} />
                            <Check size={18} />
                        </div>
                    </div>

                    <button className="create-sale-document__create-product-btn">
                        <Plus size={16} />
                        Создать товар
                    </button>

                    <div className="create-sale-document__products-list">

                        {
                            uniqueProductsList?.length === 0 && <div className="create-sale-document__empty">
                                Товары не найдены
                            </div>
                        }
                        {
                            uniqueProductsList.map((product) => {
                                const isSelected = selectedProductIds.has(product.id);
                                const isInCart = cartItems.some(
                                    (item) => String(item.productId) === String(product.id)
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
                    {uniqueProductsList.length > 0 && (
                        <button
                            hidden={!isNextPageProducts}
                            className="create-sale-document__show-more"
                            onClick={() => setShowMoreProducts(prev => prev + (isNextPageProducts ? 1 : 0))}
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
                                className="create-sale-document__save-btn"
                                onClick={handleSave}
                            >
                                Сохранить
                            </button>
                            <div className="create-sale-document__save-print-wrapper">
                                <button
                                    className="create-sale-document__save-print-btn"
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
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="create-sale-document__header-right">
                            <label className="create-sale-document__toggle">
                                <input
                                    type="checkbox"
                                    checked={isDocumentPosted}
                                    onChange={(e) => setIsDocumentPosted(e.target.checked)}
                                />
                                <span>Документ проведён</span>
                            </label>
                            {/* <label className="create-sale-document__checkbox">
                <input
                  type="checkbox"
                  checked={isOrder}
                  onChange={(e) => setIsOrder(e.target.checked)}
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
                                    onChange={(e) => setDocumentDateValue(e.target.value)}
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
                            {docType === "SALE" && "Продажа"}
                            {docType === "PURCHASE" && "Покупка"}
                            {docType === "SALE_RETURN" && "Возврат продажи"}
                            {docType === "PURCHASE_RETURN" && "Возврат покупки"}
                            {docType === "INVENTORY" && "Инвентаризация"}
                            {docType === "RECEIPT" && "Приход"}
                            {docType === "WRITE_OFF" && "Списание"}
                            {docType === "TRANSFER" && "Перемещение"}
                            {!docType && "Документ"}{" "}
                            {documentId ? `#${documentId.slice(0, 8)}` : "(новый документ)"}
                        </h2>

                        <div className="create-sale-document__fields">
                            <div className="create-sale-document__field">
                                <label>Тип документа *</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    required
                                >
                                    <option value="SALE">Продажа</option>
                                    <option value="PURCHASE">Покупка</option>
                                    <option value="SALE_RETURN">Возврат продажи</option>
                                    <option value="PURCHASE_RETURN">Возврат покупки</option>
                                    <option value="INVENTORY">Инвентаризация</option>
                                    <option value="RECEIPT">Приход</option>
                                    <option value="WRITE_OFF">Списание</option>
                                    <option value="TRANSFER">Перемещение</option>
                                </select>
                            </div>
                            <div className="create-sale-document__field">
                                <label>Склад {isWarehouseToRequired ? "отправитель" : ""} *</label>
                                <select
                                    value={warehouse}
                                    onChange={(e) => setWarehouse(e.target.value)}
                                    required
                                >
                                    <option value="">Выберите склад</option>
                                    {warehouses
                                        .filter((wh) => !isWarehouseToRequired || wh.id !== warehouseTo)
                                        .map((wh) => (
                                            <option key={wh.id} value={wh.id}>
                                                {wh.name || wh.title || wh.id}
                                            </option>
                                        ))}
                                    {/* Также показываем склады из cashBoxes для обратной совместимости */}
                                    {cashBoxes
                                        ?.filter((box) => !isWarehouseToRequired || box.id !== warehouseTo)
                                        ?.map((box) => (
                                            <option key={box.id} value={box.id}>
                                                {box.name || box.title || box.id}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            {isWarehouseToRequired && (
                                <div className="create-sale-document__field">
                                    <label>Склад получатель *</label>
                                    <select
                                        value={warehouseTo}
                                        onChange={(e) => setWarehouseTo(e.target.value)}
                                        required
                                    >
                                        <option value="">Выберите склад получатель</option>
                                        {warehouses
                                            .filter((wh) => wh.id !== warehouse)
                                            .map((wh) => (
                                                <option key={wh.id} value={wh.id}>
                                                    {wh.name || wh.title || wh.id}
                                                </option>
                                            ))}
                                        {/* Также показываем склады из cashBoxes для обратной совместимости */}
                                        {cashBoxes
                                            ?.filter((box) => box.id !== warehouse)
                                            ?.map((box) => (
                                                <option key={box.id} value={box.id}>
                                                    {box.name || box.title || box.id}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                            {isCounterpartyRequired && (
                                <div className="create-sale-document__field">
                                    <label>
                                        Контрагент *{" "}
                                        {(docType === "SALE" || docType === "SALE_RETURN") && "(Клиент)"}
                                        {(docType === "PURCHASE" || docType === "PURCHASE_RETURN") && "(Поставщик)"}
                                    </label>
                                    <select
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        required={isCounterpartyRequired}
                                    >
                                        <option value="">
                                            {docType === "SALE" || docType === "SALE_RETURN"
                                                ? "Выберите клиента"
                                                : "Выберите поставщика"}
                                        </option>
                                        {filteredCounterparties.map((counterparty) => (
                                            <option key={counterparty.id} value={counterparty.id}>
                                                {counterparty.name || "Без названия"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                        onChange={(e) => setDocumentSearch(e.target.value)}
                                    />
                                </div>

                                {/* Таблица товаров */}
                                <div className="create-sale-document__table-wrapper">
                                    <table className="create-sale-document__table">
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
                                                filteredDocumentItems.map((item, index) => {
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
                                                                    onChange={(e) =>
                                                                        handleQuantityChange(
                                                                            item.id,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="create-sale-document__qty-input"
                                                                />
                                                            </td>
                                                            <td>{formatPrice(itemPrice)}</td>
                                                            <td>
                                                                {item.discount_percent || item.discount || 0}%
                                                            </td>
                                                            <td>{formatPrice(itemTotal)}</td>
                                                            <td>
                                                                <button
                                                                    className="create-sale-document__remove-btn"
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
                                                onChange={(e) => {
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
                                                onBlur={(e) => {
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
                                    <label className="create-sale-document__comment-label">
                                        Комментарий
                                    </label>
                                    <textarea
                                        className="create-sale-document__comment-textarea"
                                        placeholder="Введите комментарий..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
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
        </div>
    );
}
