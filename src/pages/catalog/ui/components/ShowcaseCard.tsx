import { FaStar, FaTag } from "react-icons/fa";
import { toNum, money, FALLBACK_IMG, getProductImages } from "../catalog.utils";
import { isNewProduct, type CardTemplate, type StockMode } from "../../model/showcaseDesign";
import { ImageCarousel } from "./ImageCarousel";
import { QtyStepper } from "./QtyStepper";

/** Что и как показывать в карточке. Без оформления — прежний вид витрины. */
export type CardView = {
  themed: boolean;
  template: CardTemplate;
  priceUnderName: boolean;
  show: {
    oldPrice: boolean;
    discountBadge: boolean;
    newBadge: boolean;
    category: boolean;
    stock: StockMode;
    unit: boolean;
    description: boolean;
    addButton: boolean;
    quantityStepper: boolean;
  };
  newBadgeDays: number | null;
  newBadgeText: string;
  addButtonText: string;
  placeholder: string;
  shadow: boolean;
  border: boolean;
  labels: {
    inStock: string;
    lowStock: string;
    outOfStock: string;
    /** Подпись кнопки-фото с названием товара (для экранного диктора). */
    openProduct: (name: string) => string;
  };
};

export const LEGACY_CARD_VIEW: CardView = {
  themed: false,
  template: "standard",
  priceUnderName: false,
  show: {
    oldPrice: true,
    discountBadge: true,
    newBadge: true,
    category: true,
    stock: "hidden",
    unit: false,
    description: false,
    addButton: true,
    quantityStepper: false,
  },
  newBadgeDays: null,
  newBadgeText: "Новинка",
  addButtonText: "В корзину",
  placeholder: FALLBACK_IMG,
  shadow: true,
  border: true,
  labels: { inStock: "", lowStock: "", outOfStock: "", openProduct: (name) => name },
};

type Props = {
  item: any;
  view?: CardView;
  /** Сколько штук этого товара уже в корзине (для выбора количества). */
  qty?: number;
  onAdd?: (item: any, delta?: number) => void;
  onOpen?: (id: string) => void;
};

const stockBadge = (item: any, mode: StockMode, labels: CardView["labels"]) => {
  if (mode === "hidden") return null;
  if (item?.in_stock === false) {
    return mode === "always" ? { cls: "out", text: labels.outOfStock } : null;
  }
  if (item?.low_stock) return { cls: "low", text: labels.lowStock };
  return mode === "always" ? { cls: "in", text: labels.inStock } : null;
};

export function ShowcaseCard({ item, view = LEGACY_CARD_VIEW, qty = 0, onAdd, onOpen }: Props) {
  const { show, themed } = view;
  const title = String(item?.name || item?.title || "Без названия");
  const cat = String(item?.category_title || "").toUpperCase();
  const price = toNum(item?.final_price ?? item?.price);
  const discountPercent = Math.round(Number(item?.discount_percent) || 0);
  const hasDiscount = discountPercent > 0;
  const originalPrice =
    item?.price &&
    item?.final_price &&
    Number(item.price) !== Number(item.final_price)
      ? toNum(item.price)
      : null;
  const showOldPrice = show.oldPrice && !!originalPrice && originalPrice > price;
  const isNew = show.newBadge && isNewProduct(item, view.newBadgeDays);
  const images = getProductImages(item);
  const unit = show.unit ? String(item?.unit || "").trim() : "";
  const priceText = `${money(price)} сом${unit ? ` / ${unit}` : ""}`;
  const stock = stockBadge(item, show.stock, view.labels);
  const description = show.description ? String(item?.description || "").trim() : "";

  const className = [
    "sfcard",
    themed && `sfcard--${view.template}`,
    themed && view.shadow && "sfcard--shadow",
    themed && view.border && "sfcard--border",
    themed && item?.in_stock === false && "sfcard--out",
  ]
    .filter(Boolean)
    .join(" ");

  const open = () => onOpen?.(item?.id);

  return (
    <article className={className}>
      <div
        className="sfcard__media"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".swiper-pagination-bullet")) return;
          open();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        aria-label={view.labels.openProduct(title)}
      >
        <ImageCarousel
          images={images}
          alt={title}
          fallback={view.placeholder}
          imgClassName="sfcard__img"
        />
        {!view.priceUnderName && <div className="sfcard__priceTag">{priceText}</div>}
        {show.discountBadge && hasDiscount && (
          <div className="sfcard__discount">
            <FaTag /> -{discountPercent}%
          </div>
        )}
        {isNew && (
          <div className="sfcard__badge">
            <FaStar /> {view.newBadgeText}
          </div>
        )}
      </div>

      <div className="sfcard__body">
        {show.category &&
          (cat ? (
            <div className="sfcard__meta">
              <FaTag /> {cat}
            </div>
          ) : (
            <div className="sfcard__meta">{" "}</div>
          ))}
        <div className="sfcard__title" title={title} onClick={themed ? open : undefined}>
          {title}
        </div>
        {description && <div className="sfcard__desc">{description}</div>}

        {view.priceUnderName ? (
          <div className="sfcard__priceRow">
            <span className="sfcard__price">{priceText}</span>
            {showOldPrice && (
              <span className="sfcard__oldPriceValue">{money(originalPrice)} сом</span>
            )}
          </div>
        ) : (
          showOldPrice && (
            <div className="sfcard__oldPrice">
              <span className="sfcard__oldPriceValue">{money(originalPrice)} сом</span>
            </div>
          )
        )}

        {stock && <div className={`sfcard__stock sfcard__stock--${stock.cls}`}>{stock.text}</div>}

        {show.addButton &&
          (show.quantityStepper && qty > 0 ? (
            <div className="sfcard__qty">
              <QtyStepper
                value={qty}
                onMinus={() => onAdd?.(item, -1)}
                onPlus={() => onAdd?.(item, 1)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="sfcard__cta"
              onClick={() => onAdd?.(item, 1)}
            >
              <span className="sfcard__ctaPlus">+</span>
              <span>{view.addButtonText}</span>
            </button>
          ))}
      </div>
    </article>
  );
}
