import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css/navigation";
import api from "@shared/api";
import { listFrom } from "../catalog.utils";
import {
  mediaSrcSet,
  mediaUrl,
  safeColor,
  safeLink,
  tx,
  type I18nText,
  type Section,
  type ShowcaseDesign,
} from "../../model/showcaseDesign";
import { ShowcaseCard, type CardView } from "./ShowcaseCard";

/* ---------- подборки товаров: new_arrivals / on_sale / featured ---------- */

const RAIL_FILTERS: Record<string, Record<string, string>> = {
  new_arrivals: { is_new: "true" },
  on_sale: { on_sale: "true" },
  featured: { pinned: "true" },
};

type RailProps = {
  slug: string;
  section: Section;
  title: string;
  view: CardView;
  cartQty: (id: string) => number;
  onAdd: (item: any, delta?: number) => void;
  onOpen: (id: string) => void;
  filterItem: (item: any) => boolean;
};

export function ProductRail({ slug, section, title, view, cartQty, onAdd, onOpen, filterItem }: RailProps) {
  const [items, setItems] = useState<any[]>([]);
  const limit = Math.min(24, Math.max(4, Number(section.raw.limit) || 12));

  useEffect(() => {
    const filter = RAIL_FILTERS[section.type];
    if (!slug || !filter) return;
    let alive = true;
    api
      .get(`/main/public/companies/${encodeURIComponent(slug)}/showcase/`, {
        params: { ...filter, page_size: limit },
      })
      .then((res) => {
        if (!alive) return;
        const arr = listFrom(res);
        setItems(Array.isArray(arr) ? arr : []);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [slug, section.type, limit]);

  const visible = items.filter(filterItem);
  if (visible.length === 0) return null;

  return (
    <section className="sfrail">
      <h2 className="sfsection__title">{title}</h2>
      <div className="sfrail__row">
        {visible.map((p) => (
          <ShowcaseCard
            key={p.id}
            item={p}
            view={view}
            qty={cartQty(String(p.id))}
            onAdd={onAdd}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- баннеры, промо-блоки, текст (этап 2) ----------
   Формат элементов читаем мягко: картинка — id из `media`,
   тексты — словари по языкам, ссылка — строка или { url }. */

const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return undefined;
};

type Slide = { key: string; img: string; srcSet: string; title: string; text: string; link: string | null };

const toSlides = (list: any[], design: ShowcaseDesign): Slide[] =>
  list
    .filter((b) => b && typeof b === "object" && b.enabled !== false)
    .map((b, i) => {
      const imageId = pick(b, "image", "image_id", "media", "desktop_image");
      const id = typeof imageId === "object" ? imageId?.id : imageId;
      return {
        key: String(b.id || i),
        img: mediaUrl(design.media, id, 1080),
        srcSet: mediaSrcSet(design.media, id),
        title: tx(pick(b, "title", "name") as I18nText, design.lang),
        text: tx(pick(b, "subtitle", "text", "description") as I18nText, design.lang),
        link: safeLink(pick(b, "link", "url")),
      };
    })
    .filter((s) => s.img || s.title);

const LinkWrap = ({ link, className, children }: { link: string | null; className: string; children: any }) => {
  if (!link) return <div className={className}>{children}</div>;
  const external = /^https?:/i.test(link);
  return (
    <a
      className={className}
      href={link}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
};

export function BannersSection({ design, section }: { design: ShowcaseDesign; section: Section }) {
  const slides = toSlides(design.banners, design);
  if (slides.length === 0) return null;
  const c = section.raw.carousel || {};
  const multiple = slides.length > 1;

  return (
    <section className="sfbanners">
      <Swiper
        className="sfbanners__swiper"
        modules={[Autoplay, Navigation, Pagination]}
        autoplay={
          multiple && c.autoplay !== false
            ? { delay: Math.max(2, Number(c.interval_s) || 5) * 1000, disableOnInteraction: false }
            : false
        }
        navigation={multiple && c.arrows !== false}
        pagination={multiple && c.dots !== false ? { clickable: true } : false}
        loop={multiple}
        slidesPerView={1}
      >
        {slides.map((s) => (
          <SwiperSlide key={s.key}>
            <LinkWrap link={s.link} className="sfbanner">
              {s.img && (
                <img
                  className="sfbanner__img"
                  src={s.img}
                  srcSet={s.srcSet || undefined}
                  sizes="(max-width: 1145px) 100vw, 1145px"
                  alt={s.title}
                />
              )}
              {(s.title || s.text) && (
                <div className="sfbanner__text">
                  {s.title && <div className="sfbanner__title">{s.title}</div>}
                  {s.text && <div className="sfbanner__sub">{s.text}</div>}
                </div>
              )}
            </LinkWrap>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

export function PromoBlocksSection({ design }: { design: ShowcaseDesign }) {
  const blocks = toSlides(design.promo_blocks, design);
  if (blocks.length === 0) return null;
  const raw = design.promo_blocks.filter((b) => b && typeof b === "object" && b.enabled !== false);

  return (
    <section className="sfpromos">
      {blocks.map((b, i) => {
        const bg = safeColor(raw[i]?.bg || raw[i]?.background);
        const color = safeColor(raw[i]?.text_color || raw[i]?.color);
        return (
          <LinkWrap key={b.key} link={b.link} className="sfpromo">
            <div className="sfpromo__box" style={{ background: bg || undefined, color: color || undefined }}>
              {b.img && <img className="sfpromo__img" src={b.img} srcSet={b.srcSet || undefined} sizes="(max-width: 720px) 100vw, 400px" alt="" loading="lazy" />}
              {(b.title || b.text) && (
                <div className="sfpromo__text">
                  {b.title && <div className="sfpromo__title">{b.title}</div>}
                  {b.text && <div className="sfpromo__sub">{b.text}</div>}
                </div>
              )}
            </div>
          </LinkWrap>
        );
      })}
    </section>
  );
}

export function TextSection({ design, section }: { design: ShowcaseDesign; section: Section }) {
  const title = tx(section.raw.title as I18nText, design.lang);
  const body = tx(pick(section.raw, "text", "body", "content") as I18nText, design.lang);
  if (!title && !body) return null;
  const align = section.raw.align === "center" ? "center" : "left";
  return (
    <section className={`sftext sftext--${align}`}>
      {title && <h2 className="sfsection__title">{title}</h2>}
      {body &&
        body
          .split(/\n{2,}/)
          .map((p, i) => <p key={i} className="sftext__p">{p}</p>)}
    </section>
  );
}
