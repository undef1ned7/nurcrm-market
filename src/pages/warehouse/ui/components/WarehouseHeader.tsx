import React from "react";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@shared/ui/page-shell";
import "./WarehouseHeader.scss";

/**
 * Компонент заголовка склада
 * @param {Function} onCreateProduct - Обработчик создания товара
 * @param {Function} onInventory - Обработчик открытия инвентаризации
 * @param {number} selectedCount - Количество выбранных товаров (для подписи кнопки)
 */
const WarehouseHeader = ({
  onCreateProduct,
  onInventory,
  selectedCount = 0,
}) => {
  return (
    <PageHeader
      className="warehouse-header"
      title="Склад"
      subtitle="Управление товарами и запасами"
      actions={
        <>
          <button
            className="nur-btn nur-btn--secondary"
            onClick={onInventory}
            type="button"
            title={
              selectedCount > 0
                ? "Открыть документы: инвентаризация с выбранными товарами"
                : "Открыть раздел актов инвентаризации (Документы)"
            }
            aria-label={
              selectedCount > 0
                ? `Инвентаризация (${selectedCount})`
                : "Инвентаризация"
            }
          >
            <ClipboardList size={16} />
            <span className="nur-btn__label">
              Инвентаризация{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </span>
          </button>
          <button
            className="nur-btn nur-btn--primary"
            onClick={onCreateProduct}
            type="button"
            title="Создать товар"
            aria-label="Создать товар"
          >
            <Plus size={16} />
            <span className="nur-btn__label">Создать товар</span>
          </button>
        </>
      }
    />
  );
};

export default React.memo(WarehouseHeader);
