import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaSearch, FaShoppingCart, FaTimes, FaEye } from "react-icons/fa";
import { mediaSrcSet, mediaUrl, tx, type ShowcaseDesign } from "../../model/showcaseDesign";

/** Поиск уходит в адрес и на сервер не на каждую букву, а после паузы в наборе. */
const SEARCH_DEBOUNCE_MS = 350;

type HeaderProps = {
  design: ShowcaseDesign | null;
  brandFallback: string;
  query: string;
  onSearch: (q: string) => void;
  cartCount: number;
  onOpenCart: () => void;
};

export function ShowcaseHeader({
  design,
  brandFallback,
  query,
  onSearch,
  cartCount,
  onOpenCart,
}: HeaderProps) {
  const { t } = useTranslation();
  const h = design?.header;

  // Поле обновляется сразу, запрос — после паузы. Внешнее изменение адреса
  // (назад/вперёд, сброс) перезаписывает поле.
  const [text, setText] = useState(query);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    setText(query);
  }, [query]);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);
  const changeSearch = (value: string, immediate = false) => {
    setText(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (immediate) {
      onSearch(value);
      return;
    }
    timerRef.current = window.setTimeout(() => onSearch(value), SEARCH_DEBOUNCE_MS);
  };
  const lang = design?.lang || "ru";

  const logoUrl = design && h ? mediaUrl(design.media, h.logo, 320) : "";
  const logoSrcSet = design && h ? mediaSrcSet(design.media, h.logo) : "";
  const showName = h ? h.show_name : true;
  const name = (h && tx(h.name, lang)) || brandFallback;
  const slogan = h ? tx(h.slogan, lang) : "";
  const showSearch = h ? h.show_search : true;
  const placeholder = (h && tx(h.search_placeholder, lang)) || t("catalog.searchPlaceholder");
  const cartText = (h && tx(h.cart_button.text, lang)) || t("catalog.cart");
  const cartIconOnly = h?.cart_button.style === "icon";

  const className = [
    "sfbar",
    h && !h.sticky && "sfbar--static",
    h?.layout === "logo_center" && "sfbar--center",
    !showSearch && "sfbar--nosearch",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={className} role="banner">
      <div className="sfbar__inner">
        <div className="sfbar__left">
          {logoUrl ? (
            <img
              className="sfbar__logoImg"
              src={logoUrl}
              srcSet={logoSrcSet || undefined}
              sizes="240px"
              alt={name}
            />
          ) : (
            <div className="sfbar__logo" aria-hidden="true">
              <FaShoppingCart />
            </div>
          )}
          {(showName || slogan) && (
            <div className="sfbar__brandBox">
              {showName && <div className="sfbar__brand">{name}</div>}
              {slogan && <div className="sfbar__slogan">{slogan}</div>}
            </div>
          )}
        </div>

        {showSearch && (
          <div className="sfbar__search">
            <FaSearch className="sfbar__searchIcon" />
            <input
              className="sfbar__searchInput"
              type="text"
              value={text}
              maxLength={200}
              onChange={(e) => changeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") changeSearch(text, true);
              }}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            {text ? (
              <button
                type="button"
                className="sfbar__clear"
                onClick={() => changeSearch("", true)}
                aria-label={t("catalog.clearSearch")}
              >
                <FaTimes />
              </button>
            ) : null}
          </div>
        )}

        <div className="sfbar__right">
          <button
            type="button"
            className="sfbar__cartBtn"
            onClick={onOpenCart}
            aria-label={t("catalog.openCart")}
          >
            <FaShoppingCart />
            {!cartIconOnly && <span>{cartText}</span>}
            {cartCount > 0 ? <span className="sfbar__cartBadge">{cartCount}</span> : null}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Полоса объявления над шапкой (`header.announcement`). */
export function ShowcaseAnnouncement({ design }: { design: ShowcaseDesign | null }) {
  const a = design?.header.announcement;
  const text = a && design ? tx(a.text, design.lang) : "";
  if (!a || !a.enabled || !text) return null;

  const style = {
    background: a.bg || undefined,
    color: a.text_color || undefined,
  };
  const external = !!a.link && /^https?:/i.test(a.link);

  return (
    <div className="sfannounce" style={style}>
      {a.link ? (
        <a
          className="sfannounce__link"
          href={a.link}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {text}
        </a>
      ) : (
        text
      )}
    </div>
  );
}

/** Полоса «Предпросмотр» — только для ссылки с ?preview=. */
export function PreviewBar({ preview, invalid }: { preview: boolean; invalid: boolean }) {
  const { t } = useTranslation();
  if (!preview && !invalid) return null;
  return (
    <div className={`sfpreview ${invalid ? "sfpreview--invalid" : ""}`} role="status">
      <FaEye aria-hidden="true" />
      <span>{invalid ? t("catalog.previewInvalid") : t("catalog.previewBar")}</span>
    </div>
  );
}
