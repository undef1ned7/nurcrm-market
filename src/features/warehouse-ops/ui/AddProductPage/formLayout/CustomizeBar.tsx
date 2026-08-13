import { Check, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

export function CustomizeBar({
  variant = "auto",
}: {
  variant?: "entry" | "edit" | "auto";
}) {
  const layout = useOptionalProductFormLayout();
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
          Настроить форму
        </button>
        {layout.hiddenCount > 0 ? (
          <span className="product-form-layout-entry__meta">
            Скрыто полей: {layout.hiddenCount}
          </span>
        ) : null}
      </div>
    );
  }

  if (!showEdit) return null;

  return (
    <div className="product-form-layout-bar">
      <p className="product-form-layout-bar__hint">
        Нажмите − чтобы скрыть поле. Скрытые поля можно вернуть кнопкой ниже.
        {layout.remoteAvailable
          ? " Сохраняется для всей компании."
          : " Пока сохраняется на этом устройстве."}
      </p>
      <div className="product-form-layout-bar__actions">
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={layout.resetLayout}
          disabled={layout.hiddenCount === 0}
        >
          <RotateCcw size={16} />
          Сбросить
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={layout.finishCustomize}
          disabled={layout.saving}
        >
          <Check size={16} />
          Готово
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--primary product-form-layout-bar__add"
          onClick={() => layout.setAddSheetOpen(true)}
        >
          <Plus size={18} />
          Добавить поле
          {layout.hiddenCount > 0 ? ` (${layout.hiddenCount})` : ""}
        </button>
      </div>
    </div>
  );
}
