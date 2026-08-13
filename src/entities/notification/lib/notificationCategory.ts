export type NotificationTab = "all" | "tariff" | "system" | "news";

export type NotificationCategory = "tariff" | "system" | "news" | "other";

const CATEGORY_ALIASES: Record<string, NotificationCategory> = {
  tariff: "tariff",
  subscription: "tariff",
  plan: "tariff",
  billing: "tariff",
  system: "system",
  service: "system",
  maintenance: "system",
  technical: "system",
  news: "news",
  offer: "news",
  promo: "news",
  marketing: "news",
};

export function notificationCategory(item: unknown): NotificationCategory {
  const raw = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const value = String(
    raw.category ?? raw.type ?? raw.kind ?? raw.notification_type ?? "",
  )
    .trim()
    .toLowerCase();
  return CATEGORY_ALIASES[value] || "other";
}

export function matchesNotificationTab(
  item: unknown,
  tab: NotificationTab,
): boolean {
  if (tab === "all") return true;
  return notificationCategory(item) === tab;
}

export function formatUnreadBadge(count: number) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return "";
  if (n > 99) return "99+";
  return String(n);
}

export function subscriptionDaysLeft(endDate: unknown): number | null {
  if (!endDate) return null;
  const end = new Date(String(endDate));
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function buildTariffLocalNotification(endDate: unknown) {
  const days = subscriptionDaysLeft(endDate);
  if (days == null || days < 0 || days > 7) return null;

  const threshold = days <= 1 ? 1 : days <= 3 ? 3 : 7;
  return {
    id: `local-tariff-${threshold}`,
    category: "tariff" as const,
    title:
      days <= 0
        ? "Тариф заканчивается сегодня"
        : `Тариф заканчивается через ${days} дн.`,
    body: "Продлите подписку заранее, чтобы сохранить доступ ко всем функциям NurCRM.",
    is_read: false,
    created_at: new Date().toISOString(),
    cta_url: "/crm/additional-services",
    cta_label: "Продлить",
    meta: { days_left: days, local: true },
  };
}
