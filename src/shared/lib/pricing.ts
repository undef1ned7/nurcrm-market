/**
 * Расчёты цены, себестоимости и прибыли для раздела «Калькуляция».
 * Только вычисления — на сервер ничего не записывается.
 *
 * Наценка считается от закупки: (цена − закупка) / закупка.
 * Маржа считается от цены: (цена − закупка) / цена.
 * Налог — доля выручки (ставка, %), берётся с цены продажи.
 */

const pct = (v: number) => v / 100;

export const PRICE_ROUND_STEPS = [0, 1, 5, 10] as const;
export const TAX_PRESETS = [0, 0.5, 1, 2, 4] as const;
export const DEFAULT_LOW_MARGIN_THRESHOLD = 15;

export type PriceAnalysis = {
  price: number;
  cost: number;
  tax: number;
  /** Прибыль с единицы после налога. */
  profit: number;
  /** Наценка, %. null — если закупка не указана. */
  markup: number | null;
  /** Маржа, %. null — если цена не больше нуля. */
  margin: number | null;
  /** Цена не покрывает закупку и налог. */
  isLoss: boolean;
};

/** Округление цены вверх до шага (0 — без округления). */
export function roundPriceUp(price: number, step: number): number {
  if (!Number.isFinite(price)) return price;
  if (!step || step <= 0) return price;
  return Math.ceil(price / step - 1e-9) * step;
}

/** Цена от наценки: закупка + наценка. null при некорректных данных. */
export function priceFromMarkup(cost: number, markupPercent: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(markupPercent) || cost < 0) {
    return null;
  }
  return cost * (1 + pct(markupPercent));
}

/**
 * Цена от маржи с налогом t: Цена = Закупка / (1 − Маржа − t).
 * null, если маржа и налог вместе дают 100% и больше.
 */
export function priceFromMargin(
  cost: number,
  marginPercent: number,
  taxPercent = 0,
): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(marginPercent) || cost < 0) {
    return null;
  }
  const denominator = 1 - pct(marginPercent) - pct(taxPercent);
  if (denominator <= 1e-9) return null;
  return cost / denominator;
}

export function analyzePrice(
  cost: number,
  price: number,
  taxPercent = 0,
): PriceAnalysis {
  const tax = price * pct(taxPercent);
  const profit = price - cost - tax;
  return {
    price,
    cost,
    tax,
    profit,
    markup: cost > 0 ? ((price - cost) / cost) * 100 : null,
    margin: price > 0 ? ((price - cost) / price) * 100 : null,
    isLoss: profit < 0,
  };
}

// ── Себестоимость партии ────────────────────────────────────────────────

export type BatchDistribution = "amount" | "qty" | "weight";

export type BatchLineInput = {
  name?: string;
  qty: number;
  /** Цена закупки за единицу в валюте закупки. */
  price: number;
  /** Вес строки, кг (нужен для распределения по весу). */
  weight?: number;
};

export type BatchLineResult = {
  /** Закупка строки в сомах (с учётом курса). */
  lineSum: number;
  /** Доля доп. расходов, сом. */
  expenseShare: number;
  /** Себестоимость единицы, сом. */
  unitCost: number;
  /** Предлагаемая цена продажи при заданной наценке. */
  suggestedPrice: number | null;
};

export type BatchResult = {
  lines: BatchLineResult[];
  total: number;
  /** false — выбрано распределение по весу, но вес указан не у всех строк. */
  weightMissing: boolean;
};

export function calcBatchCost(
  lines: BatchLineInput[],
  extraExpenses: number,
  rate: number,
  mode: BatchDistribution,
  markupPercent?: number,
): BatchResult {
  const fx = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const extra = Number.isFinite(extraExpenses) && extraExpenses > 0 ? extraExpenses : 0;

  const lineSums = lines.map((l) => Math.max(l.qty || 0, 0) * Math.max(l.price || 0, 0) * fx);
  const weightMissing =
    mode === "weight" && lines.some((l) => !(Number(l.weight) > 0));

  const basis = lines.map((l, i) => {
    if (mode === "qty") return Math.max(l.qty || 0, 0);
    if (mode === "weight") return Math.max(Number(l.weight) || 0, 0);
    return lineSums[i];
  });
  const basisTotal = basis.reduce((a, b) => a + b, 0);

  const results = lines.map((l, i) => {
    const share =
      !weightMissing && basisTotal > 0 ? (extra * basis[i]) / basisTotal : 0;
    const qty = Math.max(l.qty || 0, 0);
    const unitCost = qty > 0 ? (lineSums[i] + share) / qty : 0;
    const suggestedPrice =
      markupPercent != null && Number.isFinite(markupPercent) && unitCost > 0
        ? unitCost * (1 + pct(markupPercent))
        : null;
    return { lineSum: lineSums[i], expenseShare: share, unitCost, suggestedPrice };
  });

  return {
    lines: results,
    total: lineSums.reduce((a, b) => a + b, 0) + (weightMissing ? 0 : extra),
    weightMissing,
  };
}

// ── Безубыточность и цель ───────────────────────────────────────────────

