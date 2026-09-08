/* =======================
   helpers
======================= */
export const listFrom = (res) => res?.data?.results || res?.data || [];

export const toNum = (v) => {
  const n =
    typeof v === "string" ? Number(v.replace(",", ".")) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ru-RU");
};

export const normalizePhoneForWa = (raw) =>
  String(raw || "")
    .trim()
    .replace(/[^\d]/g, "");

export const buildWaLink = (phoneDigits, text) => {
  const p = String(phoneDigits || "").trim();
  if (!p) return "";
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

export const getShowcasePhoneRaw = (company) => {
  if (!company || typeof company !== "object") return "";
  return (
    company.phones_howcase ||
    company.phone_showcase ||
    company.phones_showcase ||
    company.phoneShowcase ||
    ""
  );
};

export const getQuery = (search) => {
  const sp = new URLSearchParams(search);
  return {
    q: sp.get("q") || "",
    category: sp.get("category") || "",
    page: sp.get("page") || "1",
    sort: sp.get("sort") || "",
  };
};

export const PAGE_SIZE = 100;

/* =======================
   Сортировка витрины
======================= */
export const SORT_OPTIONS = [
  { value: "", label: "По умолчанию" },
  { value: "name_asc", label: "Название: А–Я" },
  { value: "name_desc", label: "Название: Я–А" },
  { value: "price_asc", label: "Цена: дешевле сначала" },
  { value: "price_desc", label: "Цена: дороже сначала" },
  { value: "discount_desc", label: "Скидка: больше сначала" },
  { value: "discount_asc", label: "Скидка: меньше сначала" },
];

// Значения для бэкенда (?ordering=...). Фронт также сортирует локально как fallback.
export const SORT_TO_ORDERING = {
  name_asc: "name",
  name_desc: "-name",
  price_asc: "final_price",
  price_desc: "-final_price",
  discount_asc: "discount_percent",
  discount_desc: "-discount_percent",
};

export const sortShowcaseItems = (arr, sort) => {
  if (!sort || !Array.isArray(arr)) return arr;
  const name = (x) => String(x?.name || x?.title || "");
  const price = (x) => toNum(x?.final_price ?? x?.price);
  const disc = (x) => toNum(x?.discount_percent);
  const comparators = {
    name_asc: (a, b) => name(a).localeCompare(name(b), "ru"),
    name_desc: (a, b) => name(b).localeCompare(name(a), "ru"),
    price_asc: (a, b) => price(a) - price(b),
    price_desc: (a, b) => price(b) - price(a),
    discount_asc: (a, b) => disc(a) - disc(b),
    discount_desc: (a, b) => disc(b) - disc(a),
  };
  const cmp = comparators[sort];
  return cmp ? [...arr].sort(cmp) : arr;
};

export const setQuery = (locationSearch, patch) => {
  const sp = new URLSearchParams(locationSearch);
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") sp.delete(k);
    else sp.set(k, String(v));
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
};

const fallbackSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <rect x="60" y="60" width="1080" height="680" rx="28" fill="#ffffff" stroke="#e5e7eb"/>
    <text x="50%" y="50%" font-family="Arial" font-size="54" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
      Фото нет
    </text>
  </svg>
`);
export const FALLBACK_IMG = `data:image/svg+xml;charset=utf-8,${fallbackSvg}`;

/**
 * Список URL картинок товара для слайдера: primary (или image_url) первым,
 * затем остальные из item.images, без дублей. Пусто, если фото нет вовсе.
 */
export const getProductImages = (item: any): string[] => {
  if (!item) return [];
  const list = Array.isArray(item.images) ? item.images : [];
  const urlOf = (img: any) => String(img?.image_url || img?.image || "").trim();

  const primary = list.find((img: any) => img?.is_primary);
  const ordered = [
    primary ? urlOf(primary) : String(item.image_url || "").trim(),
    ...list.map(urlOf),
  ].filter(Boolean);

  return Array.from(new Set(ordered));
};

