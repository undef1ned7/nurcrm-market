/**
 * Срок обмена/возврата (магазин одежды): закон КР «О защите прав потребителей» —
 * 14 дней, не считая дня покупки. Владелец меняет срок и категории «без обмена»
 * в кассе NurMarket — `app-settings/nurmarket-kassa/`: ExchangeDaysLimit
 * (0 — не проверять), NonExchangeableCategories (через «;», null — не настроено).
 *
 * Срок — предупреждение, а не запрет: брак принимают и позже.
 */

export const DEFAULT_EXCHANGE_DAYS_LIMIT = 14;
export const BUSINESS_TIME_ZONE = "Asia/Bishkek";

export type ExchangeTermSettings = {
  /** 0 — срок не проверяется. */
  daysLimit: number;
  /** Названия категорий в нижнем регистре. */
  nonExchangeableCategories: string[];
};

export const DEFAULT_EXCHANGE_TERM_SETTINGS: ExchangeTermSettings = {
  daysLimit: DEFAULT_EXCHANGE_DAYS_LIMIT,
  nonExchangeableCategories: [],
};

const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const pickKey = (obj: any, key: string): unknown => {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in obj) return obj[key];
  const lower = key.toLowerCase();
  const snake = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  for (const k of Object.keys(obj)) {
    const kl = k.toLowerCase();
    if (kl === lower || kl === snake) return obj[k];
  }
  return undefined;
};

/**
 * Ответ настроек кассы бывает плоским `{ExchangeDaysLimit, …}` или обёрнутым
 * (`{value: {...}}`, `{settings: "<json>"}`) — берём первое, где есть ключи.
 */
export const normalizeExchangeTermSettings = (data: unknown): ExchangeTermSettings => {
  const root: any = tryParseJson(data);
  const candidates = [root, root?.value, root?.settings, root?.data, root?.payload]
    .map(tryParseJson)
    .filter((x) => x && typeof x === "object");
  const source =
    candidates.find(
      (c) =>
        pickKey(c, "ExchangeDaysLimit") !== undefined ||
        pickKey(c, "NonExchangeableCategories") !== undefined,
    ) ?? {};

  const rawLimit = pickKey(source, "ExchangeDaysLimit");
  const n = Number(rawLimit);
  const daysLimit =
    rawLimit === undefined || rawLimit === null || rawLimit === "" || !Number.isFinite(n) || n < 0
      ? DEFAULT_EXCHANGE_DAYS_LIMIT
      : Math.floor(n);

  const rawCats = pickKey(source, "NonExchangeableCategories");
  const nonExchangeableCategories =
    typeof rawCats === "string"
      ? rawCats
          .split(";")
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean)
      : Array.isArray(rawCats)
        ? rawCats.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
        : [];

  return { daysLimit, nonExchangeableCategories };
};

/** Календарная дата (YYYY-MM-DD) момента в часовом поясе бизнеса. */
export const businessDateKey = (value: unknown, timeZone = BUSINESS_TIME_ZONE): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const dayNumber = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

export type ExchangeTermStatus = {
  /** Дата чека «05.10.2026». */
  saleDate: string;
  /** Сколько дней прошло, не считая дня покупки. */
  daysPassed: number;
  daysLimit: number;
  /** Срок вышел (больше лимита). При daysLimit=0 — всегда false. */
  expired: boolean;
};

/** null — дату чека не распознали (тогда ничего не показываем). */
export const getExchangeTermStatus = (
  saleDateRaw: unknown,
  daysLimit: number,
  now: Date = new Date(),
): ExchangeTermStatus | null => {
  const saleKey = businessDateKey(saleDateRaw);
  const todayKey = businessDateKey(now);
  if (!saleKey || !todayKey) return null;
  const daysPassed = Math.max(0, dayNumber(todayKey) - dayNumber(saleKey));
  const [y, m, d] = saleKey.split("-");
  return {
    saleDate: `${d}.${m}.${y}`,
    daysPassed,
    daysLimit,
    expired: daysLimit > 0 && daysPassed > daysLimit,
  };
};

/** Категория строки продажи (если сервер её прислал). */
export const saleItemCategoryName = (item: any): string =>
  String(
    item?.category_name ??
      item?.product_category_name ??
      item?.category?.name ??
      (typeof item?.category === "string" ? item.category : "") ??
      "",
  ).trim();

/** Строки чека из категорий «без обмена». */
export const findNonExchangeableItems = <T>(
  items: T[],
  categories: string[],
  getCategory: (item: T) => string = saleItemCategoryName as any,
): T[] => {
  if (!categories.length) return [];
  const set = new Set(categories.map((c) => c.toLowerCase()));
  return items.filter((it) => {
    const c = getCategory(it).toLowerCase();
    return Boolean(c) && set.has(c);
  });
};

/** Дата чека из продажи. */
export const saleDateOf = (sale: any): unknown =>
  sale?.paid_at ?? sale?.created_at ?? sale?.date ?? null;
