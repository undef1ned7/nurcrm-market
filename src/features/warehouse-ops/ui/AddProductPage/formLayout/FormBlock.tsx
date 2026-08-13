import type { ReactNode } from "react";
import { PRODUCT_FORM_BLOCK_META } from "./constants";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";
import type { ProductFormBlockId } from "./types";

type Props = {
  id: ProductFormBlockId;
  className?: string;
  inline?: boolean;
  children: ReactNode;
};

export function FormBlock({ id, className = "", inline = false, children }: Props) {
  const layout = useOptionalProductFormLayout();

  if (!layout) {
    if (!className && !inline) return <>{children}</>;
    return (
      <div className={`${inline ? "product-form-block--inline " : ""}${className}`.trim()}>
        {children}
      </div>
    );
  }

  if (!layout.isVisible(id)) return null;

  const customizing = layout.isCustomizing && layout.canCustomize;
  const label = PRODUCT_FORM_BLOCK_META[id]?.label || id;
  const classes = [
    "product-form-block",
    inline ? "product-form-block--inline" : "",
    customizing ? "product-form-block--edit" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {customizing ? (
        <button
          type="button"
          className="product-form-block__remove"
          onClick={() => layout.hideBlock(id)}
          aria-label={`Скрыть: ${label}`}
          title={`Скрыть: ${label}`}
        >
          <span aria-hidden="true">−</span>
        </button>
      ) : null}
      {children}
    </div>
  );
}
