import type { StockStatus } from "../model/types";

export function formatUnit(unit: unknown): string {
  const value = String(unit ?? "").trim();
  return value || "шт";
}

export function formatQty(value: unknown, allowFraction = false): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: allowFraction ? 3 : 0,
  }).format(num);
}

export function formatMoney(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} сом`;
}

export function formatDaysOfStock(days: number | null): string {
  if (days == null || !Number.isFinite(days)) return "Нет продаж";
  const abs = Math.abs(days);
  const formatted = formatQty(days, true);
  if (abs === 0) return `0 дней`;
  if (!Number.isInteger(abs)) return `${formatted} дня`;
  const n = Math.round(abs) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${formatted} дней`;
  if (n1 === 1) return `${formatted} день`;
  if (n1 >= 2 && n1 <= 4) return `${formatted} дня`;
  return `${formatted} дней`;
}

export function formatLastPurchase(params: {
  date?: string | null;
  quantity?: number | null;
  unit?: string;
  isWeight?: boolean;
} | null | undefined): string {
  if (!params?.date) return "—";
  let dateLabel = params.date;
  try {
    const d = new Date(params.date);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  } catch {
    /* keep raw */
  }
  if (params.quantity == null || !Number.isFinite(Number(params.quantity))) {
    return dateLabel;
  }
  return `${dateLabel} · ${formatQty(params.quantity, Boolean(params.isWeight))} ${formatUnit(params.unit)}`;
}

export function formatTrend(percent: number | null, currentSales: number): string {
  if (percent == null) {
    return currentSales > 0 ? "↑ новые продажи" : "Без изменений";
  }
  const rounded = Math.round(percent);
  if (rounded === 0) return "Без изменений";
  if (rounded > 0) return `↑ ${rounded}%`;
  return `↓ ${Math.abs(rounded)}%`;
}

export function trendTone(
  percent: number | null,
): "success" | "danger" | "default" {
  if (percent == null) return "default";
  if (percent > 0.5) return "success";
  if (percent < -0.5) return "danger";
  return "default";
}

export function compactDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function matchesSearch(
  item: {
    productName?: string;
    barcode?: string;
    article?: string;
    code?: string;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.productName, item.barcode, item.article, item.code]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export function statusSortRank(status: StockStatus): number {
  if (status === "critical") return 0;
  if (status === "ending") return 1;
  if (status === "low") return 2;
  return 3;
}
