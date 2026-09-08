import { useTranslation } from "react-i18next";
import { Check, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

export function CustomizeBar({
  variant = "auto",
}: {
  variant?: "entry" | "edit" | "auto";
}) {
  const layout = useOptionalProductFormLayout();
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  if (!layout?.canCustomize) return null;

  const showEntry =
    (variant === "entry" || variant === "auto") && !layout.isCustomizing;
  const showEdit =
    (variant === "edit" || variant === "auto") && layout.isCustomizing;

  if (showEntry) {
    return (
      <div className="product-form-layout-entry">
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={layout.startCustomize}
        >
          <SlidersHorizontal size={18} />
          {tp("configureForm")}
        </button>
        {layout.hiddenCount > 0 ? (
          <span className="product-form-layout-entry__meta">
            {tp("hiddenFieldsCount", { count: layout.hiddenCount })}
          </span>
        ) : null}
      </div>
    );
  }

  if (!showEdit) return null;

  return (
    <div className="product-form-layout-bar">
      <p className="product-form-layout-bar__hint">
        {tp("customizeHint")}
        {layout.remoteAvailable
          ? tp("customizeSavedCompany")
          : tp("customizeSavedDevice")}
      </p>
      <div className="product-form-layout-bar__actions">
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={layout.resetLayout}
          disabled={layout.hiddenCount === 0}
        >
          <RotateCcw size={16} />
          {t("common.reset")}
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={layout.finishCustomize}
          disabled={layout.saving}
        >
          <Check size={16} />
          {tp("done")}
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--primary product-form-layout-bar__add"
          onClick={() => layout.setAddSheetOpen(true)}
        >
          <Plus size={18} />
          {tp("addField")}
          {layout.hiddenCount > 0 ? ` (${layout.hiddenCount})` : ""}
        </button>
      </div>
    </div>
  );
}
