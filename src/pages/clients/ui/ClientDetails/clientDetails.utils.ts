import type { DatePreset, DealRecord, DebtProgress } from "./clientDetails.types";

export function getDealDateISO(deal: DealRecord | null | undefined): string | null {
  const raw = deal?.date || deal?.created_at || deal?.updated_at || null;
  if (!raw) return null;

  try {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {
    /* ignore */
  }
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function inRange(
  iso: string | null | undefined,
  fromISO: string,
  toISO: string,
): boolean {
  if (!iso) return false;
  if (fromISO && iso < fromISO) return false;
  if (toISO && iso > toISO) return false;
  return true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function getDebtProgress(deal: DealRecord | null | undefined): DebtProgress {
  const total = Number(deal?.debt_amount ?? deal?.amount ?? 0);
  const remainingRaw = deal?.remaining_debt;
  const remaining =
    remainingRaw === "" || remainingRaw == null ? NaN : Number(remainingRaw);

  let paid = 0;
  if (Number.isFinite(remaining)) {
    paid = total - remaining;
  } else if (deal?.prepayment != null && deal?.prepayment !== "") {
    paid = Number(deal.prepayment) || 0;
  }

  if (!Number.isFinite(total) || total <= 0) {
    return { percent: 0, paid: 0, total: 0, remaining: 0 };
  }

  const safePaid = clamp(Number.isFinite(paid) ? paid : 0, 0, total);
  const safeRemaining = clamp(total - safePaid, 0, total);
  const percent = clamp(Math.round((safePaid / total) * 100), 0, 100);

  const hue = (percent / 100) * 120;
  const fill = `hsl(${hue}deg, 85%, 45%)`;
  const bg = `hsl(${hue}deg, 85%, 94%)`;
  const border = `hsl(${hue}deg, 65%, 75%)`;
  const glow = `0 0 0 3px hsla(${hue}deg, 85%, 55%, 0.22)`;

  return {
    percent,
    paid: safePaid,
    total,
    remaining: safeRemaining,
    fill,
    bg,
    border,
    glow,
  };
}

type TFunc = (key: string) => string;

export function saleStatusLabel(
  s: unknown,
  t: TFunc,
): { label: string; mod: string } {
  const v = String(s || "").toLowerCase();
  if (["canceled", "cancelled", "refunded", "returned"].includes(v)) {
    return { label: t("crm.clients.details.saleStatusCancelled"), mod: "debt" };
  }
  if (v === "paid") {
    return { label: t("crm.clients.details.saleStatusPaid"), mod: "status" };
  }
  return { label: (s as string) || "—", mod: "neutral" };
}

export function fmtSaleDate(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function computeDatePreset(preset: DatePreset): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;

  if (preset === "today") {
    return { dateFrom: today, dateTo: today };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    const y1 = start.getFullYear();
    const m1 = String(start.getMonth() + 1).padStart(2, "0");
    const d1 = String(start.getDate()).padStart(2, "0");
    return { dateFrom: `${y1}-${m1}-${d1}`, dateTo: today };
  }
  if (preset === "month") {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 1);
    const y1 = start.getFullYear();
    const m1 = String(start.getMonth() + 1).padStart(2, "0");
    const d1 = String(start.getDate()).padStart(2, "0");
    return { dateFrom: `${y1}-${m1}-${d1}`, dateTo: today };
  }
  return { dateFrom: "", dateTo: "" };
}
