import React from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, X } from "lucide-react";
import "./BulkActionsBar.scss";

/**
 * Компонент панели массовых действий
 */
const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkEdit,
  isDeleting,
  isUpdating,
}) => {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  return (
    <div className="warehouse-bulk-actions">
      <div className="warehouse-bulk-actions__content">
        <div className="warehouse-bulk-actions__info">
          <div className="warehouse-bulk-actions__badge">
            <span className="nur-chip nur-chip--primary warehouse-bulk-actions__count">
              {selectedCount}
            </span>
            <span className="warehouse-bulk-actions__text">
              {t("crm.warehouse.bulk.selected", { count: selectedCount })}
            </span>
          </div>
        </div>
        <div className="warehouse-bulk-actions__buttons">
          <button
            type="button"
            className="nur-btn nur-btn--ghost nur-btn--sm"
            onClick={onClearSelection}
            disabled={isDeleting}
            title={t("crm.warehouse.bulk.clearSelection")}
          >
            <X size={16} />
            {t("crm.warehouse.bulk.reset")}
          </button>
          {onBulkEdit && (
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={onBulkEdit}
              disabled={isDeleting || isUpdating}
              title={t("crm.warehouse.bulk.editSelectedTitle")}
            >
              <Pencil size={16} />
              {isUpdating
                ? t("common.saving")
                : t("crm.warehouse.bulk.editSelected")}
            </button>
          )}
          <button
            type="button"
            className="nur-btn nur-btn--danger nur-btn--sm"
            onClick={onBulkDelete}
            disabled={isDeleting}
            title={t("crm.warehouse.bulk.deleteSelectedTitle")}
          >
            <Trash2 size={16} />
            {isDeleting
              ? t("common.deleting")
              : t("crm.warehouse.bulk.deleteSelected")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BulkActionsBar);
