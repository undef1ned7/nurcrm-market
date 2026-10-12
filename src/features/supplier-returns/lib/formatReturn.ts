import { COMPENSATION_LABELS, REASON_LABELS } from "../model/constants";
import type { CompensationType, ReturnReason } from "../model/types";
import { toFiniteNumber } from "./returnMath";

export function formatMoney(value: unknown): string {
  return toFiniteNumber(value, 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatQty(value: unknown): string {
  const num = toFiniteNumber(value, 0);
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 3,
  });
}

export function formatDateTime(value: unknown): string {
  if (!value) return "—";
  try {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("ru-RU");
  } catch {
    return String(value);
  }
}

export function reasonLabel(reason: unknown): string {
  const key = String(reason || "") as ReturnReason;
  return REASON_LABELS[key] || String(reason || "—");
}

export function compensationLabel(value: unknown): string {
  const key = String(value || "") as CompensationType;
  return COMPENSATION_LABELS[key] || String(value || "—");
}

export function productLabel(product: {
  name?: unknown;
  title?: unknown;
  product_name?: unknown;
  productName?: unknown;
  code?: unknown;
} | null | undefined): string {
  return (
    String(
      product?.productName ||
        product?.product_name ||
        product?.name ||
        product?.title ||
        product?.code ||
        "Товар",
    ).trim() || "Товар"
  );
}

export function supplierLabel(supplier: {
  full_name?: unknown;
  name?: unknown;
  company_name?: unknown;
  phone?: unknown;
} | null | undefined): string {
  if (!supplier || typeof supplier !== "object") return "Без названия";
  return (
    String(
      supplier.full_name ||
        supplier.name ||
        supplier.company_name ||
        supplier.phone ||
        "Без названия",
    ).trim() || "Без названия"
  );
}

export function profileDisplayName(profile: {
  full_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  username?: unknown;
  email?: unknown;
} | null | undefined): string {
  if (!profile || typeof profile !== "object") return "—";
  const firstLast = [profile.first_name, profile.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  return (
    String(profile.full_name || firstLast || profile.username || profile.email || "—").trim() ||
    "—"
  );
}
