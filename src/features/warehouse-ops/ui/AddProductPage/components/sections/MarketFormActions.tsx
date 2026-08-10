const MarketFormActions = ({ handleReturn, handleSubmit, creating, isEditMode }) => (
  <div className="market-product-form__actions">
    <button
      type="button"
      className="nur-btn nur-btn--secondary market-product-form__cancel-btn"
      onClick={handleReturn}
      disabled={creating}
    >
      Отмена
    </button>
    <button
      type="button"
      className="nur-btn nur-btn--primary market-product-form__submit-btn"
      onClick={handleSubmit}
      disabled={creating}
    >
      {creating
        ? isEditMode
          ? "Сохранение..."
          : "Создание..."
        : isEditMode
          ? "Сохранить изменения"
          : "Создать товар"}
    </button>
  </div>
);

export default MarketFormActions;
