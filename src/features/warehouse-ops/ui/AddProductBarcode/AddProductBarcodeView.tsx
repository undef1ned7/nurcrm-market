import { PromotionRulesEditor } from "../AddProductPage/components";

const AddProductBarcodeView = (vm) => {
  const {
    scanningProduct,
    scannedProduct,
    addingToWarehouse,
    barcodeScan,
    setBarcodeScan,
    quantity,
    setQuantity,
    state,
    setState,
    onChange,
    handlePriceChange,
    stockPromo,
    promotionRules,
    setPromotionRules,
    handleStockPromoBarcodeChange,
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    clientId,
    setClientId,
    showDebtForm,
    setShowDebtForm,
    showSupplierForm,
    setShowSupplierForm,
    supplierFormState,
    setSupplierFormState,
    creatingSupplier,
    debtState,
    filterClient,
    company,
    warehouseCategories,
    warehouseCategory,
    onWarehouseCategoryChange,
    onChangeDebt,
    handleSupplierFormChange,
    onSubmitSupplier,
    handleAddToWarehouse,
    handleCancel,
    totalAmount,
    warehouseUuid,
    pickClient,
    initialSupplierFormState
  } = vm;

  return (
    <div className="add-product-barcode">
      {/* Индикатор загрузки сканирования */}
      {scanningProduct && (
        <div className="add-product-barcode__loading">Поиск товара...</div>
      )}

      {/* Информация о найденном товаре */}
      {scannedProduct && (
        <div className="add-product-barcode__product-card">
          <h3 className="add-product-barcode__product-title">
            Найденный товар
          </h3>

          <div className="add-product-barcode__form-group">
            <label>Название *</label>
            <input
              type="text"
              value={state.name}
              onChange={onChange}
              name="name"
              placeholder="Введите название товара"
            />
          </div>

          {warehouseUuid && warehouseCategories?.length > 0 && (
            <div className="add-product-barcode__form-group">
              <label>Категория *</label>
              <select
                value={warehouseCategory ?? ""}
                onChange={(e) =>
                  onWarehouseCategoryChange?.(e.target.value || undefined)
                }
                className="add-product-barcode__select"
              >
                <option value="">Выберите категорию</option>
                {warehouseCategories.map((cat, idx) => (
                  <option key={cat.id ?? idx} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="add-product-barcode__grid">
            {scannedProduct.brand && (
              <div className="add-product-barcode__info-row">
                <strong>Бренд:</strong>
                <span>{scannedProduct.brand.name}</span>
              </div>
            )}
            {scannedProduct.category && (
              <div className="add-product-barcode__info-row">
                <strong>Категория:</strong>
                <span>{scannedProduct.category.name}</span>
              </div>
            )}
            <div className="add-product-barcode__info-row">
              <strong>Штрих-код:</strong>
              <span>{scannedProduct.barcode}</span>
            </div>
            {scannedProduct.price && (
              <div className="add-product-barcode__info-row">
                <strong>Цена:</strong>
                <span>{scannedProduct.price} сом</span>
              </div>
            )}
          </div>

          <div className="add-product-barcode__grid">
            <div className="add-product-barcode__form-group">
              <label>Количество *</label>
              <input
                type="number"
                min="1"
                value={state.quantity}
                onChange={onChange}
                name="quantity"
                placeholder="1"
              />
            </div>
            <div className="add-product-barcode__form-group">
              <label>Закупочная цена *</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="purchase_price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.purchase_price}
                  onChange={onChange}
                  required
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>Наценка</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="markup"
                  placeholder="0"
                  className="add-product-page__input"
                  value={state.markup}
                  onChange={onChange}
                />
                <span className="add-product-page__currency">%</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>Розничная цена *</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.price}
                  onChange={handlePriceChange}
                  required
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>Оптовая цена</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="wholesale_price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.wholesale_price || ""}
                  onChange={onChange}
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>ПЛУ</label>
              <input
                type="number"
                min="0"
                max="2147483647"
                name="plu"
                value={state.plu}
                onChange={onChange}
                placeholder="Номер ПЛУ для весов"
              />
            </div>
          </div>

          <div className="add-product-barcode__form-group">
            <label>Тип товара для весов</label>
            <select
              name="scale_type"
              value={state.scale_type}
              onChange={onChange}
            >
              <option value="">-- Выберите тип --</option>
              <option value="piece">Штучный</option>
              <option value="weight">Весовой</option>
            </select>
          </div>

          <div className="add-product-barcode__form-group">
            <label>Дополнительные штрихкоды</label>
            <textarea
              className="add-product-page__input"
              rows={3}
              name="alternateBarcodesText"
              placeholder="По одному коду в строке (или через запятую)"
              value={state.alternateBarcodesText ?? ""}
              onChange={onChange}
            />
            <p className="add-product-page__hint">
              Учитываются при поиске на складе и сканировании на кассе. Не должны
              совпадать с основным штрихкодом.
            </p>
          </div>

          <div className="add-product-barcode__form-group add-product-barcode__supplier-row">
            <label>Поставщик</label>
            <div className="add-product-barcode__supplier-select-wrap">
              <select
                onChange={(e) => {
                  setClientId(e.target.value);
                }}
                value={clientId}
                className="add-product-barcode__select"
              >
                <option value="">Выберите поставщика</option>
                {filterClient.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-product-barcode__create-supplier-btn"
                onClick={() => setShowSupplierForm(!showSupplierForm)}
              >
                + Создать поставщика
              </button>
            </div>
          </div>
          {showSupplierForm && (
            <form
              className="add-product-barcode__supplier-form"
              onSubmit={onSubmitSupplier}
            >
              <input
                type="text"
                name="full_name"
                placeholder="ФИО *"
                value={supplierFormState.full_name}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="phone"
                placeholder="Телефон"
                value={supplierFormState.phone}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="email"
                name="email"
                placeholder="Почта"
                value={supplierFormState.email}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="llc"
                placeholder="ОсОО"
                value={supplierFormState.llc}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="inn"
                placeholder="ИНН"
                value={supplierFormState.inn}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="address"
                placeholder="Адрес"
                value={supplierFormState.address}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <div className="add-product-barcode__supplier-form-actions">
                <button
                  type="button"
                  className="add-product-barcode__btn add-product-barcode__btn--secondary"
                  onClick={() => {
                    setShowSupplierForm(false);
                    setSupplierFormState(initialSupplierFormState);
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="add-product-barcode__btn add-product-barcode__btn--primary"
                  disabled={creatingSupplier}
                >
                  {creatingSupplier ? "Создание..." : "Создать"}
                </button>
              </div>
            </form>
          )}

          <PromotionRulesEditor
            compact
            stock={stockPromo}
            onStockChange={handleStockPromoBarcodeChange}
            tiers={promotionRules}
            onTiersChange={setPromotionRules}
            errorText=""
          />

          {/* Переключатель долга */}
          <div className="add-product-barcode__debt-section">
            <label className="add-product-barcode__debt-checkbox">
              <input
                type="checkbox"
                checked={showDebtForm}
                onChange={(e) => setShowDebtForm(e.target.checked)}
              />
              <strong>Добавить долг по этому товару</strong>
            </label>

            {/* Форма долга */}
            {showDebtForm && (
              <div className="add-product-barcode__debt-form">
                {clientId === "" && (
                  <>
                    <p className="add-product-barcode__error-message">
                      Выберите поставщика!
                    </p>
                  </>
                )}
                {company?.subscription_plan?.name === "Старт" && clientId && (
                  <div className="add-product-barcode__grid">
                    <div className="add-product-barcode__form-group">
                      <label>Телефон</label>
                      <input
                        type="text"
                        onChange={onChangeDebt}
                        name="phone"
                        value={debtState.phone}
                        placeholder="Номер телефона"
                      />
                    </div>
                    <div className="add-product-barcode__form-group">
                      <label>Дата оплаты</label>
                      <input
                        type="date"
                        onChange={onChangeDebt}
                        name="dueDate"
                        value={debtState.dueDate}
                      />
                    </div>
                  </div>
                )}
                <div className="add-product-barcode__form-group">
                  <label>Тип оплаты</label>
                  <select
                    value={debt}
                    onChange={(e) => setDebt(e.target.value)}
                  >
                    <option value="">Тип оплаты</option>
                    <option value="Предоплата">Предоплата</option>
                    <option value="Долги">Долг</option>
                  </select>
                </div>
                {debt === "Предоплата" && (
                  <div className="add-product-barcode__grid">
                    <div className="add-product-barcode__form-group">
                      <label>Сумма предоплаты</label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="add-product-barcode__form-group">
                      <label>Срок долга (мес.)</label>
                      <input
                        type="text"
                        value={debtMonths}
                        onChange={(e) => setDebtMonths(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
                {debt === "Долги" && (
                  <div className="add-product-barcode__form-group">
                    <label>Срок долга (мес.)</label>
                    <input
                      type="text"
                      value={debtMonths}
                      onChange={(e) => setDebtMonths(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
                {debt && clientId && (
                  <div className="add-product-barcode__debt-summary">
                    <strong>Сумма долга:</strong> {totalAmount.toFixed(2)} сом
                    <br />
                    <strong>Поставщик:</strong> {pickClient?.full_name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="add-product-barcode__actions">
            <button
              className="add-product-barcode__btn add-product-barcode__btn--secondary"
              onClick={handleCancel}
            >
              Отмена
            </button>
            <button
              className="add-product-barcode__btn add-product-barcode__btn--primary"
              onClick={handleAddToWarehouse}
              disabled={addingToWarehouse}
            >
              {addingToWarehouse ? "Добавление..." : "Добавить в склад"}
            </button>
          </div>
        </div>
      )}

      {/* Инструкция */}
      {!scannedProduct && !scanningProduct && (
        <div className="add-product-barcode__instruction">
          Отсканируйте штрих-код товара для добавления в склад
        </div>
      )}
    </div>
  );
};

export default AddProductBarcodeView;
