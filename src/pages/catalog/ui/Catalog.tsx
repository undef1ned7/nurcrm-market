import { Component, Fragment, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  FaShoppingCart,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
} from "react-icons/fa";
import api from "@shared/api";
import "./Catalog.scss";
import "./ShowcaseTheme.scss";
import {
  toNum,
  money,
  normalizePhoneForWa,
  buildWaLink,
  getShowcasePhoneRaw,
  getQuery,
  PAGE_SIZE,
  SORT_OPTIONS,
  SORT_TO_ORDERING,
  sortShowcaseItems,
  setQuery,
} from "./catalog.utils";
import {
  activePalette,
  buildThemeCss,
  makePlaceholderImg,
  mediaUrl,
  sortKeyToQuery,
  SORT_KEYS,
  tx,
  type Section,
  type ShowcaseDesign,
} from "../model/showcaseDesign";
import { useShowcaseDesign, usePrefersDark } from "../model/useShowcaseDesign";
import { useShowcaseSeo, useThemeFont } from "../model/useShowcaseHead";
import { useShowcaseCategories, useShowcaseItems } from "../model/useShowcaseData";
import { ShowcaseCard, LEGACY_CARD_VIEW, type CardView } from "./components/ShowcaseCard";
import { ShowcaseModal } from "./components/ShowcaseModal";
import { SideCart, type CartView, type CheckoutForm } from "./components/SideCart";
import { ShowcaseHeader, ShowcaseAnnouncement, PreviewBar } from "./components/ShowcaseHeader";
import { ShowcaseHero } from "./components/ShowcaseHero";
import {
  ShowcaseCategories,
  arrangeCategories,
  type ShowcaseCategory,
} from "./components/ShowcaseCategories";
import { ShowcaseFooter, ShowcaseContacts } from "./components/ShowcaseFooter";
import {
  ProductRail,
  BannersSection,
  PromoBlocksSection,
  TextSection,
} from "./components/ShowcaseSections";

/** Порядок блоков без оформления — как было до редактора. */
const LEGACY_SECTIONS: Section[] = (["hero", "categories", "products"] as const).map((type) => ({
  id: type,
  type,
  raw: {},
}));

const EMPTY_FORM: CheckoutForm = { phone: "", name: "", address: "", comment: "", method: "pickup" };

const RAIL_TITLE_KEYS: Record<string, string> = {
  new_arrivals: "catalog.sections.newArrivals",
  on_sale: "catalog.sections.onSale",
  featured: "catalog.sections.featured",
};

const categoryImage = (c: any): string => {
  const urls = c?.image_urls;
  if (urls && typeof urls === "object") {
    return urls["320"] || urls["640"] || urls.original || (Object.values(urls)[0] as string) || "";
  }
  return typeof c?.image === "string" ? c.image : "";
};

/* =======================
   Page: Catalog
   Оформление из редактора витрины; если его нет или при отрисовке
   что-то сломалось — витрина показывается в стандартном виде.
======================= */
const Catalog = () => {
  const { slug = "" } = useParams();
  const location = useLocation();
  const previewToken = useMemo(
    () => (new URLSearchParams(location.search).get("preview") || "").trim(),
    [location.search],
  );
  const { design, ready, previewInvalid } = useShowcaseDesign(slug, previewToken);
  const [brokenDesign, setBrokenDesign] = useState<ShowcaseDesign | null>(null);
  const usable = design && design !== brokenDesign ? design : null;

  if (slug && !ready) {
    return (
      <section className="shopfront shopfront--booting" aria-busy="true">
        <div className="sfgrid__loaderSpinner" />
      </section>
    );
  }

  return (
    <DesignBoundary resetKey={usable} onError={() => design && setBrokenDesign(design)}>
      <CatalogView
        slug={slug}
        design={usable}
        previewToken={previewToken}
        previewInvalid={previewInvalid}
      />
    </DesignBoundary>
  );
};

/** Ошибка отрисовки с оформлением → повторяем без оформления, а не белый экран. */
class DesignBoundary extends Component<
  { resetKey: unknown; onError: () => void; children: ReactNode },
  { hasError: boolean; key: unknown }