export type BreakevenResult = {
  /** Выручка без убытка в месяц. */
  monthly: number;
  perDay: number;
  /** Чеков в день при среднем чеке (null, если средний чек не задан). */
  checksPerDay: number | null;
};

/**
 * Безубыточная выручка = постоянные расходы / (маржа − налог).
 * null, если маржа не больше налога — прибыль невозможна при любой выручке.
 */
export function calcRevenueForProfit(
  fixedExpenses: number,
  marginPercent: number,
  taxPercent: number,
  workDays: number,
  avgCheck: number,
  desiredProfit = 0,
): BreakevenResult | null {
  const spread = pct(marginPercent) - pct(taxPercent);
  if (!(spread > 1e-9)) return null;
  const monthly = (Math.max(fixedExpenses, 0) + Math.max(desiredProfit, 0)) / spread;
  const days = workDays > 0 ? workDays : 0;
  const perDay = days > 0 ? monthly / days : 0;
  return {
    monthly,
    perDay,
    checksPerDay: avgCheck > 0 && days > 0 ? perDay / avgCheck : null,
  };
}

// ── Скидка и акция ──────────────────────────────────────────────────────

export type DiscountResult = {
  /** Маржа на новой (сниженной) цене, %. */
  marginAfter: number;
  /** Во сколько раз нужно продать больше, чтобы заработать столько же. null — не окупается. */
  multiplier: number | null;
  /** Скидка съедает всю наценку — каждая продажа в убыток (или в ноль). */
  isLoss: boolean;
};

/**
 * При марже m и скидке d (обе — доли исходной цены) прибыль с единицы падает
 * с m до m − d, значит продавать нужно в m / (m − d) раз больше.
 */
export function calcDiscountEffect(
  marginPercent: number,
  discountPercent: number,
): DiscountResult {
  const m = pct(marginPercent);
  const d = pct(discountPercent);
  const left = m - d;
  const marginAfter = d < 1 ? (left / (1 - d)) * 100 : -Infinity;
  if (left <= 0) {
    return { marginAfter, multiplier: null, isLoss: true };
  }
  return { marginAfter, multiplier: m / left, isLoss: false };
}

// ── Проверка цен по всему складу ────────────────────────────────────────

export type CatalogItem = {
  id: string | number;
  name: string;
  barcode?: string;
  cost: number;
  price: number;
  qty: number;
};

export type PriceFlag =
  | "loss"
  | "noMarkup"
  | "lowMargin"
  | "noCost"
  | "negativeStock";

export type PriceCheckRow = CatalogItem & {
  markup: number | null;
  margin: number | null;
  /** Прибыль остатка: (цена − закупка) × остаток, только по товарам с закупкой. */
  stockProfit: number | null;
  flags: PriceFlag[];
};

export type PriceCheckSummary = {
  stockAtCost: number;
  stockAtPrice: number;
  futureProfit: number;
  averageMargin: number | null;
};

export function checkCatalogPrices(
  items: CatalogItem[],
  lowMarginThreshold = DEFAULT_LOW_MARGIN_THRESHOLD,
): { rows: PriceCheckRow[]; summary: PriceCheckSummary } {
  let stockAtCost = 0;
  let stockAtPrice = 0;
  let futureProfit = 0;
  let priceOfCosted = 0;

  const rows = items.map((item): PriceCheckRow => {
    const hasCost = item.cost > 0;
    const stockQty = Math.max(item.qty, 0);
    const markup = hasCost ? ((item.price - item.cost) / item.cost) * 100 : null;
    const margin =
      hasCost && item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : null;

    const flags: PriceFlag[] = [];
    if (hasCost) {
      if (item.price < item.cost) flags.push("loss");
      else if (item.price === item.cost) flags.push("noMarkup");
      else if (margin != null && margin < lowMarginThreshold) flags.push("lowMargin");
    } else {
      flags.push("noCost");
    }
    if (item.qty < 0) flags.push("negativeStock");

    stockAtCost += stockQty * Math.max(item.cost, 0);
    stockAtPrice += stockQty * Math.max(item.price, 0);
    if (hasCost) {
      futureProfit += (item.price - item.cost) * stockQty;
      priceOfCosted += item.price * stockQty;
    }

    return {
      ...item,
      markup,
      margin,
      stockProfit: hasCost ? (item.price - item.cost) * stockQty : null,
      flags,
    };
  });

  return {
    rows,
    summary: {
      stockAtCost,
      stockAtPrice,
      futureProfit,
      averageMargin: priceOfCosted > 0 ? (futureProfit / priceOfCosted) * 100 : null,
    },
  };
}

export type PriceCheckFilter =
  | "all"
  | "loss"
  | "lowMargin"
  | "noCost"
  | "negativeStock";

export function filterPriceRows(
  rows: PriceCheckRow[],
  filter: PriceCheckFilter,
  query = "",
): PriceCheckRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    switch (filter) {
      case "loss":
        return r.flags.includes("loss") || r.flags.includes("noMarkup");
      case "lowMargin":
        return r.flags.includes("lowMargin");
      case "noCost":
        return r.flags.includes("noCost");
      case "negativeStock":
        return r.flags.includes("negativeStock");
      default:
        return true;
    }
  });
}
