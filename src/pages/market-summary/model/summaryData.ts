/** Разбор ответов `GET /main/analytics/market/?tab=sales` и списка продаж для «Сводки». */

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

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
  topProducts: SummaryTopProduct[];
};

export function paymentKind(raw: unknown): PaymentKind {
  const key = String(raw ?? "").toLowerCase();
  if (key.includes("debt") || key.includes("долг")) return "debt";
  if (key.includes("mix") || key.includes("split") || key.includes("смеш")) return "mixed";
  if (
    key.includes("cash") ||
    key.includes("нал") && !key.includes("безнал")
  ) {
    return "cash";
  }
  if (
    key.includes("transfer") ||
    key.includes("card") ||
    key.includes("безнал") ||
    key.includes("bank") ||
    key.includes("mbank") ||
    key.includes("qr")
  ) {
    return "card";
  }
  return "other";
}

export function parseSummarySales(data: any): SummarySales {
  const cards = data?.cards ?? {};
  const charts = data?.charts ?? {};
  const tables = data?.tables ?? {};

  const grossRaw = cards.gross_profit_total ?? cards.gross_profit;
  const totals: SummaryTotals = {
    revenue: num(cards.revenue),
    checks: num(cards.transactions),
    avgCheck: num(cards.avg_check),
    grossProfit: grossRaw == null ? null : num(grossRaw),
    returnsTotal: num(cards.returns_total),
    returnsCount: num(cards.returns_count),
  };

  const days: SummaryDay[] = (Array.isArray(charts.sales_dynamics) ? charts.sales_dynamics : []).map(
    (d: any) => ({ date: String(d.date), revenue: num(d.revenue ?? d.value) }),
  );

  // Новый контракт: { name, value, percent }; старый: { method, total|count }
  const payments: SummaryPayment[] = (
    Array.isArray(charts.payment_methods) ? charts.payment_methods : []
  ).map((p: any) => ({
    kind: paymentKind(p.method ?? p.name),
    label: String(p.name ?? p.method ?? "—"),
    value: num(p.value ?? p.total ?? p.count),
  }));

  const topProducts: SummaryTopProduct[] = (
    Array.isArray(tables.top_products) ? tables.top_products : []
  ).map((p: any) => ({
    name: String(p.name ?? "—"),
    qty: num(p.qty ?? p.sold),
    revenue: num(p.sum ?? p.revenue),
  }));

  return { totals, days, payments, topProducts };
}

/** Изменение к прошлому периоду, %. null — сравнивать не с чем. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type RecentSaleKind = "paid" | "debt" | "return" | "new";

export type RecentSale = {
  id: string;
  at: string | null;
  who: string;
  title: string;
  kind: RecentSaleKind;
  total: number;
};

export function parseRecentSales(data: any): RecentSale[] {
  const list: any[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  return list.slice(0, 8).map((r) => {
    const status = String(r.status ?? "").toLowerCase();
    const pm = String(r.payment_method ?? "").toLowerCase();
    let kind: RecentSaleKind = "paid";
    if (["canceled", "cancelled", "refunded", "returned"].includes(status)) kind = "return";
    else if (pm === "debt" || status === "debt" || status === "unpaid" || status === "credit") kind = "debt";
    else if (status === "new") kind = "new";
    const firstItem = Array.isArray(r.items) ? r.items[0] : null;
    return {
      id: String(r.id),
      at: r.paid_at || r.created_at || null,
      who: String(r.user_display ?? r.cashier_name ?? "—"),
      title: String(firstItem?.name ?? firstItem?.product_name ?? r.matched_item_name ?? ""),
      kind,
      total: num(r.total),
    };
  });
}

export const LOW_STOCK_THRESHOLD = 5;
export const LOW_STOCK_LIMIT = 6;

/** 6 товаров с самым малым остатком (5 и меньше); услуги не входят. */
export function pickLowStock<T extends { qty: number; isService: boolean }>(items: T[]): T[] {
  return items
    .filter((p) => !p.isService && p.qty <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, LOW_STOCK_LIMIT);
}
