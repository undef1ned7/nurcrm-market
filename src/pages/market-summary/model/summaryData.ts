/** Разбор ответов `GET /main/analytics/market/?tab=sales` и списка продаж для «Сводки». */
import { fromDateInputValue } from "@shared/lib/period";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Число или null, если поля нет / не число. */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Массив только из объектов: `null` и мусор внутри ответа больше не роняют разбор. */
const objects = (v: unknown): Record<string, any>[] =>
  Array.isArray(v) ? v.filter(isObj) : [];

/**
 * Дата из ответа: «YYYY-MM-DD» — как местный день (а не UTC), остальное — как есть.
 * null — не дата.
 */
export function parseDay(raw: unknown): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const local = /^\d{4}-\d{2}-\d{2}$/.test(s) ? fromDateInputValue(s) : null;
  const d = local ?? new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export type PaymentKind = "cash" | "card" | "debt" | "mixed" | "other";

export type SummaryTotals = {
  revenue: number;
  checks: number;
  avgCheck: number;
  /** null — сервер не отдал валовую прибыль. */
  grossProfit: number | null;
  returnsTotal: number;
  returnsCount: number;
};

export type SummaryDay = { date: string; revenue: number };
export type SummaryPayment = { kind: PaymentKind; label: string; value: number };
export type SummaryTopProduct = { name: string; qty: number; revenue: number };

export type SummarySales = {
  totals: SummaryTotals;
  days: SummaryDay[];
  payments: SummaryPayment[];
  /**
   * Сервер разложил смешанные оплаты в наличные/безнал и ещё прислал строку `mixed`:
   * тогда «Смешанная» показывается как «в том числе», а не отдельной суммой.
   */
  mixedIncluded: boolean;
  topProducts: SummaryTopProduct[];
};

const has = (key: string, parts: string[]) => parts.some((p) => key.includes(p));

export function paymentKind(raw: unknown): PaymentKind {
  const key = String(raw ?? "").toLowerCase().trim();
  if (has(key, ["debt", "долг"])) return "debt";
  if (has(key, ["mix", "split", "смеш", "комбин"])) return "mixed";
  // «безнал»/«cashless» проверяем раньше «нал»/«cash»
  if (has(key, ["безнал", "cashless", "noncash", "non_cash", "non-cash"])) return "card";
  if (has(key, ["cash", "налич"]) || key === "нал") return "cash";
  if (
    has(key, [
      "transfer", "card", "bank", "mbank", "qr", "pos", "terminal", "elsom", "odengi", "o!", "optima",
      "megapay", "balance", "wallet",
      "карт", "перевод", "банк", "мбанк", "элсом", "о!", "деньги", "оптима", "терминал", "кошел",
    ])
  ) {
    return "card";
  }
  return "other";
}

export function parseSummarySales(data: any): SummarySales {
  const src = isObj(data) ? data : {};
  const cards = isObj(src.cards) ? src.cards : {};
  const charts = isObj(src.charts) ? src.charts : {};
  const tables = isObj(src.tables) ? src.tables : {};

  const grossRaw = cards.gross_profit_total ?? cards.gross_profit;
  const totals: SummaryTotals = {
    revenue: num(cards.revenue),
    checks: num(cards.transactions),
    avgCheck: num(cards.avg_check),
    grossProfit: numOrNull(grossRaw),
    returnsTotal: num(cards.returns_total),
    returnsCount: num(cards.returns_count),
  };

  // День без понятной даты не рисуем: иначе на графике «NaN.NaN».
  const days: SummaryDay[] = objects(charts.sales_dynamics)
    .filter((d) => parseDay(d.date) !== null)
    .map((d) => ({ date: String(d.date), revenue: num(d.revenue ?? d.value) }));

  // Новый контракт: { name, value, percent }; старый: { method, total|count }.
  // Только количество (`count`) без суммы — не деньги, такую строку не показываем.
  const payments: SummaryPayment[] = objects(charts.payment_methods).flatMap((p) => {
    const value = numOrNull(p.value ?? p.total ?? p.sum);
    if (value === null) return [];
    return [{ kind: paymentKind(p.method ?? p.name), label: String(p.name ?? p.method ?? "—"), value }];
  });

  const sumOf = (list: SummaryPayment[]) => list.reduce((s, p) => s + p.value, 0);
  const mixed = sumOf(payments.filter((p) => p.kind === "mixed"));
  const all = sumOf(payments);
  const tol = Math.max(1, totals.revenue * 0.005);
  // Разложенные суммы уже покрывают выручку, а с «mixed» выходит больше — значит, это дубль.
  const mixedIncluded =
    mixed > 0 && totals.revenue > 0 && all > totals.revenue + tol && Math.abs(all - mixed - totals.revenue) <= tol;

  const topProducts: SummaryTopProduct[] = objects(tables.top_products).map((p) => ({
    name: String(p.name ?? "—"),
    qty: num(p.qty ?? p.sold),
    revenue: num(p.sum ?? p.revenue),
  }));

  return { totals, days, payments, mixedIncluded, topProducts };
}

