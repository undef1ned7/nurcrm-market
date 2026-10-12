/* =======================
   Оформление онлайн-витрины (ТЗ-BE-2026-05 «Редактор онлайн-витрины»)
   GET /main/public/companies/{slug}/showcase/design/[?preview=<token>]

   Всё, что приходит с сервера, считается недоверенным: каждое поле
   проверяется и подменяется значением по умолчанию. Цвета и шрифт попадают
   в генерируемый CSS только после проверки по белому списку.
======================= */

export type I18nText = Record<string, string> | string | null | undefined;

export type MediaEntry = {
  urls?: Record<string, string>;
  width?: number;
  height?: number;
  kind?: string;
};
export type MediaMap = Record<string, MediaEntry>;

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  text_muted: string;
  accent: string;
  accent_text: string;
  border: string;
  header_bg: string;
  header_text: string;
  footer_bg: string;
  footer_text: string;
  price: string;
  old_price: string;
  badge_new_bg: string;
  badge_new_text: string;
  badge_sale_bg: string;
  badge_sale_text: string;
};

export type ThemeMode = "light" | "dark" | "auto";
export type ShadowLevel = "none" | "soft" | "strong";
export type ButtonStyle = "filled" | "outline" | "soft";
export type FieldMode = "required" | "optional" | "hidden";
export type StockMode = "hidden" | "low_only" | "always";
export type CardTemplate = "compact" | "standard" | "large" | "list";
export type HeroStyle = "card" | "cover" | "split" | "hidden";
export type CategoriesStyle = "chips" | "tiles" | "list" | "hidden";
export type PaginationMode = "pages" | "load_more" | "infinite";

export type SectionType =
  | "hero"
  | "categories"
  | "products"
  | "banners"
  | "promo_blocks"
  | "new_arrivals"
  | "on_sale"
  | "featured"
  | "text"
  | "contacts";

export type Section = {
  id: string;
  type: SectionType;
  raw: Record<string, any>;
};

export type ShowcaseDesign = {
  theme: {
    mode: ThemeMode;
    colors: ThemeColors;
    font: { family: string; base_size: number; heading_weight: number };
    radius: number;
    shadow: ShadowLevel;
    button_style: ButtonStyle;
    background_image: string | null;
  };
  header: {
    logo: string | null;
    logo_height: number;
    show_name: boolean;
    name: I18nText;
    slogan: I18nText;
    layout: "logo_left" | "logo_center";
    sticky: boolean;
    show_search: boolean;
    search_placeholder: I18nText;
    cart_button: { style: string; text: I18nText };
    announcement: {
      enabled: boolean;
      text: I18nText;
      bg: string | null;
      text_color: string | null;
      link: string | null;
    };
  };
  sections: Section[];
  hero: {
    style: HeroStyle;
    title: I18nText;
    subtitle: I18nText;
    image: string | null;
    overlay: number;
    align: "left" | "center";
    button: { enabled: boolean; text: I18nText; link: string | null };
  };
  categories: {
    style: CategoriesStyle;
    title: I18nText;
    show_all: boolean;
    show_count: boolean;
    order: string[];
    hidden: string[];
  };
  products: {
    title: I18nText;
    columns: { desktop: number; tablet: number; mobile: number };
    page_size: number;
    pagination: PaginationMode;
    default_sort: string;
    sort_options: string[];
    show_count: boolean;
    hide_out_of_stock: boolean;
    hide_zero_price: boolean;
  };
  card: {
    template: CardTemplate;
    photo_ratio: string;
    photo_fit: "contain" | "cover";
    price_position: "photo_corner" | "under_name";
    placeholder_image: string | null;
    placeholder_text: I18nText;
    show: {
      old_price: boolean;
      discount_badge: boolean;
      new_badge: boolean;
      category: boolean;
      stock: StockMode;
      unit: boolean;
      description: boolean;
      add_button: boolean;
      quantity_stepper: boolean;
    };
    new_badge_days: number | null;
    new_badge_text: I18nText;
    add_button_text: I18nText;
    shadow: boolean;
    border: boolean;
  };
  product_page: {
    show_description: boolean;
    show_characteristics: boolean;
  };
  cart: {
    style: "drawer" | "page";
    fields: { phone: FieldMode; name: FieldMode; address: FieldMode; comment: FieldMode };
    phone_country: string;
    min_order_total: number | null;
    delivery: {
      pickup: boolean;
      delivery: boolean;
      delivery_fee: number | null;
      free_from: number | null;
      zones_text: I18nText;
    };
    payment_text: I18nText;
    order_channel: string;
    whatsapp_phone: string;
    checkout_button_text: I18nText;
    success_text: I18nText;
  };
  footer: {
    enabled: boolean;
    address: I18nText;
    phones: string[];
    hours: I18nText;
    socials: Record<string, string>;
    map_url: string | null;
    copyright: I18nText;
  };
  seo: {
    title: I18nText;
    description: I18nText;
    og_image: string | null;
    favicon: string | null;
    indexing: boolean;
  };
  banners: any[];
  promo_blocks: any[];
  lang: string;
  media: MediaMap;
  preview: boolean;
  version: number | null;
};

