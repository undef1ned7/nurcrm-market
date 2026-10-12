/**
 * Срок годности товара: локальные расчёты на основе `product.expiration_date`.
 * Бэкенд контракт: docs/backend/product-expiry-tracking-backend.md
 *
 * Партии (батчи) прихода со своим сроком годности — за флагом
 * `VITE_PRODUCT_BATCH_EXPIRY`, см. docs/backend/product-batch-expiry-backend.md.
 * `product.expiration_date` в новой модели бэкенд отдаёт как агрегат — срок
 * годности ближайшей активной партии, поэтому badge в таблице склада
 * (`getExpiryStatus`) продолжает работать без изменений.
 */

import i18n from "i18next";

export type ProductExpiryStatus = "expired" | "critical" | "warning" | null;

/** Партия прихода со своим сроком годности (см. §2 контракта для бэка). */
export type ProductExpiryBatch = {
  id: string;
  product?: string;
  quantity?: string | number;
  remaining_quantity?: string | number;
  received_at?: string;
  expires_at?: string | null;
  days_left?: number | null;
  status?: "active" | "expired" | "consumed";
  source_kind?: string;
  source_id?: string | null;
  supplier_name?: string | null;
  created_by_name?: string | null;
};

const DEFAULT_CRITICAL_DAYS = 3;
const DEFAULT_WARNING_DAYS = 14;

/** Фичефлаг: партии прихода со своим сроком годности вместо одной даты на товаре. */
export function isBatchExpiryEnabled(): boolean {
  return import.meta.env.VITE_PRODUCT_BATCH_EXPIRY === "true";
}

/** Сколько дней осталось до `date` (отрицательное — просрочено), начало дня по локали браузера. */
function daysUntilDate(date: Date): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function statusFromDays(
  days: number | null,
  opts?: { criticalDays?: number; warningDays?: number },
): ProductExpiryStatus {
  if (days == null) return null;
  const criticalDays = opts?.criticalDays ?? DEFAULT_CRITICAL_DAYS;
  const warningDays = opts?.warningDays ?? DEFAULT_WARNING_DAYS;
  if (days < 0) return "expired";
  if (days <= criticalDays) return "critical";
  if (days <= warningDays) return "warning";
  return null;
}

export function getExpiryDate(item: any): Date | null {
  const raw = item?.expiration_date ?? item?.expiry_date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Сколько дней осталось до истечения срока (отрицательное — просрочено). */
export function daysUntilExpiry(item: any): number | null {
  const date = getExpiryDate(item);
  return date ? daysUntilDate(date) : null;
}

export function getExpiryStatus(
  item: any,
  opts?: { criticalDays?: number; warningDays?: number },
): ProductExpiryStatus {
  return statusFromDays(daysUntilExpiry(item), opts);
}

/**
 * Сколько дней осталось у конкретной партии. Предпочитает `days_left`,
 * посчитанный бэком (без расхождений из-за таймзоны клиента), иначе
 * считает сам от `expires_at`.
 */
export function getBatchDaysLeft(batch: ProductExpiryBatch): number | null {
  if (batch?.days_left != null && Number.isFinite(Number(batch.days_left))) {
    return Number(batch.days_left);
  }
  if (!batch?.expires_at) return null;
  const date = new Date(batch.expires_at);
  return Number.isNaN(date.getTime()) ? null : daysUntilDate(date);
}

export function getBatchExpiryStatus(
  batch: ProductExpiryBatch,
  opts?: { criticalDays?: number; warningDays?: number },
): ProductExpiryStatus {
  return statusFromDays(getBatchDaysLeft(batch), opts);
}

export function translateExpiryStatus(status: ProductExpiryStatus): string {
  if (status === "expired")
    return i18n.t("notifications.local.expiry.statusExpired");
  if (status === "critical")
    return i18n.t("notifications.local.expiry.statusCritical");
  if (status === "warning")
    return i18n.t("notifications.local.expiry.statusWarning");
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
      ? i18n.t("notifications.local.expiry.titleExpired", {
          count: expired.length,
        })
      : critical.length > 0
        ? i18n.t("notifications.local.expiry.titleCritical", {
            count: critical.length,
          })
        : i18n.t("notifications.local.expiry.titleSoon", {
            count: soon.length,
          });

  const remainderParts: string[] = [];
  if (expired.length > 0 && (critical.length > 0 || soon.length > 0)) {
    remainderParts.push(
      i18n.t("notifications.local.expiry.remainderMixed", {
        count: critical.length + soon.length,
        days: warningDays,
      }),
    );
  } else if (critical.length > 0 && soon.length > 0) {
    remainderParts.push(
      i18n.t("notifications.local.expiry.remainderSoon", {
        count: soon.length,
        days: warningDays,
      }),
    );
  }

  const body = remainderParts.length
    ? i18n.t("notifications.local.expiry.bodyWithParts", {
        parts: remainderParts.join(", "),
      })
    : i18n.t("notifications.local.expiry.bodyDefault");

  return {
    id: `local-expiry-${bucket}`,
    category: "system" as const,
    title,
    body,
    is_read: false,
    created_at: new Date().toISOString(),
    cta_url: "/crm/market/analytics#products-section-expiringProducts",
    cta_label: i18n.t("notifications.local.expiry.cta"),
    meta: {
      expired_count: expired.length,
      critical_count: critical.length,
      warning_count: soon.length,
      local: true,
    },
  };
}
