import { useTranslation } from "react-i18next";

const MarketFormActions = ({ handleReturn, handleSubmit, creating, isEditMode }) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  return (
    <div className="market-product-form__actions">
      <button
        type="button"
        className="nur-btn nur-btn--secondary market-product-form__cancel-btn"
        onClick={handleReturn}
        disabled={creating}
      >
        {t("common.cancel")}
      </button>
      <button
        type="button"
        className="nur-btn nur-btn--primary market-product-form__submit-btn"
        onClick={handleSubmit}
        disabled={creating}
      >
        {creating
          ? isEditMode
            ? tp("savingChanges")
            : tp("creatingProduct")
          : isEditMode
            ? tp("saveChanges")
            : tp("createProduct")}
      </button>
    </div>
  );
};

export default MarketFormActions;