/* ---------- примитивы ---------- */

const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

const num = (v: unknown, fallback: number, min?: number, max?: number) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  let out = n;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

const idOrNull = (v: unknown): string | null => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (isObj(v) && typeof v.id === "string") return v.id;
  return null;
};

/** Ссылка: строка или объект `{ url }`. Пропускаем только http(s), mailto, tel, относительные и якоря. */
export const safeLink = (v: unknown): string | null => {
  const raw = typeof v === "string" ? v : isObj(v) ? str(v.url || v.href) : "";
  const s = raw.trim();
  if (!s) return null;
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (s.startsWith("/") || s.startsWith("#") || s.startsWith("?")) return s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`;
  return null;
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_RE = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/+-]+\)$/i;

/** Цвет для вставки в CSS. Всё, что не похоже на hex/rgb/hsl, отбрасываем. */
export const safeColor = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (HEX_RE.test(s) || FUNC_RE.test(s)) return s;
  return null;
};

/* ---------- тексты на нескольких языках ---------- */

/** Текст на языке `lang`; если там пусто — первый непустой. */
export const tx = (value: I18nText, lang: string): string => {
  if (typeof value === "string") return value.trim();
  if (!isObj(value)) return "";
  const own = str(value[lang]).trim();
  if (own) return own;
  for (const v of Object.values(value)) {
    const s = str(v).trim();
    if (s) return s;
  }
  return "";
};

/* ---------- картинки ---------- */

const MEDIA_SIZES = ["320", "640", "1080", "1920"] as const;

const mediaUrls = (media: MediaMap, id: string | null | undefined) => {
  if (!id) return null;
  const entry = media[id];
  return entry && isObj(entry.urls) ? entry.urls : null;
};

/** Адрес картинки не меньше `minWidth` (или самый большой из имеющихся). */
export const mediaUrl = (
  media: MediaMap,
  id: string | null | undefined,
  minWidth = 640,
): string => {
  const urls = mediaUrls(media, id);
  if (!urls) return "";
  for (const size of MEDIA_SIZES) {
    if (Number(size) >= minWidth && urls[size]) return urls[size];
  }
  return urls.original || urls["1920"] || urls["1080"] || urls["640"] || urls["320"] || "";
};

/** srcset для <img>: браузер сам выберет размер под экран. */
export const mediaSrcSet = (media: MediaMap, id: string | null | undefined): string => {
  const urls = mediaUrls(media, id);
  if (!urls) return "";
  return MEDIA_SIZES.filter((s) => urls[s])
    .map((s) => `${urls[s]} ${s}w`)
    .join(", ");
};

/* ---------- шрифты ---------- */

/** Шрифты из `editor/options/`. Variable — грузим диапазон жирности, PT Sans — только 400/700. */
export const FONT_FAMILIES: Record<string, { weights: string; fallback: string }> = {
  Inter: { weights: "400..900", fallback: "sans-serif" },
  Roboto: { weights: "400..900", fallback: "sans-serif" },
  "Roboto Condensed": { weights: "400..900", fallback: "sans-serif" },
  Montserrat: { weights: "400..900", fallback: "sans-serif" },
  Nunito: { weights: "400..900", fallback: "sans-serif" },
  "PT Sans": { weights: "400;700", fallback: "sans-serif" },
  "Noto Sans": { weights: "400..900", fallback: "sans-serif" },
};

export const DEFAULT_FONT = "Roboto Condensed";

/** Google Fonts с кириллицей (ң ө ү входят в cyrillic-ext). */
export const fontStylesheetHref = (family: string): string | null => {
  const spec = FONT_FAMILIES[family];
  if (!spec) return null;
  const fam = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${spec.weights}&subset=cyrillic,cyrillic-ext&display=swap`;
};

/* ---------- значения по умолчанию ---------- */

