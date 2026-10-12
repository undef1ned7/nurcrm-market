import { useTranslation } from "react-i18next";
import { FaStar, FaTag } from "react-icons/fa";
import { tx, type ShowcaseDesign } from "../../model/showcaseDesign";

export type ShowcaseCategory = {
  id: string;
  title: string;
  count: number | null;
  image: string;
};

type Props = {
  design: ShowcaseDesign | null;
  categories: ShowcaseCategory[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** Применяет `categories.order` и `categories.hidden` из оформления. */
export const arrangeCategories = (
  list: ShowcaseCategory[],
  design: ShowcaseDesign | null,
): ShowcaseCategory[] => {
  if (!design) return list;
  const hidden = new Set(design.categories.hidden);
  const visible = list.filter((c) => !hidden.has(c.id));
  const order = design.categories.order;
  if (order.length === 0) return visible;
  const rank = new Map(order.map((id, i) => [id, i]));
  return visible
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ra = rank.has(a.c.id) ? (rank.get(a.c.id) as number) : order.length + a.i;
      const rb = rank.has(b.c.id) ? (rank.get(b.c.id) as number) : order.length + b.i;
      return ra - rb;
    })
    .map((x) => x.c);
};

export function ShowcaseCategories({ design, categories, activeId, onSelect }: Props) {
  const { t } = useTranslation();
  const cfg = design?.categories;
  const style = cfg?.style || "chips";
  if (style === "hidden" || categories.length === 0) return null;

  const title = (cfg && design && tx(cfg.title, design.lang)) || t("catalog.categories");
  const showAll = cfg ? cfg.show_all : true;
  const showCount = cfg ? cfg.show_count : false;
  const isActive = (id: string) => String(activeId) === String(id);

  const countOf = (c: ShowcaseCategory) =>
    showCount && c.count !== null ? <span className="sfchip__count">{c.count}</span> : null;

  return (
    <div className={`sfcats sfcats--${style}`}>
      <div className="sfcats__header">
        <div className="sfcats__title">
          <FaTag /> {title}
        </div>
        <div className="sfcats__count">
          {t("catalog.categoriesCount", { count: categories.length })}
        </div>
      </div>

      {style === "chips" && (
        <div className="sfcats__row" role="group" aria-label={title}>
          {showAll && (
            <button
              type="button"
              className={`sfchip ${activeId ? "" : "sfchip--active"}`}
              onClick={() => onSelect("")}
            >
              <FaStar /> {t("catalog.all")}
            </button>
          )}
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`sfchip ${isActive(c.id) ? "sfchip--active" : ""}`}
              onClick={() => onSelect(isActive(c.id) && !showAll ? "" : c.id)}
              title={c.title}
            >
              {c.title}
              {countOf(c)}
            </button>
          ))}
        </div>
      )}

      {style === "tiles" && (
        <div className="sfcats__tiles">
          {showAll && (
            <button
              type="button"
              className={`sftile ${activeId ? "" : "sftile--active"}`}
              onClick={() => onSelect("")}
            >
              <span className="sftile__icon" aria-hidden="true">
                <FaStar />
              </span>
              <span className="sftile__title">{t("catalog.all")}</span>
            </button>
          )}
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`sftile ${isActive(c.id) ? "sftile--active" : ""}`}
              onClick={() => onSelect(isActive(c.id) && !showAll ? "" : c.id)}
              title={c.title}
            >
              {c.image ? (
                <img className="sftile__img" src={c.image} alt="" loading="lazy" />
              ) : (
                <span className="sftile__icon" aria-hidden="true">
                  {c.title.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="sftile__title">{c.title}</span>
              {showCount && c.count !== null && (
                <span className="sftile__count">{c.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {style === "list" && (
        <ul className="sfcats__list">
          {showAll && (
            <li>
              <button
                type="button"
                className={`sfcatrow ${activeId ? "" : "sfcatrow--active"}`}
                onClick={() => onSelect("")}
              >
                <span>{t("catalog.all")}</span>
              </button>
            </li>
          )}
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`sfcatrow ${isActive(c.id) ? "sfcatrow--active" : ""}`}
                onClick={() => onSelect(isActive(c.id) && !showAll ? "" : c.id)}
              >
                <span className="sfcatrow__title">{c.title}</span>
                {showCount && c.count !== null && (
                  <span className="sfcatrow__count">{c.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
