import React from "react";
import { useTranslation } from "react-i18next";
import { ITEM_TYPES } from "../constants";

/**
 * Компонент выбора типа товара (Товар/Услуга/Комплект)
 */
const ProductTypeSelector = ({ itemType, setItemType, isEditMode = false }) => {
  const { t } = useTranslation();
  if (isEditMode) return null;

  return (
    <div className="market-product-form__type-selector">
      <button
        className={`market-product-form__type-card ${
          itemType === ITEM_TYPES.PRODUCT
            ? "market-product-form__type-card--active"
            : ""
        }`}
        onClick={() => setItemType(ITEM_TYPES.PRODUCT)}
      >
        <h3 className="text-center">
          {t("crm.warehouse.addProduct.typeProduct")}
        </h3>
        <p className="text-center">
          {t("crm.warehouse.addProduct.typeProductDesc")}
        </p>
      </button>
      <button
        className={`market-product-form__type-card ${
          itemType === ITEM_TYPES.SERVICE
            ? "market-product-form__type-card--active"
            : ""
        }`}
        onClick={() => setItemType(ITEM_TYPES.SERVICE)}
      >
        <h3 className="text-center">
          {t("crm.warehouse.addProduct.typeService")}
        </h3>
        <p className="text-center">
          {t("crm.warehouse.addProduct.typeServiceDesc")}
        </p>
      </button>
      <button
        className={`market-product-form__type-card ${
          itemType === ITEM_TYPES.KIT
            ? "market-product-form__type-card--active"
            : ""
        }`}
        onClick={() => setItemType(ITEM_TYPES.KIT)}
      >
        <h3 className="text-center">
          {t("crm.warehouse.addProduct.typeKit")}
        </h3>
        <p className="text-center">
          {t("crm.warehouse.addProduct.typeKitDesc")}
        </p>
      </button>
    </div>
  );
};

export default React.memo(ProductTypeSelector);