export const DEFAULT_COLORS: ThemeColors = {
  background: "#F5F6F8",
  surface: "#FFFFFF",
  text: "#111827",
  text_muted: "#6B7280",
  accent: "#F7D74F",
  accent_text: "#181F2B",
  border: "#E5E7EB",
  header_bg: "#FFFFFF",
  header_text: "#111827",
  footer_bg: "#111827",
  footer_text: "#F9FAFB",
  price: "#111827",
  old_price: "#9CA3AF",
  badge_new_bg: "#22C55E",
  badge_new_text: "#FFFFFF",
  badge_sale_bg: "#EF4444",
  badge_sale_text: "#FFFFFF",
};

/** Тёмная палитра для `mode: dark|auto`, когда в документе светлые цвета. */
const DARK_SURFACES: Partial<ThemeColors> = {
  background: "#0F141B",
  surface: "#1A212B",
  text: "#F1F5F9",
  text_muted: "#94A3B8",
  border: "#2C3644",
  header_bg: "#141A22",
  header_text: "#F1F5F9",
  footer_bg: "#0B0F14",
  footer_text: "#E2E8F0",
  old_price: "#64748B",
};

const DEFAULT_SECTIONS: SectionType[] = ["hero", "categories", "products"];
const SECTION_TYPES: readonly SectionType[] = [
  "hero",
  "categories",
  "products",
  "banners",
  "promo_blocks",
  "new_arrivals",
  "on_sale",
  "featured",
  "text",
  "contacts",
];

export const SORT_KEYS = [
  "default",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
  "discount_desc",
  "discount_asc",
] as const;

const PHOTO_RATIOS = ["1:1", "4:3", "3:4", "16:9"] as const;

/* ---------- нормализация ---------- */

const normColors = (raw: unknown): ThemeColors => {
  const src = isObj(raw) ? raw : {};
  const out = { ...DEFAULT_COLORS };
  (Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]).forEach((k) => {
    const c = safeColor(src[k]);
    if (c) out[k] = c;
  });
  return out;
};

