/**
 * Размеры и цвета товара (магазин одежды).
 * Сервер: GET/POST main/products/{id}/variants/, PATCH/DELETE …/variants/{vid}/.
 * Поля: size, color, barcode, quantity, price (null — цена товара), is_active.
 */

export type ProductVariant = {
  id: string;
  product?: string;
  size: string;
  color: string;
  barcode: string;
  quantity: number;
  /** null — продаётся по цене товара. */
  price: number | null;
  is_active: boolean;
};

const toNum = (value: unknown): number => {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const toPriceOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const normalizeVariant = (raw: any): ProductVariant | null => {
  if (!raw || typeof raw !== "object" || raw.id == null) return null;
  return {
    id: String(raw.id),
    product: raw.product != null ? String(raw.product) : undefined,
    size: String(raw.size ?? "").trim(),
    color: String(raw.color ?? "").trim(),
    barcode: String(raw.barcode ?? "").trim(),
    quantity: toNum(raw.quantity),
    price: toPriceOrNull(raw.price),
    is_active: raw.is_active !== false,
  };
};

export const normalizeVariantList = (data: unknown): ProductVariant[] => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.results)
      ? (data as any).results
      : [];
  return list
    .map(normalizeVariant)
    .filter((v: ProductVariant | null): v is ProductVariant => Boolean(v));
};

/* ---------- порядок размеров ---------- */

/** Буквенные размеры в «магазинном» порядке. */
export const LETTER_SIZES = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
] as const;

const letterRank = (size: string): number => {
  const s = size.trim().toUpperCase();
  const alias: Record<string, string> = { "2XL": "XXL", "3XL": "XXXL", "2XS": "XXS", "3XS": "XXXS" };
  return (LETTER_SIZES as readonly string[]).indexOf(alias[s] ?? s);
};

const numericValue = (size: string): number | null => {
  const m = size.trim().replace(",", ".").match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

/**
 * Сравнение размеров: буквенные — XS…XXL, числовые — по возрастанию,
 * прочее — по алфавиту в конце. Пустой размер — самым последним.
 */
export const compareSizes = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const la = letterRank(a);
  const lb = letterRank(b);
  if (la !== -1 && lb !== -1) return la - lb;
  if (la !== -1) return -1;
  if (lb !== -1) return 1;
  const na = numericValue(a);
  const nb = numericValue(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.localeCompare(b, "ru", { numeric: true });
};

export const sortVariants = (list: ProductVariant[]): ProductVariant[] =>
  [...list].sort(
    (x, y) => compareSizes(x.size, y.size) || x.color.localeCompare(y.color, "ru"),
  );

/** Уникальные размеры по порядку и суммарный остаток по каждому (только «продаётся»). */
export const groupVariantsBySize = (
  list: ProductVariant[],
): { size: string; quantity: number; variants: ProductVariant[] }[] => {
  const map = new Map<string, ProductVariant[]>();
  for (const v of sortVariants(list.filter((x) => x.is_active))) {
    const key = v.size;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()].map(([size, variants]) => ({
    size,
    variants,
    quantity: variants.reduce((sum, v) => sum + Math.max(0, v.quantity), 0),
  }));
};

/* ---------- цена ---------- */

export const variantEffectivePrice = (
  variant: Pick<ProductVariant, "price">,
  productPrice: unknown,
): number => (variant.price != null ? variant.price : toNum(productPrice));

/** Скидка варианта к цене товара в процентах (0 — нет скидки). */
export const variantDiscountPercent = (
  variant: Pick<ProductVariant, "price">,
  productPrice: unknown,
): number => {
  const base = toNum(productPrice);
  if (variant.price == null || base <= 0 || variant.price >= base) return 0;
  return Math.round(((base - variant.price) / base) * 100);
};

/* ---------- подписи ---------- */

/** «44, Красный» / «44» / «Красный» / "". */
export const variantLabel = (size?: unknown, color?: unknown): string =>
  [size, color]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(", ");

/* ---------- «Быстро заполнить» ---------- */

export const SIZE_PRESETS = {
  letters: ["XS", "S", "M", "L", "XL", "XXL"],
  ru: ["40", "42", "44", "46", "48", "50", "52", "54", "56", "58", "60"],
  shoes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
} as const;

export type SizePresetId = keyof typeof SIZE_PRESETS;

/** Разбор ручного ввода «44, 46; 48» → ["44","46","48"] без повторов. */
export const parseListInput = (raw: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/[,;\n]+/)) {
    const value = part.trim().slice(0, 50);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export type VariantDraft = {
  key: string;
  size: string;
  color: string;
  selected: boolean;
  /** Такое сочетание уже есть у товара — сохранять второй раз нельзя. */
  exists: boolean;
};

const comboKey = (size: string, color: string) =>
  `${size.trim().toLowerCase()}|${color.trim().toLowerCase()}`;

/**
 * Все сочетания размер × цвет. Без цветов — только размеры (и наоборот).
 * Уже существующие у товара сочетания помечены и не выбраны.
 */
export const buildVariantCombos = (
  sizes: string[],
  colors: string[],
  existing: Pick<ProductVariant, "size" | "color">[] = [],
): VariantDraft[] => {
  const existingKeys = new Set(existing.map((v) => comboKey(v.size, v.color)));
  const sizeList = sizes.length ? sizes : [""];
  const colorList = colors.length ? colors : [""];
  const out: VariantDraft[] = [];
  const seen = new Set<string>();
  for (const size of [...sizeList].sort(compareSizes)) {
    for (const color of colorList) {
      if (!size && !color) continue;
      const key = comboKey(size, color);
      if (seen.has(key)) continue;
      seen.add(key);
      const exists = existingKeys.has(key);
      out.push({ key, size, color, selected: !exists, exists });
    }
  }
  return out;
};

/** Сколько этикеток печатать по варианту: остаток, минимум 0, целое. */
export const labelsCountForVariant = (variant: Pick<ProductVariant, "quantity">): number =>
  Math.max(0, Math.floor(toNum(variant.quantity)));
