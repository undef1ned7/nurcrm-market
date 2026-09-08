import { FaStar, FaTag } from "react-icons/fa";
import { toNum, money, FALLBACK_IMG, getProductImages } from "../catalog.utils";
import { ImageCarousel } from "./ImageCarousel";

export function ShowcaseCard({ item, onAdd, onOpen }) {
  const title = String(item?.name || item?.title || "Без названия");
  const cat = String(item?.category_title || "").toUpperCase();
  const price = toNum(item?.final_price ?? item?.price);
  const hasDiscount =
    item?.discount_percent && Number(item.discount_percent) > 0;
  const originalPrice =
    item?.price &&
    item?.final_price &&
    Number(item.price) !== Number(item.final_price)
      ? toNum(item.price)
      : null;
  const images = getProductImages(item);

  return (
    <article className="sfcard">
      <div
        className="sfcard__media"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".swiper-pagination-bullet")) return;
          onOpen?.(item?.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.(item?.id);
          }
        }}
        aria-label="Open product"
      >
        <ImageCarousel
          images={images}
          alt={title}
          fallback={FALLBACK_IMG}
          imgClassName="sfcard__img"
        />
        <div className="sfcard__priceTag">{money(price)} сом</div>
        {hasDiscount && (
          <div className="sfcard__discount">
            <FaTag /> -{Math.round(Number(item.discount_percent) || 0)}%
          </div>
        )}
        {item?.is_new && (
          <div className="sfcard__badge">
            <FaStar /> Новинка
          </div>
        )}
      </div>

      <div className="sfcard__body">
        {cat ? (
          <div className="sfcard__meta">
            <FaTag /> {cat}
          </div>
        ) : (
          <div className="sfcard__meta">{"\u00A0"}</div>
        )}
        <div className="sfcard__title" title={title}>
          {title}
        </div>
        {originalPrice && originalPrice > price && (
          <div className="sfcard__oldPrice">
            <span className="sfcard__oldPriceValue">
              {money(originalPrice)} сом
            </span>
          </div>
        )}

        <button
          type="button"
          className="sfcard__cta"
          onClick={() => onAdd?.(item, 1)}
        >
          <span className="sfcard__ctaPlus">+</span>
          <span>В корзину</span>
        </button>
      </div>
    </article>
  );
};