const normSections = (raw: unknown): Section[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SECTIONS.map((type) => ({ id: type, type, raw: {} }));
  }
  const seen = new Set<string>();
  const out: Section[] = [];
  raw.forEach((s, i) => {
    if (!isObj(s) || s.enabled === false) return;
    const type = oneOf<SectionType | "">(s.type, SECTION_TYPES, "");
    if (!type) return;
    const id = str(s.id) || `${type}-${i}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, type, raw: s });
  });
  return out;
};

const normFieldMode = (v: unknown, fallback: FieldMode) =>
  oneOf<FieldMode>(v, ["required", "optional", "hidden"], fallback);

const normPhones = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => (typeof p === "string" ? p : isObj(p) ? str(p.number || p.phone || p.value) : ""))
    .map((p) => p.trim())
    .filter(Boolean);
};

const normSocials = (v: unknown): Record<string, string> => {
  if (!isObj(v)) return {};
  const out: Record<string, string> = {};
  Object.entries(v).forEach(([k, val]) => {
    const s = str(val).trim();
    if (s) out[k] = s;
  });
  return out;
};

const idList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (isObj(x) ? str(x.id) : String(x ?? ""))).filter(Boolean) : [];

/**
 * Приводит ответ сервера к полному, безопасному виду.
 * Возвращает null, если ответ не похож на документ оформления.
 */
export const normalizeDesign = (raw: unknown): ShowcaseDesign | null => {
  if (!isObj(raw) || !isObj(raw.theme)) return null;

  const theme = raw.theme;
  const font = isObj(theme.font) ? theme.font : {};
  const header = isObj(raw.header) ? raw.header : {};
  const cartBtn = isObj(header.cart_button) ? header.cart_button : {};
  const ann = isObj(header.announcement) ? header.announcement : {};
  const hero = isObj(raw.hero) ? raw.hero : {};
  const heroBtn = isObj(hero.button) ? hero.button : {};
  const cats = isObj(raw.categories) ? raw.categories : {};
  const products = isObj(raw.products) ? raw.products : {};
  const cols = isObj(products.columns) ? products.columns : {};
  const card = isObj(raw.card) ? raw.card : {};
  const show = isObj(card.show) ? card.show : {};
  const productPage = isObj(raw.product_page) ? raw.product_page : {};
  const cart = isObj(raw.cart) ? raw.cart : {};
  const fields = isObj(cart.fields) ? cart.fields : {};
  const delivery = isObj(cart.delivery) ? cart.delivery : {};
  const footer = isObj(raw.footer) ? raw.footer : {};
  const seo = isObj(raw.seo) ? raw.seo : {};
  const languages = isObj(raw.languages) ? raw.languages : {};

  const family = str(font.family);
  const sortOptions = Array.isArray(products.sort_options)
    ? products.sort_options.filter((s: unknown) =>
        (SORT_KEYS as readonly string[]).includes(String(s)),
      )
    : [...SORT_KEYS];

  return {
    theme: {
      mode: oneOf<ThemeMode>(theme.mode, ["light", "dark", "auto"], "light"),
      colors: normColors(theme.colors),
      font: {
        family: FONT_FAMILIES[family] ? family : DEFAULT_FONT,
        base_size: num(font.base_size, 15, 13, 18),
        heading_weight: Math.round(num(font.heading_weight, 700, 400, 900) / 100) * 100,
      },
      radius: num(theme.radius, 14, 0, 28),
      shadow: oneOf<ShadowLevel>(theme.shadow, ["none", "soft", "strong"], "soft"),
      button_style: oneOf<ButtonStyle>(theme.button_style, ["filled", "outline", "soft"], "filled"),
      background_image: idOrNull(theme.background_image),
    },
    header: {
      logo: idOrNull(header.logo),
      logo_height: num(header.logo_height, 48, 20, 120),
      show_name: bool(header.show_name, true),
      name: header.name,
      slogan: header.slogan,
      layout: oneOf(header.layout, ["logo_left", "logo_center"] as const, "logo_left"),
      sticky: bool(header.sticky, true),
      show_search: bool(header.show_search, true),
      search_placeholder: header.search_placeholder,
      cart_button: { style: str(cartBtn.style, "button"), text: cartBtn.text },
      announcement: {
        enabled: bool(ann.enabled, false),
        text: ann.text,
        bg: safeColor(ann.bg),
        text_color: safeColor(ann.text_color),
        link: safeLink(ann.link),
      },
    },
    sections: normSections(raw.sections),
    hero: {
      style: oneOf<HeroStyle>(hero.style, ["card", "cover", "split", "hidden"], "card"),
      title: hero.title,
      subtitle: hero.subtitle,
      image: idOrNull(hero.image),
      overlay: num(hero.overlay, 0.3, 0, 0.8),
      align: oneOf(hero.align, ["left", "center"] as const, "left"),
      button: {
        enabled: bool(heroBtn.enabled, false),
        text: heroBtn.text,
        link: safeLink(heroBtn.link),
      },
    },
    categories: {
      style: oneOf<CategoriesStyle>(cats.style, ["chips", "tiles", "list", "hidden"], "chips"),
      title: cats.title,
      show_all: bool(cats.show_all, true),
      show_count: bool(cats.show_count, true),
      order: idList(cats.order),
      hidden: idList(cats.hidden),
    },
    products: {
      title: products.title,
      columns: {
        desktop: Math.round(num(cols.desktop, 4, 2, 6)),
        tablet: Math.round(num(cols.tablet, 3, 2, 4)),
        mobile: Math.round(num(cols.mobile, 2, 1, 3)),
      },
      page_size: Math.round(num(products.page_size, 60, 6, 200)),
      pagination: oneOf<PaginationMode>(products.pagination, ["pages", "load_more", "infinite"], "pages"),
      default_sort: oneOf(products.default_sort, SORT_KEYS, "default"),
      sort_options: sortOptions,
      show_count: bool(products.show_count, true),
      hide_out_of_stock: bool(products.hide_out_of_stock, false),
      hide_zero_price: bool(products.hide_zero_price, false),
    },
    card: {
      template: oneOf<CardTemplate>(card.template, ["compact", "standard", "large", "list"], "standard"),
      photo_ratio: oneOf(card.photo_ratio, PHOTO_RATIOS, "4:3"),
      photo_fit: oneOf(card.photo_fit, ["contain", "cover"] as const, "contain"),
      price_position: oneOf(card.price_position, ["photo_corner", "under_name"] as const, "photo_corner"),
      placeholder_image: idOrNull(card.placeholder_image),
      placeholder_text: card.placeholder_text,
      show: {
        old_price: bool(show.old_price, true),
        discount_badge: bool(show.discount_badge, true),
        new_badge: bool(show.new_badge, true),
        category: bool(show.category, true),
        stock: oneOf<StockMode>(show.stock, ["hidden", "low_only", "always"], "hidden"),
        unit: bool(show.unit, false),
        description: bool(show.description, false),
        add_button: bool(show.add_button, true),
        quantity_stepper: bool(show.quantity_stepper, false),
      },
      new_badge_days: numOrNull(card.new_badge_days),
      new_badge_text: card.new_badge_text,
      add_button_text: card.add_button_text,
      shadow: bool(card.shadow, true),
      border: bool(card.border, true),
    },
    product_page: {
      show_description: bool(productPage.show_description, true),
      show_characteristics: bool(productPage.show_characteristics, true),
    },
    cart: {
      style: oneOf(cart.style, ["drawer", "page"] as const, "drawer"),
      fields: {
        phone: normFieldMode(fields.phone, "required"),
        name: normFieldMode(fields.name, "hidden"),
        address: normFieldMode(fields.address, "hidden"),
        comment: normFieldMode(fields.comment, "hidden"),
      },
      phone_country: str(cart.phone_country, "+996"),
      min_order_total: numOrNull(cart.min_order_total),
      delivery: {
        pickup: bool(delivery.pickup, true),
        delivery: bool(delivery.delivery, false),
        delivery_fee: numOrNull(delivery.delivery_fee),
        free_from: numOrNull(delivery.free_from),
        zones_text: delivery.zones_text,
      },
      payment_text: cart.payment_text,
      order_channel: str(cart.order_channel, "whatsapp"),
      whatsapp_phone: str(cart.whatsapp_phone).replace(/[^\d]/g, ""),
      checkout_button_text: cart.checkout_button_text,
      success_text: cart.success_text,
    },
    footer: {
      enabled: bool(footer.enabled, false),
      address: footer.address,
      phones: normPhones(footer.phones),
      hours: footer.hours,
      socials: normSocials(footer.socials),
      map_url: safeLink(footer.map_url),
      copyright: footer.copyright,
    },
    seo: {
      title: seo.title,
      description: seo.description,
      og_image: idOrNull(seo.og_image),
      favicon: idOrNull(seo.favicon),
      indexing: bool(seo.indexing, true),
    },
    banners: Array.isArray(raw.banners) ? raw.banners : [],
    promo_blocks: Array.isArray(raw.promo_blocks) ? raw.promo_blocks : [],
    lang: str(languages.default, "ru") || "ru",
    media: isObj(raw.media) ? (raw.media as MediaMap) : {},
    preview: raw.preview === true,
    version: numOrNull(raw.version),
  };
};

/* ---------- цвета и CSS-переменные ---------- */

const hexToRgb = (c: string): [number, number, number] | null => {
  if (!HEX_RE.test(c)) return null;
  let h = c.slice(1);
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((x) => x + x).join("");
  h = h.slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** Относительная яркость 0..1; для не-hex цветов — null. */
export const luminance = (c: string): number | null => {
  const rgb = hexToRgb(c);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const isLightPalette = (colors: ThemeColors) => (luminance(colors.background) ?? 1) > 0.4;

/** Тёмный вариант палитры: акцент и значки остаются, фон и текст — тёмные. */
export const toDarkPalette = (colors: ThemeColors): ThemeColors => {
  if (!isLightPalette(colors)) return colors;
  const priceIsText = colors.price.toLowerCase() === colors.text.toLowerCase();
  return {
    ...colors,
    ...DARK_SURFACES,
    price: priceIsText ? (DARK_SURFACES.text as string) : colors.price,
  } as ThemeColors;
};

const SHADOWS: Record<ShadowLevel, [string, string]> = {
  none: ["none", "none"],
  soft: ["0 4px 16px rgba(0, 0, 0, 0.06)", "0 8px 24px rgba(0, 0, 0, 0.1)"],
  strong: ["0 10px 30px rgba(0, 0, 0, 0.14)", "0 16px 40px rgba(0, 0, 0, 0.2)"],
};

const RATIO_CSS: Record<string, string> = {
  "1:1": "1 / 1",
  "4:3": "4 / 3",
  "3:4": "3 / 4",
  "16:9": "16 / 9",
};

const paletteVars = (c: ThemeColors, dark: boolean) => [
  `--sf-bg:${c.background}`,
  `--sf-surface:${c.surface}`,
  `--sf-text:${c.text}`,
  `--sf-muted:${c.text_muted}`,
  `--sf-accent:${c.accent}`,
  `--sf-accent-text:${c.accent_text}`,
  `--sf-border:${c.border}`,
  `--sf-header-bg:${c.header_bg}`,
  `--sf-header-text:${c.header_text}`,
  `--sf-footer-bg:${c.footer_bg}`,
  `--sf-footer-text:${c.footer_text}`,
  `--sf-price:${c.price}`,
  `--sf-old-price:${c.old_price}`,
  `--sf-new-bg:${c.badge_new_bg}`,
  `--sf-new-text:${c.badge_new_text}`,
  `--sf-sale-bg:${c.badge_sale_bg}`,
  `--sf-sale-text:${c.badge_sale_text}`,
  `color-scheme:${dark ? "dark" : "light"}`,
];

/**
 * CSS для корня витрины. Все значения прошли safeColor / белые списки,
 * поэтому строку можно вставлять в <style>.
 */
export const buildThemeCss = (design: ShowcaseDesign, scope: string): string => {
  const { theme, products, card } = design;
  const light = theme.colors;
  const dark = toDarkPalette(light);
  const [shadow, shadowHover] = SHADOWS[theme.shadow];
  const fontSpec = FONT_FAMILIES[theme.font.family];

  const base = [
    `--sf-font:"${theme.font.family}", ${fontSpec?.fallback || "sans-serif"}`,
    `--sf-fs:${theme.font.base_size}px`,
    `--sf-hw:${theme.font.heading_weight}`,
    `--sf-radius:${theme.radius}px`,
    `--sf-radius-sm:${Math.round(theme.radius * 0.7)}px`,
    `--sf-shadow:${shadow}`,
    `--sf-shadow-hover:${shadowHover}`,
    `--sf-cols-d:${products.columns.desktop}`,
    `--sf-cols-t:${products.columns.tablet}`,
    `--sf-cols-m:${products.columns.mobile}`,
    `--sf-photo-ratio:${RATIO_CSS[card.photo_ratio] || "4 / 3"}`,
    `--sf-photo-fit:${card.photo_fit}`,
    `--sf-logo-h:${design.header.logo_height}px`,
  ];

  const bgUrl = mediaUrl(design.media, theme.background_image, 1920);
  if (bgUrl) base.push(`--sf-bg-image:url("${encodeURI(bgUrl).replace(/"/g, "%22")}")`);

  const block = (vars: string[]) => `${scope}{${vars.join(";")}}`;

  if (theme.mode === "dark") return block([...base, ...paletteVars(dark, true)]);
  if (theme.mode === "auto" && dark !== light) {
    return (
      block([...base, ...paletteVars(light, false)]) +
      `@media (prefers-color-scheme: dark){${block(paletteVars(dark, true))}}`
    );
  }
  return block([...base, ...paletteVars(light, !isLightPalette(light))]);
};

