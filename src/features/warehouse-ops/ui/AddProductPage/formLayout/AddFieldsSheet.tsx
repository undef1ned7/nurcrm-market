import { Plus, X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import {
  ALL_PRODUCT_FORM_BLOCK_IDS,
  PRODUCT_FORM_BLOCK_GROUPS,
  PRODUCT_FORM_BLOCK_META,
} from "./constants";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

export function AddFieldsSheet() {
  const layout = useOptionalProductFormLayout();
  if (!layout?.addSheetOpen) return null;

  const hiddenSet = new Set(layout.layout.hidden);
  const groups = PRODUCT_FORM_BLOCK_GROUPS.map((title) => ({
    title,
    items: ALL_PRODUCT_FORM_BLOCK_IDS.filter(
      (id) => PRODUCT_FORM_BLOCK_META[id].group === title && hiddenSet.has(id),
    ).map((id) => PRODUCT_FORM_BLOCK_META[id]),
  })).filter((group) => group.items.length > 0);

  return (
    <ReactPortal wrapperId="product-form-layout-sheet">
      <div className="product-form-layout-sheet">
        <button
          type="button"
          className="product-form-layout-sheet__overlay"
          aria-label="Закрыть"
          onClick={() => layout.setAddSheetOpen(false)}
        />
        <div
          className="product-form-layout-sheet__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-layout-sheet-title"
        >
          <div className="product-form-layout-sheet__header">
            <h2 id="product-form-layout-sheet-title">Добавить поле</h2>
            <button
              type="button"
              className="product-form-layout-sheet__close"
              onClick={() => layout.setAddSheetOpen(false)}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="product-form-layout-sheet__empty">
              Все поля уже на форме. Чтобы убрать лишнее, нажмите красный минус.
            </p>
          ) : (
            <div className="product-form-layout-sheet__groups">
              {groups.map((group) => (
                <section key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="product-form-layout-sheet__item"
                          onClick={() => layout.showBlock(item.id)}
                        >
                          <span className="product-form-layout-sheet__plus">
                            <Plus size={16} />
                          </span>
                          <span>
                            <strong>{item.label}</strong>
                            <small>{item.description}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </ReactPortal>
  );
}
