import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { createEmptyAlternateBarcodeRow } from "../utils/productUtils";

/**
 * Дополнительные штрихкоды: раскрывающийся список строк
 * {штрихкод, название варианта (вкус/цвет и т.д.), количество в упаковке}.
 * На кассе основное название товара и название варианта складываются:
 * "Асу вода" + "Клубничный" → "Асу вода Клубничный".
 */
const AlternateBarcodesField = ({ rows, onChange, compact = false }) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  const [open, setOpen] = useState(() => (rows?.length ?? 0) > 0);

  const list = Array.isArray(rows) ? rows : [];

  const addRow = () => {
    setOpen(true);
    onChange([...list, createEmptyAlternateBarcodeRow()]);
  };

  const removeRow = (id) => {
    onChange(list.filter((row) => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    onChange(list.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const wrap = compact
    ? "alt-barcodes-field alt-barcodes-field--compact"
    : "alt-barcodes-field";

  return (
    <div className={wrap}>
      <button
        type="button"
        className="alt-barcodes-field__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{tp("altBarcodesLabel")}</span>
        {list.length > 0 && (
          <span className="alt-barcodes-field__count">{list.length}</span>
        )}
        <span className="alt-barcodes-field__chevron" data-open={open}>
          ▾
        </span>
      </button>

      {open && (
        <div className="alt-barcodes-field__panel">
          <p className="alt-barcodes-field__hint">{tp("altBarcodesHint")}</p>

          <button
            type="button"
            className="alt-barcodes-field__add-btn"
            onClick={addRow}
          >
            {tp("altBarcodesAddRow")}
          </button>

          {list.length > 0 && (
            <div className="alt-barcodes-field__table">
              <div className="alt-barcodes-field__row alt-barcodes-field__row--header">
                <span>{tp("altBarcodesColBarcode")}</span>
                <span>{tp("altBarcodesColName")}</span>
                <span>{tp("altBarcodesColQuantity")}</span>
                <span />
              </div>
              {list.map((row) => (
                <div key={row.id} className="alt-barcodes-field__row">
                  <input
                    type="text"
                    className="alt-barcodes-field__input"
                    placeholder={tp("altBarcodesBarcodePlaceholder")}
                    value={row.barcode}
                    onChange={(e) => updateRow(row.id, "barcode", e.target.value)}
                  />
                  <input
                    type="text"
                    className="alt-barcodes-field__input"
                    placeholder={tp("altBarcodesNamePlaceholder")}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="alt-barcodes-field__input"
                    placeholder={tp("altBarcodesQuantityPlaceholder")}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                  />
                  <button
                    type="button"
                    className="alt-barcodes-field__remove"
                    onClick={() => removeRow(row.id)}
                    title={tp("altBarcodesRemoveRow")}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(AlternateBarcodesField);
