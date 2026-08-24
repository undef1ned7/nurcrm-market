import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaSearch,
  FaShoppingCart,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaTag,
  FaStar,
  FaInfoCircle,
} from "react-icons/fa";
import api from "@shared/api";
import "./Catalog.scss";
import {
  listFrom,
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
import { ShowcaseCard } from "./components/ShowcaseCard";
import { ShowcaseModal } from "./components/ShowcaseModal";
import { SideCart } from "./components/SideCart";

/* =======================
   Page: Catalog
======================= */
const Catalog = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const qState = useMemo(() => getQuery(location.search), [location.search]);

  const [company, setCompany] = useState<any>(null);
  const [companyErr, setCompanyErr] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [cartOpen, setCartOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState("");

  const storageKey = useMemo(
    () => `public_cart_${String(slug || "").trim()}`,
    [slug],
  );
  const [cart, setCart] = useState<any>({});
  const [clientPhone, setClientPhone] = useState("");

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
        setClientPhone(
          typeof parsed.clientPhone === "string" ? parsed.clientPhone : "",
        );
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  /* persist cart */
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ cart, clientPhone }));
    } catch {
      // ignore
    }
  }, [storageKey, cart, clientPhone]);

  const lines = useMemo(
    () => Object.values(cart || {}).filter((x: any) => toNum(x.qty) > 0),
    [cart],
  );
  const total = useMemo(
    () => lines.reduce((s: any, x: any) => s + toNum(x.qty) * toNum(x.price), 0),
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

  /* fetch showcase */
  useEffect(() => {
    if (!slug) return;

    let alive = true;
    setLoading(true);
    setErr("");

    const paramsQ: any = { page_size: PAGE_SIZE };
    const pageNum = Math.max(1, parseInt(qState.page, 10) || 1);
    paramsQ.page = pageNum;
    if (qState.category) paramsQ.category = qState.category;
    if (qState.q) paramsQ.search = qState.q;
    if (qState.sort && SORT_TO_ORDERING[qState.sort]) {
      paramsQ.ordering = SORT_TO_ORDERING[qState.sort];
    }

    api
      .get(`/main/public/companies/${encodeURIComponent(slug)}/showcase/`, {
        params: paramsQ,
      })
      .then((res) => {
        if (!alive) return;
        const data = res?.data || {};
        const arr = listFrom(res);
        const safeArr = Array.isArray(arr) ? arr : [];
        setItems(safeArr);
        setCount(
          Number.isFinite(Number(data.count))
            ? Number(data.count)
            : safeArr.length,
        );
      })
      .catch((e: any) => {
        if (!alive) return;
        console.error(e);
        setItems([]);
        setCount(0);
        const status = e?.response?.status;
        if (status === 404) setErr(t("catalog.showcaseNotFound"));
        else if (status) setErr(t("catalog.showcaseLoadError", { status }));
        else setErr(t("catalog.showcaseLoadErrorGeneric"));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug, qState.category, qState.q, qState.page, qState.sort]);

  /* categories: из текущих items (для пустого фильтра — полный список) */
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

  const categories =
    allCategories.length > 0 ? allCategories : categoriesFromItems;

  // Локальная сортировка как fallback (если бэкенд ещё не учитывает ?ordering)
  const visibleItems = useMemo(
    () => sortShowcaseItems(items, qState.sort),
    [items, qState.sort],
  );

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
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

  /* WhatsApp checkout */
  const showcasePhoneRaw = useMemo(
    () => getShowcasePhoneRaw(company),
    [company],
  );
  const phoneShowcaseDigits = useMemo(
    () => normalizePhoneForWa(showcasePhoneRaw),
    [showcasePhoneRaw],
  );

  const checkoutHint = useMemo(() => {
    if (lines.length === 0) return "";
    if (!showcasePhoneRaw) return t("catalog.whatsappUnavailable");
    if (!phoneShowcaseDigits) return t("catalog.whatsappInvalidPhone");
    if (!String(clientPhone || "").trim()) return t("catalog.enterClientPhone");
    return "";
  }, [lines.length, showcasePhoneRaw, phoneShowcaseDigits, clientPhone, t]);

  const canCheckout = useMemo(() => {
    if (lines.length === 0) return false;
    if (!phoneShowcaseDigits) return false;
    if (!String(clientPhone || "").trim()) return false;
    return true;
  }, [lines.length, phoneShowcaseDigits, clientPhone]);

  const checkout = useCallback(() => {
    if (!canCheckout) return;

    const linesText = lines
      .map((ln: any, idx: any) => {
        const sub = toNum(ln.qty) * toNum(ln.price);
        return `${idx + 1}) ${ln.name} — ${ln.qty} x ${money(ln.price)} сом = ${money(sub)} сом`;
      })
      .join("\n");

    const text =
      `${t("catalog.orderFromShowcase", { name: company?.name || "" })}\n` +
      `${t("catalog.clientPhone", { phone: String(clientPhone).trim() })}\n\n` +
      `${t("catalog.products")}\n${linesText}\n\n` +
      `${t("catalog.total", { amount: money(total) })}`;

    const url = buildWaLink(phoneShowcaseDigits, text);
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
    setCart({});
    setCartOpen(false);
  }, [
    canCheckout,
    company?.name,
    lines,
    phoneShowcaseDigits,
    total,
    clientPhone,
  ]);

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

  return (
    <section className="shopfront">
      {/* Top Bar */}
      <header className="sfbar">
        <div className="sfbar__inner">
          <div className="sfbar__left">
            <div className="sfbar__logo" aria-hidden="true">
              <FaShoppingCart />
            </div>
            <div className="sfbar__brand">{brandTitle}</div>
          </div>

          <div className="sfbar__search">
            <FaSearch className="sfbar__searchIcon" />
            <input
              className="sfbar__searchInput"
              value={qState.q}
              onChange={(e) => setQS({ q: e.target.value, page: "" })}
              placeholder={t("catalog.searchPlaceholder")}
            />
            {qState.q ? (
              <button
                type="button"
                className="sfbar__clear"
                onClick={() => setQS({ q: "", page: "" })}
                aria-label={t("catalog.clearSearch")}
              >
                <FaTimes />
              </button>
            ) : null}
          </div>

          <div className="sfbar__right">
            <button
              type="button"
              className="sfbar__cartBtn"
              onClick={() => setCartOpen(true)}
              aria-label={t("catalog.openCart")}
            >
              <FaShoppingCart />
              <span>{t("catalog.cart")}</span>
              {cartCount > 0 ? (
                <span className="sfbar__cartBadge">{cartCount}</span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <div className="shopfront__shell">
        {/* Hero Section */}
        {company && !companyLoading && (
          <div className="shopfront__hero">
            <div className="shopfront__heroContent">
              <h1 className="shopfront__heroTitle">
                {company.name || t("catalog.welcome")}
              </h1>
              {company.description && (
                <p className="shopfront__heroDesc">{company.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="sfcats">
            <div className="sfcats__header">
              <div className="sfcats__title">
                <FaTag /> {t("catalog.categories")}
              </div>
              <div className="sfcats__count">
                {t("catalog.categoriesCount", { count: categories.length })}
              </div>
            </div>

            <div className="sfcats__row" aria-label="Categories">
              <button
                type="button"
                className={`sfchip ${qState.category ? "" : "sfchip--active"}`}
                onClick={() => setQS({ category: "", page: "" })}
              >
                <FaStar /> {t("catalog.all")}
              </button>

              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`sfchip ${String(qState.category) === String(c.id) ? "sfchip--active" : ""}`}
                  onClick={() => setQS({ category: c.id, page: "" })}
                  title={c.title}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products header */}
        <div className="sfhead">
          <div className="sfhead__left">
            <div className="sfhead__title">
              <FaShoppingCart /> {t("catalog.allProducts")}
            </div>
            {qState.q && (
              <div className="sfhead__searchInfo">
                {t("catalog.searchResults", { query: qState.q })}
              </div>
            )}
          </div>
          <div className="sfhead__right">
            <div className="sfsort">
              <label className="sfsort__label" htmlFor="sf-sort">
                {t("catalog.sort")}
              </label>
              <select
                id="sf-sort"
                className="sfsort__select"
                value={qState.sort}
                onChange={(e) => setQS({ sort: e.target.value, page: "" })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value || "default"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sfhead__count">
              {companyErr ? (
                <span className="sfhead__err">{companyErr}</span>
              ) : loading ? (
                t("catalog.loading")
              ) : (
                `${count} ${count === 1 ? t("catalog.productCount_one") : count < 5 ? t("catalog.productCount_few") : t("catalog.productCount_many")}`
              )}
            </div>
          </div>
        </div>

        {err ? (
          <div className="sfalert">
            <FaInfoCircle /> {err}
          </div>
        ) : null}

        {/* Grid */}
        <div className="sfgrid">
          {loading ? (
            <div className="sfgrid__info">
              <div className="sfgrid__loader">
                <div className="sfgrid__loaderSpinner"></div>
                <div>{t("catalog.loadingProducts")}</div>
              </div>
            </div>
          ) : null}
          {!loading && items.length === 0 && !err ? (
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
                onAdd={addToCart}
                onOpen={openProduct}
              />
            ))}
        </div>

        {/* Pagination */}
        {!loading && !err && totalPages > 1 && (
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

      <ShowcaseModal
        open={productOpen}
        slug={slug}
        productId={activeProductId}
        onClose={closeProduct}
        onAdd={addToCart}
      />

      <SideCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        total={total}
        clientPhone={clientPhone}
        onChangeClientPhone={setClientPhone}
        onInc={inc}
        onDec={dec}
        onRemove={remove}
        onCheckout={checkout}
        canCheckout={canCheckout}
        checkoutHint={checkoutHint}
      />
    </section>
  );
};

export default Catalog;
