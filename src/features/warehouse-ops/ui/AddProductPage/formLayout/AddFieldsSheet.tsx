import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import {
  ALL_PRODUCT_FORM_BLOCK_IDS,
  PRODUCT_FORM_BLOCK_GROUPS,
  PRODUCT_FORM_BLOCK_META,
} from "./constants";
import { useOptionalProductFormLayout } from "./ProductFormLayoutContext";

const GROUP_TITLE_KEY: Record<string, string> = {
  "Основное": "groupBasic",
  "Классификация": "groupClassification",
  "Единицы и флаги": "groupUnitsFlags",
  "Цены": "groupPrices",
  "Склад": "groupWarehouse",
  "Дополнительно": "groupExtra",
};

export function AddFieldsSheet() {
  const layout = useOptionalProductFormLayout();
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  const blockLabel = (id: string) =>
    tp(`block.${id}.label`, { defaultValue: PRODUCT_FORM_BLOCK_META[id].label });
  const blockDesc = (id: string) =>
    tp(`block.${id}.desc`, {
      defaultValue: PRODUCT_FORM_BLOCK_META[id].description,
    });
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
          aria-label={t("common.close")}
          onClick={() => layout.setAddSheetOpen(false)}
        />
        <div
          className="product-form-layout-sheet__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-layout-sheet-title"
        >
          <div className="product-form-layout-sheet__header">
            <h2 id="product-form-layout-sheet-title">{tp("addField")}</h2>
            <button
              type="button"
              className="product-form-layout-sheet__close"
              onClick={() => layout.setAddSheetOpen(false)}
              aria-label={t("common.close")}
            >
              <X size={20} />
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="product-form-layout-sheet__empty">
              {tp("allFieldsShown")}
            </p>
          ) : (
            <div className="product-form-layout-sheet__groups">
              {groups.map((group) => (
                <section key={group.title}>
                  <h3>
                    {GROUP_TITLE_KEY[group.title]
                      ? tp(GROUP_TITLE_KEY[group.title])
                      : group.title}
                  </h3>
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
                            <strong>{blockLabel(item.id)}</strong>
                            <small>{blockDesc(item.id)}</small>
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
