/**
 * Срок годности товара: локальные расчёты на основе `product.expiration_date`.
 * Бэкенд контракт: docs/backend/product-expiry-tracking-backend.md
 */

export type ProductExpiryStatus = "expired" | "critical" | "warning" | null;

const DEFAULT_CRITICAL_DAYS = 3;
const DEFAULT_WARNING_DAYS = 14;

export function getExpiryDate(item: any): Date | null {
  const raw = item?.expiration_date ?? item?.expiry_date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Сколько дней осталось до истечения срока (отрицательное — просрочено). */
export function daysUntilExpiry(item: any): number | null {
  const date = getExpiryDate(item);
  if (!date) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(
  item: any,
  opts?: { criticalDays?: number; warningDays?: number },
): ProductExpiryStatus {
  const days = daysUntilExpiry(item);
  if (days == null) return null;
  const criticalDays = opts?.criticalDays ?? DEFAULT_CRITICAL_DAYS;
  const warningDays = opts?.warningDays ?? DEFAULT_WARNING_DAYS;
  if (days < 0) return "expired";
  if (days <= criticalDays) return "critical";
  if (days <= warningDays) return "warning";
  return null;
}

export function translateExpiryStatus(status: ProductExpiryStatus): string {
  if (status === "expired") return "Просрочен";
  if (status === "critical") return "Истекает";
  if (status === "warning") return "Скоро истекает";
  return "";
}

/**
 * Best-effort локальное уведомление о товарах с истекающим/истёкшим сроком
 * годности, построенное из уже загруженного на фронте списка товаров.
 * Мирроит buildTariffLocalNotification — реальные push-уведомления должен
 * присылать бэкенд (см. docs/backend/product-expiry-tracking-backend.md).
 */
export function buildProductExpiryLocalNotification(
  products: any[],
  opts?: { warningDays?: number; criticalDays?: number },
) {
  const warningDays = opts?.warningDays ?? DEFAULT_WARNING_DAYS;
  const criticalDays = opts?.criticalDays ?? DEFAULT_CRITICAL_DAYS;

  const flagged = (products || [])
    .map((product) => ({ product, days: daysUntilExpiry(product) }))
    .filter((x): x is { product: any; days: number } => x.days != null && x.days <= warningDays);

  if (!flagged.length) return null;

  const expired = flagged.filter((x) => x.days < 0);
  const critical = flagged.filter((x) => x.days >= 0 && x.days <= criticalDays);
  const soon = flagged.filter((x) => x.days > criticalDays);

  const bucket = expired.length > 0 ? "expired" : critical.length > 0 ? "critical" : "warning";

  const title =
    expired.length > 0
      ? `Просрочено товаров: ${expired.length}`
      : critical.length > 0
        ? `Истекает срок годности: ${critical.length} тов.`
        : `Скоро истекает срок годности: ${soon.length} тов.`;

  const remainderParts: string[] = [];
  if (expired.length > 0 && (critical.length > 0 || soon.length > 0)) {
    remainderParts.push(`ещё ${critical.length + soon.length} истекает в ближайшие ${warningDays} дн.`);
  } else if (critical.length > 0 && soon.length > 0) {
    remainderParts.push(`ещё ${soon.length} — в ближайшие ${warningDays} дн.`);
  }

  const body = remainderParts.length
    ? `Проверьте склад: ${remainderParts.join(", ")}.`
    : "Проверьте склад и спишите или уцените товары.";

  return {
    id: `local-expiry-${bucket}`,
    category: "system" as const,
    title,
    body,
    is_read: false,
    created_at: new Date().toISOString(),
    cta_url: "/crm/market/analytics#products-section-expiringProducts",
    cta_label: "Открыть",
    meta: {
      expired_count: expired.length,
      critical_count: critical.length,
      warning_count: soon.length,
      local: true,
    },
  };
}
