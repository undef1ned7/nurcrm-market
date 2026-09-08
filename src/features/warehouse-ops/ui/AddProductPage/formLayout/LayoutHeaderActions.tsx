import { useTranslation } from "react-i18next";
import { Check, SlidersHorizontal } from "lucide-react";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

export function LayoutHeaderActions() {
  const layout = useOptionalProductFormLayout();
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
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
        {tp("done")}
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
      {tp("configureForm")}
    </button>
  );
}
