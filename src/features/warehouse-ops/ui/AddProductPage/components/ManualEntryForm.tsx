/**
 * Legacy / loading-branch manual entry form preserved from AddProductPage.
 */
import { Package, ShoppingBag } from "lucide-react";
import SearchSelect from "@shared/ui/SearchSelect/SearchSelect";

const ManualEntryForm = ({
  productType,
  setProductType,
  newItemData,
  setNewItemData,
  handleChange,
  fieldErrors,
  company,
  brandOptions,
  categoryOptions,
  brandsLoading,
  categoriesLoading,
  hasMoreBrands,
  hasMoreCategories,
  setBrandQuery,
  setCategoryQuery,
  handleLoadMoreBrands,
  handleLoadMoreCategories,
  showBrandInputs,
  setShowBrandInputs,
  newBrand,
  setNewBrand,
  onSubmitBrand,
  isBrandNameTaken,
  showCategoryInputs,
  setShowCategoryInputs,
  newCategory,
  setNewCategory,
  onSubmitCategory,
  isCategoryNameTaken,
  marketData,
  filterClient,
  showInputs,
  setShowInputs,
  onSubmit,
  onChange,
  showDebtForm,
  setShowDebtForm,
  debt,
  setDebt,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  debtState,
  onChangeDebt,
  handleReturn,
  handleSubmit,
  creating,
}) => {
  return (
<>
  {/* Вкладка ручного ввода (для других секторов) */}
  <div className="add-product-page__form">
    {/* Выбор типа товара */}
    <div className="add-product-page__section">
      <label className="add-product-page__section-label">
        Тип товара *
      </label>
      <div className="add-product-page__type-selector">
        <button
          className={`add-product-page__type-card ${
            productType === "piece"
              ? "add-product-page__type-card--active"
              : ""
          }`}
          onClick={() => {
            setProductType("piece");
            setNewItemData((prev) => ({
              ...prev,
              scale_type: "piece",
            }));
          }}
        >
          <Package size={32} />
          <span>Штучный товар</span>
        </button>
        <button
          className={`add-product-page__type-card ${
            productType === "weight"
              ? "add-product-page__type-card--active"
              : ""
          }`}
          onClick={() => {
            setProductType("weight");
            setNewItemData((prev) => ({
              ...prev,
              scale_type: "weight",
            }));
          }}
        >
          <ShoppingBag size={32} />
          <span>Килограммовый товар</span>
        </button>
      </div>
    </div>

    {/* Основная информация */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">1</div>
        <h3 className="add-product-page__section-title">
          Основная информация
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Название товара *
        </label>
        <input
          type="text"
          name="name"
          placeholder="Например, Монитор Dell 24 дюйма"
          className="add-product-page__input"
          value={newItemData.name}
          onChange={handleChange}
          required
        />
        {fieldErrors.name && (
          <p className="add-product-page__error">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Штрих-код *
        </label>
        <input
          type="text"
          name="barcode"
          className="add-product-page__input"
          value={newItemData.barcode}
          onChange={handleChange}
          required
        />
        {fieldErrors.barcode && (
          <p className="add-product-page__error">
            {fieldErrors.barcode}
          </p>
        )}
      </div>

      {company?.sector?.name !== "Барбершоп" && (
        <>
          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              ПЛУ (номер для весов)
            </label>
            <input
              type="text"
              name="plu"
              placeholder="0001"
              className="add-product-page__input"
              value={newItemData.plu}
              onChange={handleChange}
            />
            <span className="add-product-page__hint">
              4-значный код для весов
            </span>
          </div>

          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              Бренд *
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.brand_name}
                valueLabel={newItemData.brand_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "brand_name", value: v },
                  })
                }
                options={brandOptions}
                placeholder="Выберите бренд"
                emptyText="Бренды не найдены"
                maxVisible={500}
                onQueryChange={setBrandQuery}
                loading={brandsLoading}
                hasMore={hasMoreBrands}
                onLoadMore={handleLoadMoreBrands}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowBrandInputs(!showBrandInputs)}
                type="button"
              >
                + Создать бренд
              </button>
            </div>
            {showBrandInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitBrand}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewBrand({
                      ...newBrand,
                      name: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="Название бренда"
                  name="name"
                  value={newBrand.name}
                  required
                />
                {isBrandNameTaken && (
                  <p className="add-product-page__error">
                    Бренд с таким названием уже существует
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowBrandInputs(false);
                      setNewBrand({ name: "" });
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isBrandNameTaken}
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              Категория *
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.category_name}
                valueLabel={newItemData.category_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "category_name", value: v },
                  })
                }
                options={categoryOptions}
                placeholder="Выберите категорию"
                emptyText="Категории не найдены"
                maxVisible={500}
                onQueryChange={setCategoryQuery}
                loading={categoriesLoading}
                hasMore={hasMoreCategories}
                onLoadMore={handleLoadMoreCategories}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() =>
                  setShowCategoryInputs(!showCategoryInputs)
                }
                type="button"
              >
                + Создать категорию
              </button>
            </div>
            {showCategoryInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitCategory}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      name: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="Название категории"
                  name="name"
                  value={newCategory.name}
                  required
                />
                {isCategoryNameTaken && (
                  <p className="add-product-page__error">
                    Категория с таким названием уже существует
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowCategoryInputs(false);
                      setNewCategory({ name: "" });
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isCategoryNameTaken}
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>

    {/* Информация о поставщике */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">2</div>
        <h3 className="add-product-page__section-title">
          Информация о поставщике
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Поставщик *
        </label>
        <div className="add-product-page__supplier-row">
          <select
            name="client"
            className="add-product-page__input"
            value={newItemData.client}
            onChange={handleChange}
            required
          >
            <option value="">Выберите поставщика</option>
            {filterClient.map((client, idx) => (
              <option key={client.id ?? idx} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
          <button
            className="add-product-page__create-supplier"
            onClick={() => setShowInputs(!showInputs)}
          >
            + Создать поставщика
          </button>
        </div>
        {showInputs && (
          <form
            className="add-product-page__supplier-form"
            onSubmit={onSubmit}
          >
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              placeholder="ФИО"
              name="full_name"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="llc"
              placeholder="ОсОО"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="inn"
              placeholder="ИНН"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="okpo"
              placeholder="ОКПО"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="score"
              placeholder="Р/СЧЁТ"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="bik"
              placeholder="БИК"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="address"
              placeholder="Адрес"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="phone"
              placeholder="Телефон"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="email"
              name="email"
              placeholder="Почта"
            />
            <div className="add-product-page__form-actions">
              <button
                type="button"
                className="add-product-page__cancel-btn"
                onClick={() => setShowInputs(false)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="add-product-page__save-btn"
              >
                Создать
              </button>
            </div>
          </form>
        )}

        <label className="add-product-page__checkbox-label">
          <input
            type="checkbox"
            checked={showDebtForm}
            onChange={(e) => setShowDebtForm(e.target.checked)}
          />
          Добавить долг по этому товару
        </label>

        {showDebtForm && (
          <div className="add-product-page__debt-form">
            {!newItemData.client && (
              <p className="add-product-page__error">
                Выберите поставщика в форме выше!
              </p>
            )}
            {company?.subscription_plan?.name === "Старт" &&
              newItemData.client && (
                <>
                  <div className="add-product-page__form-group">
                    <label className="add-product-page__label">
                      Телефон поставщика
                    </label>
                    <input
                      type="text"
                      onChange={onChangeDebt}
                      name="phone"
                      value={debtState.phone}
                      className="add-product-page__input"
                    />
                  </div>
                  <div className="add-product-page__form-group">
                    <label className="add-product-page__label">
                      Дата оплаты
                    </label>
                    <input
                      type="date"
                      onChange={onChangeDebt}
                      name="dueDate"
                      value={debtState.dueDate}
                      className="add-product-page__input"
                    />
                  </div>
                </>
              )}
            <div className="add-product-page__form-group">
              <label className="add-product-page__label">
                Тип оплаты
              </label>
              <select
                value={debt}
                onChange={(e) => setDebt(e.target.value)}
                className="add-product-page__input"
              >
                <option value="">Тип оплаты</option>
                <option value="Предоплата">Предоплата</option>
                <option value="Долги">Долг</option>
              </select>
            </div>
            {debt === "Предоплата" && (
              <>
                <div className="add-product-page__form-group">
                  <label className="add-product-page__label">
                    Сумма предоплаты
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="add-product-page__input"
                  />
                </div>
                <div className="add-product-page__form-group">
                  <label className="add-product-page__label">
                    Срок долга (мес.)
                  </label>
                  <input
                    type="text"
                    value={debtMonths}
                    onChange={(e) => setDebtMonths(e.target.value)}
                    className="add-product-page__input"
                  />
                </div>
              </>
            )}
            {debt === "Долги" && (
              <div className="add-product-page__form-group">
                <label className="add-product-page__label">
                  Срок долга (мес.)
                </label>
                <input
                  type="text"
                  value={debtMonths}
                  onChange={(e) => setDebtMonths(e.target.value)}
                  className="add-product-page__input"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Цена и количество */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">3</div>
        <h3 className="add-product-page__section-title">
          Цена и количество
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Закупочная цена за 1 {marketData.unit || "ед."} *
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="purchase_price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.purchase_price}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">P</span>
        </div>
        {fieldErrors.purchase_price && (
          <p className="add-product-page__error">
            {fieldErrors.purchase_price}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Розничная цена за 1 {marketData.unit || "ед."} *
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.price}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">P</span>
        </div>
        {fieldErrors.price && (
          <p className="add-product-page__error">
            {fieldErrors.price}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Оптовая цена за 1 {marketData.unit || "ед."}
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="wholesale_price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.wholesale_price || ""}
            onChange={handleChange}
          />
          <span className="add-product-page__currency">P</span>
        </div>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          Количество *
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="quantity"
            placeholder="0"
            className="add-product-page__input"
            value={newItemData.quantity}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">шт</span>
        </div>
        {fieldErrors.quantity && (
          <p className="add-product-page__error">
            {fieldErrors.quantity}
          </p>
        )}
      </div>
    </div>

    {/* Кнопки действий */}
    <div className="add-product-page__actions">
      <button
        type="button"
        className="nur-btn nur-btn--secondary add-product-page__cancel-btn"
        onClick={handleReturn}
        disabled={creating}
      >
        Отмена
      </button>
      <button
        type="button"
        className="nur-btn nur-btn--primary add-product-page__submit-btn"
        onClick={handleSubmit}
        disabled={creating}
      >
        {creating ? "Добавление..." : "Добавить товар"}
      </button>
    </div>
  </div>
</>
  );
};

export default ManualEntryForm;
