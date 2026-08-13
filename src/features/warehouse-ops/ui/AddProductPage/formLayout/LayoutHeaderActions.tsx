import { Check, SlidersHorizontal } from "lucide-react";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

export function LayoutHeaderActions() {
  const layout = useOptionalProductFormLayout();
  if (!layout?.canCustomize) return null;

  if (layout.isCustomizing) {
    return (
      <button
        type="button"
        className="nur-btn nur-btn--primary"
        onClick={layout.finishCustomize}
        disabled={layout.saving}
      >
        <Check size={18} />
        Готово
      </button>
    );
  }

  return (
    <button
      type="button"
      className="nur-btn nur-btn--secondary"
      onClick={layout.startCustomize}
    >
      <SlidersHorizontal size={18} />
      Настроить форму
    </button>
  );
}