/** Текущая палитра для мест, где CSS-переменные не работают (SVG-заглушка). */
export const activePalette = (design: ShowcaseDesign, prefersDark: boolean): ThemeColors => {
  const { mode, colors } = design.theme;
  if (mode === "dark" || (mode === "auto" && prefersDark)) return toDarkPalette(colors);
  return colors;
};

/* ---------- заглушка вместо фото ---------- */

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch] as string);

export const makePlaceholderImg = (text: string, bg: string, fg: string, border: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
  <rect width="100%" height="100%" fill="${bg}"/>
  <rect x="60" y="60" width="1080" height="780" rx="28" fill="none" stroke="${border}" stroke-width="4"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="64" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/* ---------- товары ---------- */

/** «Новинка»: по created_at и `new_badge_days`, иначе — флаг сервера is_new. */
export const isNewProduct = (item: any, days: number | null, now = Date.now()): boolean => {
  if (days !== null && days > 0 && item?.created_at) {
    const created = Date.parse(item.created_at);
    if (Number.isFinite(created)) return now - created <= days * 86_400_000;
  }
  return !!item?.is_new;
};

/** Ключ сортировки из документа ("default") → значение в адресе ("" — по умолчанию). */
export const sortKeyToQuery = (key: string) => (key === "default" ? "" : key);

/** Ссылка на соцсеть: полный адрес оставляем, ник превращаем в адрес. */
export const socialUrl = (network: string, value: string): string | null => {
  const direct = safeLink(value);
  if (direct && /^https?:/i.test(direct)) return direct;
  const handle = value.trim().replace(/^@/, "");
  if (!handle) return null;
  const enc = encodeURIComponent(handle);
  switch (network) {
    case "instagram":
      return `https://instagram.com/${enc}`;
    case "telegram":
      return `https://t.me/${enc}`;
    case "tiktok":
      return `https://www.tiktok.com/@${enc}`;
    case "whatsapp": {
      const digits = handle.replace(/[^\d]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    default:
      return null;
  }
};
