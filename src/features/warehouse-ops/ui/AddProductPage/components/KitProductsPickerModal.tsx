import { useTranslation } from "react-i18next";
import { CheckSquare, Package, Search, Square, X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import "./KitProductsPickerModal.scss";

const KitProductsPickerModal = ({
  open,
  onClose,
  searchValue = "",
  onSearchChange,
  categoryId = "",
  onCategoryChange,
  categories = [],
  items = [],
  selectedIds,
  onToggle,
  onToggleSelectAll,
  isAllFilteredSelected = false,
  onConfirm,
  confirmLabel,
  emptyText,
  loading = false,
}: any) => {
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  if (!open) return null;

  const resolvedConfirmLabel = confirmLabel || tp("kitPickerConfirm");
  const resolvedEmptyText = emptyText || tp("kitPickerEmpty");
  const selectedCount = selectedIds?.size ?? 0;
  const list = Array.isArray(items) ? items : [];
  const categoryOptions = [
    { value: "", label: tp("kitPickerAllCategories") },
    ...(Array.isArray(categories) ? categories : [])
      .map((cat) => ({
        value: String(cat.id || ""),
        label: cat.name || tp("kitPickerCategoryFallback"),
      }))
      .filter((opt) => opt.value),
  ];

  return (
    <ReactPortal wrapperId="kit-products-picker-modal">
      <div className="kit-picker-modal__overlay" onClick={onClose} role="presentation">
        <div
          className="kit-picker-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kit-picker-modal-title"
        >
        <div className="kit-picker-modal__head">
          <div>
            <h3 id="kit-picker-modal-title">{tp("kitPickerTitle")}</h3>
            <p>{tp("kitPickerSubtitle")}</p>
          </div>
          <button
            type="button"
            className="kit-picker-modal__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="kit-picker-modal__toolbar">
          <label className="kit-picker-modal__search">
            <Search size={16} />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={tp("kitPickerSearchPlaceholder")}
              autoFocus
            />
          </label>
          <select
            className="kit-picker-modal__category"
            value={categoryId}
            onChange={(e) => onCategoryChange?.(e.target.value)}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="kit-picker-modal__select-all"
            onClick={onToggleSelectAll}
            disabled={loading || list.length === 0}
          >
            {isAllFilteredSelected ? (
              <>
                <CheckSquare size={16} />
                {tp("deselectAll")}
              </>
            ) : (
              <>
                <Square size={16} />
                {tp("selectAll")}
              </>
            )}
          </button>
          <span className="kit-picker-modal__count">
            {tp("selectedCountLabel")} <strong>{selectedCount}</strong>
          </span>
        </div>

        <div className="kit-picker-modal__grid">
          {loading ? (
            <div className="kit-picker-modal__empty">
              {tp("loadingProducts")}
            </div>
          ) : list.length === 0 ? (
            <div className="kit-picker-modal__empty">{resolvedEmptyText}</div>
          ) : (
            list.map((item) => {
              const isSelected = selectedIds?.has(item.id);
              return (
                <article
                  key={item.id}
                  className={`kit-picker-modal__card ${
                    isSelected ? "kit-picker-modal__card--selected" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`kit-picker-modal__check ${
                      isSelected ? "kit-picker-modal__check--on" : ""
                    }`}
                    onClick={() => onToggle?.(item.id)}
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? tp("deselectItem", { title: item.title })
                        : tp("selectItem", { title: item.title })
                    }
                  >
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <button
                    type="button"
                    className="kit-picker-modal__card-body"
                    onClick={() => onToggle?.(item.id)}
                  >
                    <div className="kit-picker-modal__media">
                      <Package size={20} />
                    </div>
                    <div className="kit-picker-modal__info">
                      <strong title={item.title}>{item.title}</strong>
                      {item.subtitle ? <span>{item.subtitle}</span> : null}
                      {item.meta ? <small>{item.meta}</small> : null}
                    </div>
                  </button>
                </article>
              );
            })
          )}
        </div>

        <div className="kit-picker-modal__actions">
          <button
            type="button"
            className="kit-picker-modal__btn kit-picker-modal__btn--secondary"
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="kit-picker-modal__btn kit-picker-modal__btn--primary"
            disabled={selectedCount === 0}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
      </div>
    </ReactPortal>
  );
};

export default KitProductsPickerModal;