/** Изменение к прошлому периоду, %. null — сравнивать не с чем. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/* ---------- график: длинные периоды — по неделям и месяцам ---------- */

export type ChartBucket = "day" | "week" | "month";
export type ChartPoint = { key: string; start: Date; revenue: number };

/** До ~3 месяцев — по дням, до 2 лет — по неделям, дальше — по месяцам. */
export const bucketFor = (from: Date, to: Date): ChartBucket => {
  const days = (to.getTime() - from.getTime()) / 86400000;
  if (days <= 93) return "day";
  if (days <= 731) return "week";
  return "month";
};

const mondayOf = (d: Date) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
};

export function groupDays(days: SummaryDay[], bucket: ChartBucket): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  days.forEach((d) => {
    const day = parseDay(d.date);
    if (!day) return;
    const start =
      bucket === "day" ? day : bucket === "week" ? mondayOf(day) : new Date(day.getFullYear(), day.getMonth(), 1);
    const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
    const cur = map.get(key);
    if (cur) cur.revenue += d.revenue;
    else map.set(key, { key, start, revenue: d.revenue });
  });
  return [...map.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* ---------- последние продажи ---------- */

export type RecentSaleKind = "paid" | "debt" | "return" | "new";

export type RecentSale = {
  id: string;
  at: string | null;
  who: string;
  title: string;
  kind: RecentSaleKind;
  total: number;
};

/** Сколько строк показываем в «Последних продажах». */
export const RECENT_LIMIT = 8;

export function parseRecentSales(data: any): RecentSale[] {
  const list = objects(Array.isArray(data?.results) ? data.results : data);
  const seen = new Set<string>();
  return list
    .map((r, i) => {
      const status = String(r.status ?? "").toLowerCase();
      const pm = String(r.payment_method ?? "").toLowerCase();
      let kind: RecentSaleKind = "paid";
      if (["canceled", "cancelled", "refunded", "returned"].includes(status)) kind = "return";
      else if (pm === "debt" || status === "debt" || status === "unpaid" || status === "credit") kind = "debt";
      else if (status === "new") kind = "new";
      const firstItem = Array.isArray(r.items) && isObj(r.items[0]) ? r.items[0] : null;
      const rawAt = r.paid_at || r.created_at || null;
      let id = r.id === undefined || r.id === null ? `row-${i}` : String(r.id);
      if (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return {
        id,
        at: rawAt && parseDay(rawAt) ? String(rawAt) : null,
        who: String(r.user_display ?? r.cashier_name ?? "—"),
        title: String(firstItem?.name ?? firstItem?.product_name ?? r.matched_item_name ?? ""),
        kind,
        total: num(r.total),
      };
    })
    // Открытая корзина кассира («Новый») — ещё не продажа
    .filter((r) => r.kind !== "new")
    .slice(0, RECENT_LIMIT);
}

export const LOW_STOCK_THRESHOLD = 5;
export const LOW_STOCK_LIMIT = 6;

/** 6 товаров с самым малым остатком (5 и меньше); услуги не входят. */
export function pickLowStock<T extends { qty: number; isService: boolean }>(items: T[]): T[] {
  return items
    .filter((p) => !p.isService && Number.isFinite(p.qty) && p.qty <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, LOW_STOCK_LIMIT);
}
