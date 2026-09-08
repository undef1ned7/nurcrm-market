import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import "../Warehouse.scss";

/**
 * Массовое изменение бренда / категории / поставщика у выбранных товаров.
 * Изменяются только поля с включённым чекбоксом.
 */
const BulkEditModal = ({
  selectedCount,
  onClose,
  onApply,
  saving = false,
  brands = [],
  categories = [],
  suppliers = [],
  suppliersLoading = false,
}: any) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState({
    brand_name: { enabled: false, value: "" },
    category_name: { enabled: false, value: "" },
    client: { enabled: false, value: "" },
  });
  const [error, setError] = useState<any>("");

  const supplierOptions = useMemo(
    () =>
      (Array.isArray(suppliers) ? suppliers : [])
        .map((supplier: any) => ({
          value: String(supplier.id || ""),
          label:
            String(
              supplier.full_name ||
                supplier.name ||
                supplier.company_name ||
                supplier.phone ||
                supplier.email ||
                t("crm.warehouse.noTitle"),
            ).trim() || t("crm.warehouse.noTitle"),
        }))
        .filter((option: any) => option.value && option.label),
    [suppliers],
  );

  const toggleField = (key: any) => {
    setError("");
    setFields((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const changeValue = (key: any, value: any) => {
    setError("");
    setFields((prev: any) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const handleApply = () => {
    const changes: any = {};
    Object.entries(fields).forEach(([key, field]) => {
      if (field.enabled) changes[key] = field.value;
    });

    if (Object.keys(changes).length === 0) {
      setError(t("crm.warehouse.bulkEdit.selectAtLeastOne"));
      return;
    }
    if (Object.values(changes).some((value: any) => !String(value).trim())) {
      setError(t("crm.warehouse.bulkEdit.selectValueForEach"));
      return;
    }

    onApply(changes);
  };

  return (
    <div className="warehouse-filter-overlay" onClick={onClose}>
      <div
        className="warehouse-filter-modal"
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="warehouse-filter-modal__header">
          <h3 className="warehouse-filter-modal__title">
            {t("crm.warehouse.bulkEdit.title")}
          </h3>
          <button className="warehouse-filter-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="warehouse-filter-modal__subtitle">
          {t("crm.warehouse.bulkEdit.subtitle", { count: selectedCount })}
        </p>

        <div className="warehouse-filter-modal__content">
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__checkbox-label">
              <input
                type="checkbox"
                checked={fields.brand_name.enabled}
                onChange={() => toggleField("brand_name")}
              />
              <span>{t("crm.warehouse.bulkEdit.brand")}</span>
            </label>
            <select
              className="warehouse-filter-modal__select"
              value={fields.brand_name.value}
              disabled={!fields.brand_name.enabled}
              onChange={(e: any) => changeValue("brand_name", e.target.value)}
            >
              <option value="">
                {t("crm.warehouse.bulkEdit.chooseBrand")}
              </option>
              {brands.map((brand: any) => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__checkbox-label">
              <input
                type="checkbox"
                checked={fields.category_name.enabled}
                onChange={() => toggleField("category_name")}
              />
              <span>{t("crm.warehouse.bulkEdit.category")}</span>
            </label>
            <select
              className="warehouse-filter-modal__select"
              value={fields.category_name.value}
              disabled={!fields.category_name.enabled}
              onChange={(e: any) => changeValue("category_name", e.target.value)}
            >
              <option value="">
                {t("crm.warehouse.bulkEdit.chooseCategory")}
              </option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__checkbox-label">
              <input
                type="checkbox"
                checked={fields.client.enabled}
                onChange={() => toggleField("client")}
              />
              <span>{t("crm.warehouse.bulkEdit.supplier")}</span>
            </label>
            {fields.client.enabled ? (
              <SearchableCombobox
                value={String(fields.client.value || "")}
                onChange={(value: any) => changeValue("client", String(value || ""))}
                options={supplierOptions}
                placeholder={
                  suppliersLoading
                    ? t("crm.warehouse.bulkEdit.loadingSuppliers")
                    : t("crm.warehouse.bulkEdit.chooseSupplier")
                }
                classNamePrefix="searchableCombo"
              />
            ) : (
              <select className="warehouse-filter-modal__select" disabled>
                <option>{t("crm.warehouse.bulkEdit.chooseSupplier")}</option>
              </select>
            )}
          </div>

          {error ? (
            <p className="warehouse-filter-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="warehouse-filter-modal__footer">
          <button
            type="button"
            className="warehouse-filter-modal__cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            {t("crm.warehouse.filter.cancel")}
          </button>
          <button
            type="button"
            className="warehouse-filter-modal__apply-btn"
            onClick={handleApply}
            disabled={saving}
          >
            {saving ? t("common.saving") : t("crm.warehouse.filter.apply")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BulkEditModal);
