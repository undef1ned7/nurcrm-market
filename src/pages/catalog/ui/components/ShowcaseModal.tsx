import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes, FaTag, FaStar, FaInfoCircle } from "react-icons/fa";
import api from "@shared/api";
import { toNum, money, FALLBACK_IMG, getProductImages } from "../catalog.utils";
import { ImageCarousel } from "./ImageCarousel";

type Props = {
  open: boolean;
  slug: string;
  productId: string;
  onClose: () => void;
  onAdd: (item: any, delta?: number) => void;
  placeholder?: string;
  showDescription?: boolean;
  showCharacteristics?: boolean;
};

export function ShowcaseModal({
  open,
  slug,
  productId,
  onClose,
  onAdd,
  placeholder = FALLBACK_IMG,
  showDescription = true,
  showCharacteristics = true,
}: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!open || !slug || !productId) return;

    let alive = true;
    setLoading(true);
    setErr("");
    setData(null);

    api
      .get(
        `/main/public/companies/${encodeURIComponent(slug)}/showcase/${encodeURIComponent(productId)}/`,
      )
      .then((res) => {
        if (!alive) return;
        setData(res?.data || null);
      })
      .catch((e) => {
        if (!alive) return;
        console.error(e);
        setErr("Не удалось загрузить товар.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, slug, productId]);

  const title = String(data?.name || data?.title || "Товар");
  const price = toNum(data?.final_price ?? data?.price);
  const cat = String(data?.category_title || "").toUpperCase();

  const charsRu = useMemo(() => {
    const c = data?.characteristics;
    const out: any[] = [];

    const pushIf = (label, value) => {
      const s = String(value ?? "").trim();
      if (!s) return;
      out.push(`${label}: ${s}`);
    };

    if (c && typeof c === "object" && !Array.isArray(c)) {
      pushIf("Высота, см", c.height_cm);
      pushIf("Ширина, см", c.width_cm);
      pushIf("Глубина, см", c.depth_cm);
      pushIf("Вес, кг", c.factual_weight_kg);
      pushIf("Примечание", c.description);
    }

    return out;
  }, [data]);

  const images = useMemo(() => getProductImages(data), [data]);

  if (!open) return null;

  return (
    <div className="sfmodal" role="dialog" aria-modal="true" aria-label={loading ? undefined : title}>
      <button
        type="button"
        className="sfmodal__backdrop"
        onClick={onClose}
        aria-label={t("common.close")}
      />

      <div className="sfmodal__panel">
        <div className="sfmodal__top">
          <div className="sfmodal__ghost" />
          <button
            type="button"
            className="sfmodal__x"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <FaTimes />
          </button>
        </div>

        <div className="sfmodal__body">
          {loading && <div className="sfmodal__info">Загрузка...</div>}
          {!loading && err && <div className="sfmodal__error">{err}</div>}

          {!loading && !err && data && (
            <div className="sfmodal__grid">
              <div className="sfmodal__left">
                <div className="sfmodal__imgBox">
                  <ImageCarousel
                    key={data?.id || productId}
                    images={images}
                    alt={title}
                    fallback={placeholder}
                    imgClassName="sfmodal__img"
                  />
                </div>
              </div>

              <div className="sfmodal__right">
                <div className="sfmodal__header">
                  {cat ? (
                    <div className="sfmodal__pill">
                      <FaTag /> {cat}
                    </div>
                  ) : null}
                  {data?.is_new && (
                    <div className="sfmodal__newBadge">
                      <FaStar /> Новинка
                    </div>
                  )}
                </div>
                <div className="sfmodal__title">{title}</div>
                <div className="sfmodal__priceRow">
                  <div className="sfmodal__price">{money(price)} сом</div>
                  {data?.price &&
                    data?.final_price &&
                    Number(data.price) !== Number(data.final_price) && (
                      <div className="sfmodal__oldPrice">
                        {money(toNum(data.price))} сом
                      </div>
                    )}
                </div>

                {showDescription && data?.description ? (
                  <div className="sfmodal__desc">
                    <FaInfoCircle /> {String(data.description)}
                  </div>
                ) : null}

                {showCharacteristics && charsRu.length > 0 ? (
                  <div className="sfmodal__block">
                    <div className="sfmodal__blockTitle">
                      <FaInfoCircle /> Характеристики:
                    </div>
                    <ul className="sfmodal__list">
                      {charsRu.map((b, i) => (
                        <li key={`${b}-${i}`}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="sfmodal__cta"
                  onClick={() => onAdd?.(data, 1)}
                >
                  <span className="sfmodal__ctaPlus">+</span>
                  <span>Добавить в корзину</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