> {
  state = { hasError: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: { resetKey: unknown }, state: { key: unknown }) {
    return props.resetKey !== state.key ? { hasError: false, key: props.resetKey } : null;
  }

  componentDidCatch(error: unknown) {
    console.error("Showcase design render failed, falling back:", error);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

type ViewProps = {
  slug: string;
  design: ShowcaseDesign | null;
  previewToken: string;
  previewInvalid: boolean;
};

function CatalogView({ slug, design, previewToken, previewInvalid }: ViewProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersDark = usePrefersDark();
  const lang = design?.lang || "ru";

  const qState = useMemo(() => getQuery(location.search), [location.search]);

  const [company, setCompany] = useState<any>(null);
  const [companyErr, setCompanyErr] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState("");

  const storageKey = useMemo(
    () => `public_cart_${String(slug || "").trim()}`,
    [slug],
  );
  const [cart, setCart] = useState<any>({});
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const productsRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useThemeFont(design);
  useShowcaseSeo(design, company?.name || "");

  /* restore cart */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setCart(
          parsed.cart && typeof parsed.cart === "object" ? parsed.cart : {},
        );
        const savedForm = parsed.form && typeof parsed.form === "object" ? parsed.form : {};
        setForm({
          ...EMPTY_FORM,
          ...savedForm,
          phone: typeof parsed.clientPhone === "string" ? parsed.clientPhone : "",
          method: savedForm.method === "delivery" ? "delivery" : "pickup",
        });
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  /* persist cart */
  useEffect(() => {
    try {
      const { phone, ...rest } = form;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ cart, clientPhone: phone, form: rest }),
      );
    } catch {
      // ignore
    }
  }, [storageKey, cart, form]);

  const lines = useMemo(
    () => Object.values(cart || {}).filter((x: any) => toNum(x.qty) > 0),
    [cart],
  );
  const subtotal: number = useMemo(
    () => lines.reduce((s: number, x: any) => s + toNum(x.qty) * toNum(x.price), 0),
    [lines],
  );
  const cartCount: any = useMemo(
    () => lines.reduce((s: any, x: any) => s + toNum(x.qty), 0),
    [lines],
  );

  const setQS = useCallback(
    (patch) => {
      const next = setQuery(location.search, patch);
      navigate(
        { pathname: location.pathname, search: next },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  /* load company + phones_howcase */
  useEffect(() => {
    if (!slug) return;

    let alive = true;
    setCompanyLoading(true);
    setCompanyErr("");

    api
      .get(`/main/public/companies/${encodeURIComponent(slug)}/`)
      .then((res) => {
        if (!alive) return;
        setCompany(res?.data || null);
      })
      .catch((e: any) => {
        if (!alive) return;
        console.error(e);
        const status = e?.response?.status;
        if (status === 404)
          setCompanyErr(t("catalog.companyNotFound"));
        else if (status) setCompanyErr(t("catalog.companyLoadError", { status }));
        else setCompanyErr(t("catalog.companyLoadErrorGeneric"));
        setCompany(null);
      })
      .finally(() => {
        if (!alive) return;
        setCompanyLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  /* sort: значение из адреса, иначе `products.default_sort` */
  const sortKeys: string[] = useMemo(() => {
    const keys = design ? [...design.products.sort_options] : [...SORT_KEYS];
    const def = design?.products.default_sort || "default";
    return keys.includes(def) ? keys : [def, ...keys];
  }, [design]);
  const defaultSortKey = design?.products.default_sort || "default";
  const currentSortKey =
    qState.sort && (SORT_KEYS as readonly string[]).includes(qState.sort)
      ? qState.sort
      : defaultSortKey;
  const sortQuery = sortKeyToQuery(currentSortKey);

  const pageSize = design?.products.page_size || PAGE_SIZE;
  const pagination = design?.products.pagination || "pages";

  /* fetch showcase */
  const {
    items,
    count,
    loading,
    loadingMore,
    error: itemsError,
    hasMore,
    loadMore,
  } = useShowcaseItems({
    slug,
    category: qState.category,
    q: qState.q,
    ordering: SORT_TO_ORDERING[sortQuery] || "",
    pageSize,
    mode: pagination,
    page: parseInt(qState.page, 10) || 1,
  });

  const err =
    itemsError === null
      ? ""
      : itemsError === 404
        ? t("catalog.showcaseNotFound")
        : itemsError
          ? t("catalog.showcaseLoadError", { status: itemsError })
          : t("catalog.showcaseLoadErrorGeneric");

  /* infinite: подгружаем, когда низ сетки виден */
  useEffect(() => {
    if (pagination !== "infinite" || !hasMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pagination, hasMore, loadMore, items.length]);

  /* categories: из товаров (если нет списка с сервера) */
  const categoriesFromItems = useMemo(() => {
    const map = new Map();
    (items || []).forEach((p) => {
      if (!p?.category || !p?.category_title) return;
      map.set(String(p.category), {
        id: String(p.category),
        title: String(p.category_title),
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [items]);

  /* храним полный список категорий, чтобы при выборе одной остальные не пропадали */
  const [allCategories, setAllCategories] = useState<any[]>([]);
  useEffect(() => {
    if (!qState.category && !qState.q && categoriesFromItems.length > 0) {
      setAllCategories(categoriesFromItems);
    }
  }, [qState.category, qState.q, categoriesFromItems]);

  const apiCategories = useShowcaseCategories(slug);

  const categories: ShowcaseCategory[] = useMemo(() => {
    let base: ShowcaseCategory[];
    if (apiCategories && apiCategories.length > 0) {
      base = apiCategories
        .filter((c) => c?.id && (c.products_count == null || Number(c.products_count) > 0))
        .map((c) => ({
          id: String(c.id),
          title: tx(c.title, lang) || String(c.name || ""),
          count: c.products_count == null ? null : Number(c.products_count),
          image: categoryImage(c),
        }))
        .filter((c) => c.title);
    } else {
      const derived = allCategories.length > 0 ? allCategories : categoriesFromItems;
      base = derived.map((c) => ({ ...c, count: null, image: "" }));
    }
    return arrangeCategories(base, design);
  }, [apiCategories, allCategories, categoriesFromItems, design, lang]);

  /* товары: скрытие «нет в наличии» и «цена 0» из оформления */
  const filterItem = useCallback(
    (p: any) => {
      if (!design) return true;
      if (design.products.hide_out_of_stock && p?.in_stock === false) return false;
      if (design.products.hide_zero_price && toNum(p?.final_price ?? p?.price) <= 0) return false;
      return true;
    },
    [design],
  );

  // Локальная сортировка как fallback (если бэкенд ещё не учитывает ?ordering)
  const visibleItems = useMemo(
    () => sortShowcaseItems(items.filter(filterItem), sortQuery),
    [items, sortQuery, filterItem],
  );

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.max(
    1,
    Math.min(parseInt(qState.page, 10) || 1, totalPages),
  );

  const goToPage = useCallback(
    (pageNum) => {
      const p = Math.max(1, Math.min(Number(pageNum), totalPages));
      setQS({ page: p === 1 ? "" : String(p) });
    },
    [totalPages, setQS],
  );

  const brandTitle =
    company?.name || (companyLoading ? t("catalog.loading") : "TechStore");

  /* cart ops */
  const addToCart = useCallback((item, delta = 1) => {
    const id = String(item?.id || "");
    if (!id) return;

    const title = String(item?.name || item?.title || t("catalog.noTitle"));
    const price = toNum(item?.final_price ?? item?.price);

    setCart((prev) => {
      const next = { ...(prev || {}) };
      const prevQty = toNum(next[id]?.qty);
      const qty = Math.max(0, prevQty + toNum(delta));

      if (qty <= 0) {
        delete next[id];
        return next;
      }

      next[id] = {
        id,
        name: title,
        price,
        qty,
        image_url: item?.image_url || "",
      };
      return next;
    });
  }, []);

  const cartQty = useCallback((id: string) => toNum(cart?.[id]?.qty), [cart]);

  const inc = useCallback((id) => {
    setCart((prev) => {
      const key = String(id || "");
      const next = { ...(prev || {}) };
      if (!next[key]) return next;
      next[key] = {
        ...next[key],
        qty: Math.min(999, toNum(next[key].qty) + 1),
      };
      return next;
    });
  }, []);

  const dec = useCallback((id) => {
    setCart((prev) => {
      const key = String(id || "");
      const next = { ...(prev || {}) };
      if (!next[key]) return next;

      const qty = toNum(next[key].qty) - 1;
      if (qty <= 0) {
        delete next[key];
        return next;
      }

      next[key] = { ...next[key], qty };
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setCart((prev) => {
      const key = String(id || "");
      const next = { ...(prev || {}) };
      delete next[key];
      return next;
    });
  }, []);

  /* modal open/close */
  const openProduct = useCallback((id) => {
    setActiveProductId(String(id || ""));
    setProductOpen(true);
  }, []);

  const closeProduct = useCallback(() => {
    setProductOpen(false);
    setActiveProductId("");
  }, []);

  const scrollToProducts = useCallback(() => {
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* card view */
  const cardView: CardView = useMemo(() => {
    const labels = {
      inStock: t("catalog.stock.in"),
      lowStock: t("catalog.stock.low"),
      outOfStock: t("catalog.stock.out"),
      openProduct: (name: string) => t("catalog.openProductNamed", { name }),
    };
    if (!design) {
      return {
        ...LEGACY_CARD_VIEW,
        newBadgeText: t("catalog.newBadge"),
        addButtonText: t("catalog.addToCart"),
        labels,
      };
    }
    const c = design.card;
    const pal = activePalette(design, prefersDark);
    const placeholder =
      mediaUrl(design.media, c.placeholder_image, 640) ||
      makePlaceholderImg(
        tx(c.placeholder_text, lang) || t("catalog.noPhoto"),
        pal.background,
        pal.text_muted,
        pal.border,
      );
    return {
      themed: true,
      template: c.template,
      priceUnderName: c.price_position === "under_name",
      show: {
        oldPrice: c.show.old_price,
        discountBadge: c.show.discount_badge,
        newBadge: c.show.new_badge,
        category: c.show.category,
        stock: c.show.stock,
        unit: c.show.unit,
        description: c.show.description,
        addButton: c.show.add_button,
        quantityStepper: c.show.quantity_stepper,
      },
      newBadgeDays: c.new_badge_days,
      newBadgeText: tx(c.new_badge_text, lang) || t("catalog.newBadge"),
      addButtonText: tx(c.add_button_text, lang) || t("catalog.addToCart"),
      placeholder,
      shadow: c.shadow,
      border: c.border,
      labels,
    };
  }, [design, prefersDark, lang, t]);

  /* cart settings */
  const cartCfg = design?.cart || null;
  const cartView: CartView | null = useMemo(() => {
    if (!cartCfg) return null;
    return {
      page: cartCfg.style === "page",
      fields: cartCfg.fields,
      phoneCountry: cartCfg.phone_country,
      pickup: cartCfg.delivery.pickup,
      delivery: cartCfg.delivery.delivery,
      zonesText: tx(cartCfg.delivery.zones_text, lang),
      paymentText: tx(cartCfg.payment_text, lang),
      checkoutText: tx(cartCfg.checkout_button_text, lang),
      successText: tx(cartCfg.success_text, lang),
      freeFrom: cartCfg.delivery.free_from,
    };
  }, [cartCfg, lang]);

  const bothMethods = !!cartCfg && cartCfg.delivery.pickup && cartCfg.delivery.delivery;
  const isDelivery =
    !!cartCfg && cartCfg.delivery.delivery && (!cartCfg.delivery.pickup || form.method === "delivery");
  const deliveryFee = useMemo(() => {
    if (!cartCfg || !isDelivery) return 0;
    const fee = toNum(cartCfg.delivery.delivery_fee);
    const freeFrom = cartCfg.delivery.free_from;
    if (freeFrom !== null && freeFrom > 0 && subtotal >= freeFrom) return 0;
    return fee > 0 ? fee : 0;
  }, [cartCfg, isDelivery, subtotal]);
  const total = subtotal + (lines.length > 0 ? deliveryFee : 0);

  const fields = cartCfg?.fields || {
    phone: "required",
    name: "hidden",
    address: "hidden",
    comment: "hidden",
  };
  const addressVisible = fields.address !== "hidden" && (!bothMethods || isDelivery);

  /* WhatsApp checkout */
  const showcasePhoneRaw = useMemo(
    () => cartCfg?.whatsapp_phone || getShowcasePhoneRaw(company),
    [cartCfg, company],
  );
  const phoneShowcaseDigits = useMemo(
    () => normalizePhoneForWa(showcasePhoneRaw),
    [showcasePhoneRaw],
  );

  const checkoutHint = useMemo(() => {
    if (lines.length === 0) return "";
    if (!showcasePhoneRaw) return t("catalog.whatsappUnavailable");
    if (!phoneShowcaseDigits) return t("catalog.whatsappInvalidPhone");
    if (fields.phone === "required" && !form.phone.trim()) return t("catalog.enterClientPhone");
    if (fields.name === "required" && !form.name.trim()) return t("catalog.enterName");
    if (addressVisible && fields.address === "required" && !form.address.trim())
      return t("catalog.enterAddress");
    if (fields.comment === "required" && !form.comment.trim()) return t("catalog.enterComment");
    const min = cartCfg?.min_order_total;
    if (min && min > 0 && subtotal < min) return t("catalog.minOrder", { amount: money(min) });
    return "";
  }, [lines.length, showcasePhoneRaw, phoneShowcaseDigits, form, fields, addressVisible, cartCfg, subtotal, t]);

  const canCheckout = lines.length > 0 && !checkoutHint;

  const checkout = useCallback(() => {
    if (!canCheckout) return;

    const linesText = lines
      .map((ln: any, idx: any) => {
        const sub = toNum(ln.qty) * toNum(ln.price);
        return `${idx + 1}) ${ln.name} — ${ln.qty} x ${money(ln.price)} сом = ${money(sub)} сом`;
      })
      .join("\n");

    const head = [t("catalog.orderFromShowcase", { name: company?.name || "" })];
    if (form.phone.trim()) head.push(t("catalog.clientPhone", { phone: form.phone.trim() }));
    if (cartCfg) {
      if (fields.name !== "hidden" && form.name.trim())
        head.push(t("catalog.orderName", { name: form.name.trim() }));
      if (cartCfg.delivery.pickup || cartCfg.delivery.delivery)
        head.push(isDelivery ? t("catalog.orderDelivery") : t("catalog.orderPickup"));
      if (addressVisible && form.address.trim())
        head.push(t("catalog.orderAddress", { address: form.address.trim() }));
      if (fields.comment !== "hidden" && form.comment.trim())
        head.push(t("catalog.orderComment", { comment: form.comment.trim() }));
    }

    const tail: string[] = [];
    if (deliveryFee > 0) tail.push(t("catalog.orderDeliveryFee", { amount: money(deliveryFee) }));
    tail.push(t("catalog.total", { amount: money(total) }));

    const text =
      `${head.join("\n")}\n\n` +
      `${t("catalog.products")}\n${linesText}\n\n` +
      tail.join("\n");

    const url = buildWaLink(phoneShowcaseDigits, text);
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
    setCart({});
    if (cartCfg) setOrderSent(true);
    else setCartOpen(false);
  }, [
    canCheckout,
    company?.name,
    lines,
    phoneShowcaseDigits,
    total,
    deliveryFee,
    form,
    fields,
    cartCfg,
    isDelivery,
    addressVisible,
    t,
  ]);

  const closeCart = useCallback(() => {
    setCartOpen(false);
    setOrderSent(false);
  }, []);

  const themeCss = useMemo(
    () => (design ? buildThemeCss(design, ".shopfront.shopfront--themed") : ""),
    [design],
  );

  if (!slug) {
    return (
      <section className="shopfront">
        <div className="shopfront__shell">
          <div className="shopfront__empty">
            <div className="shopfront__emptyTitle">{t("catalog.slugNotFound")}</div>
            <div className="shopfront__emptyText">
              {t("catalog.slugHint", { path: location.pathname })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const sortOptions = sortKeys.map((k) => ({
    value: k,
    label: SORT_OPTIONS.find((o) => (o.value || "default") === k)?.label || k,
  }));
  const productsTitle =
    (design && tx(design.products.title, lang)) || t("catalog.allProducts");
  const showCount = design ? design.products.show_count : true;

  const productsBlock = (
    <div className="sfproducts" ref={productsRef} key="products">
      <div className="sfhead">
        <div className="sfhead__left">
          <div className="sfhead__title">
            <FaShoppingCart /> {productsTitle}
          </div>
          {qState.q && (
            <div className="sfhead__searchInfo">
              {t("catalog.searchResults", { query: qState.q })}
            </div>
          )}
        </div>
        <div className="sfhead__right">
          {sortOptions.length > 1 && (
            <div className="sfsort">
              <label className="sfsort__label" htmlFor="sf-sort">
                {t("catalog.sort")}
              </label>
              <select
                id="sf-sort"
                className="sfsort__select"
                value={currentSortKey}
                onChange={(e) =>
                  setQS({
                    sort: e.target.value === defaultSortKey ? "" : e.target.value,
                    page: "",
                  })
                }
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(showCount || companyErr) && (
            <div className="sfhead__count">
              {companyErr ? (
                <span className="sfhead__err">{companyErr}</span>
              ) : loading ? (
                t("catalog.loading")
              ) : (
                t("catalog.productsCount", { count })
              )}
            </div>
          )}
        </div>
      </div>

      {err ? (
        <div className="sfalert">
          <FaInfoCircle /> {err}
        </div>
      ) : null}

      {/* Grid */}
      <div className={`sfgrid ${design ? `sfgrid--${design.card.template}` : ""}`}>
        {loading ? (
          <div className="sfgrid__info">
            <div className="sfgrid__loader">
              <div className="sfgrid__loaderSpinner"></div>
              <div>{t("catalog.loadingProducts")}</div>
            </div>
          </div>
        ) : null}
        {!loading && visibleItems.length === 0 && !err ? (
          <div className="sfgrid__info">
            <div className="sfgrid__empty">
              <FaShoppingCart />
              <div className="sfgrid__emptyTitle">{t("catalog.productsNotFound")}</div>
              <div className="sfgrid__emptyText">
                {qState.q || qState.category
                  ? t("catalog.productsNotFoundFiltered")
                  : t("catalog.productsEmpty")}
              </div>
            </div>
          </div>
        ) : null}

        {!loading &&
          visibleItems.map((p) => (
            <ShowcaseCard
              key={p.id}
              item={p}
              view={cardView}
              qty={cartQty(String(p.id))}
              onAdd={addToCart}
              onOpen={openProduct}
            />
          ))}
      </div>

      {/* Load more / infinite */}
      {!loading && !err && pagination !== "pages" && hasMore && (
        <div className="sfmore" ref={sentinelRef}>
          {pagination === "load_more" ? (
            <button
              type="button"
              className="sfmore__btn"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t("catalog.loading") : t("catalog.loadMore")}
            </button>
          ) : (
            <div className="sfgrid__loaderSpinner sfmore__spinner" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !err && pagination === "pages" && totalPages > 1 && (
        <nav className="sfpager" aria-label={t("catalog.pagination")}>
          <button
            type="button"
            className="sfpager__btn sfpager__btn--prev"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label={t("catalog.prevPage")}
          >
            <FaChevronLeft /> {t("catalog.back")}
          </button>
          <ul className="sfpager__list">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1,
              )
              .reduce((acc: any[], p: any, i: any, arr: any[]) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [] as any[])
              .map((p, i) =>
                p === "…" ? (
                  <li
                    key={`ellipsis-${i}`}
                    className="sfpager__ellipsis"
                    aria-hidden="true"
                  >
                    …
                  </li>
                ) : (
                  <li key={p}>
                    <button
                      type="button"
                      className={`sfpager__btn sfpager__btn--num ${p === currentPage ? "sfpager__btn--active" : ""}`}
                      onClick={() => goToPage(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      aria-label={t("catalog.page", { page: p })}
                    >
                      {p}
                    </button>
                  </li>
                ),
              )}
          </ul>
          <button
            type="button"
            className="sfpager__btn sfpager__btn--next"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label={t("catalog.nextPage")}
          >
            {t("catalog.forward")} <FaChevronRight />
          </button>
        </nav>
      )}
    </div>
  );

  /* блоки страницы в порядке `sections` (только enabled) */
  const rendered = new Set<string>();
  const renderSection = (s: Section): ReactNode => {
    const single = s.type === "hero" || s.type === "categories" || s.type === "products";
    if (single) {
      if (rendered.has(s.type)) return null;
      rendered.add(s.type);
    }
    const sectionTitle = design ? tx(s.raw.title, lang) : "";
    switch (s.type) {
      case "hero":
        return (
          <ShowcaseHero
            key={s.id}
            design={design}
            company={company}
            companyLoading={companyLoading}
            onScrollToProducts={scrollToProducts}
          />
        );
      case "categories":
        return (
          <ShowcaseCategories
            key={s.id}
            design={design}
            categories={categories}
            activeId={qState.category}
            onSelect={(id) => setQS({ category: id, page: "" })}
          />
        );
      case "products":
        return <Fragment key={s.id}>{productsBlock}</Fragment>;
      case "new_arrivals":
      case "on_sale":
      case "featured":
        return (
          <ProductRail
            key={s.id}
            slug={slug}
            section={s}
            title={sectionTitle || t(RAIL_TITLE_KEYS[s.type])}
            view={cardView}
            cartQty={cartQty}
            onAdd={addToCart}
            onOpen={openProduct}
            filterItem={filterItem}
          />
        );
      case "banners":
        return design ? <BannersSection key={s.id} design={design} section={s} /> : null;
      case "promo_blocks":
        return design ? <PromoBlocksSection key={s.id} design={design} /> : null;
      case "text":
        return design ? <TextSection key={s.id} design={design} section={s} /> : null;
      case "contacts":
        return design ? <ShowcaseContacts key={s.id} design={design} title={sectionTitle} /> : null;
      default:
        return null;
    }
  };

  const rootClass = [
    "shopfront",
    design && "shopfront--themed",
    design && `shopfront--btn-${design.theme.button_style}`,
    design?.theme.background_image && "shopfront--bgimg",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass}>
      {themeCss ? <style>{themeCss}</style> : null}

      <PreviewBar preview={!!design?.preview} invalid={!!previewToken && previewInvalid} />
      <ShowcaseAnnouncement design={design} />

      <ShowcaseHeader
        design={design}
        brandFallback={brandTitle}
        query={qState.q}
        onSearch={(q) => setQS({ q, page: "" })}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <div className="shopfront__shell">
        {(design ? design.sections : LEGACY_SECTIONS).map(renderSection)}
      </div>

      <ShowcaseFooter design={design} />

      <ShowcaseModal
        open={productOpen}
        slug={slug}
        productId={activeProductId}
        onClose={closeProduct}
        onAdd={addToCart}
        placeholder={cardView.placeholder}
        showDescription={design ? design.product_page.show_description : true}
        showCharacteristics={design ? design.product_page.show_characteristics : true}
      />

      <SideCart
        open={cartOpen}
        onClose={closeCart}
        lines={lines}
        subtotal={subtotal}
        deliveryFee={lines.length > 0 ? deliveryFee : 0}
        total={total}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onInc={inc}
        onDec={dec}
        onRemove={remove}
        onCheckout={checkout}
        canCheckout={canCheckout}
        checkoutHint={checkoutHint}
        view={cartView}
        sent={orderSent}
        placeholder={cardView.placeholder}
      />
    </section>
  );
}

export default Catalog;
