import { FaStar, FaTag } from "react-icons/fa";
import { toNum, money, FALLBACK_IMG } from "../catalog.utils";

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

  return (
    <article className="sfcard">
      <button
        type="button"
        className="sfcard__media"
        onClick={() => onOpen?.(item?.id)}
        aria-label="Open product"
      >
        <img
          className="sfcard__img"
          src={item?.image_url || FALLBACK_IMG}
          alt={title}
          loading="lazy"
          onError={(e) => {
            if (e?.currentTarget?.src !== FALLBACK_IMG)
              e.currentTarget.src = FALLBACK_IMG;
          }}
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
      </button>

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

