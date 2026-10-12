import { useTranslation } from "react-i18next";
import { mediaSrcSet, mediaUrl, tx, type ShowcaseDesign } from "../../model/showcaseDesign";

type Props = {
  design: ShowcaseDesign | null;
  company: any;
  companyLoading: boolean;
  /** Кнопка без ссылки ведёт к товарам. */
  onScrollToProducts: () => void;
};

export function ShowcaseHero({ design, company, companyLoading, onScrollToProducts }: Props) {
  const { t } = useTranslation();

  // Без оформления — прежний блок с названием и описанием компании.
  if (!design) {
    if (!company || companyLoading) return null;
    return (
      <div className="shopfront__hero">
        <div className="shopfront__heroContent">
          <h1 className="shopfront__heroTitle">{company.name || t("catalog.welcome")}</h1>
          {company.description && <p className="shopfront__heroDesc">{company.description}</p>}
        </div>
      </div>
    );
  }

  const { hero, lang, media } = design;
  if (hero.style === "hidden") return null;

  const title = tx(hero.title, lang) || company?.name || "";
  const subtitle = tx(hero.subtitle, lang);
  const imageUrl = mediaUrl(media, hero.image, 1080);
  const srcSet = mediaSrcSet(media, hero.image);
  const btnText = hero.button.enabled ? tx(hero.button.text, lang) : "";
  const style = hero.style === "cover" || hero.style === "split" ? hero.style : "card";

  if (!title && !subtitle && !imageUrl && !btnText) return null;

  const link = hero.button.link;
  const external = !!link && /^https?:/i.test(link);
  const button = btnText ? (
    link ? (
      <a
        className="sfhero__btn"
        href={link}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {btnText}
      </a>
    ) : (
      <button type="button" className="sfhero__btn" onClick={onScrollToProducts}>
        {btnText}
      </button>
    )
  ) : null;

  const className = [
    "shopfront__hero",
    "sfhero",
    `sfhero--${style}`,
    `sfhero--align-${hero.align}`,
    imageUrl && "sfhero--withImage",
  ]
    .filter(Boolean)
    .join(" ");

  const img = imageUrl ? (
    <img
      className="sfhero__img"
      src={imageUrl}
      srcSet={srcSet || undefined}
      sizes={style === "cover" ? "100vw" : "(max-width: 720px) 100vw, 50vw"}
      alt=""
      loading="eager"
    />
  ) : null;

  return (
    <section
      className={className}
      style={style === "cover" ? ({ "--sf-overlay": imageUrl ? hero.overlay : 0 } as any) : undefined}
    >
      {style === "cover" && img}
      <div className="shopfront__heroContent sfhero__content">
        {title && <h1 className="shopfront__heroTitle">{title}</h1>}
        {subtitle && <p className="shopfront__heroDesc">{subtitle}</p>}
        {button}
      </div>
      {style !== "cover" && img && <div className="sfhero__media">{img}</div>}
    </section>
  );
}
