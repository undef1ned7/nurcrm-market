/**
 * Menu group labels for sidebar IA (market redesign).
 * Items without a mapped group fall into "Прочее".
 */
export const MENU_GROUP_ORDER = [
  "Продажи",
  "Склад",
  "Люди",
  "Финансы",
  "Система",
  "Помощь",
  "Прочее",
];

const GROUP_BY_TO: Record<string, string> = {
  "/crm/market/cashier": "Продажи",
  "/crm/sell": "Продажи",
  "/crm/market/history": "Продажи",
  "/crm/shifts": "Продажи",
  "/crm/sklad": "Склад",
  "/crm/market/procurement": "Склад",
  "/crm/zakaz": "Склад",
  "/crm/market/documents": "Склад",
  "/crm/market/categories": "Склад",
  "/crm/brand-category": "Склад",
  "/crm/barcodes": "Склад",
  "/crm/scales": "Склад",
  "/crm/clients": "Люди",
  "/crm/market/suppliers": "Люди",
  "/crm/employ": "Люди",
  "/crm/branch": "Люди",
  "/crm/kassa": "Финансы",
  "/crm/debts": "Финансы",
  "/crm/market/analytics": "Финансы",
  "/crm/analytics": "Финансы",
  "/crm/additional-services": "Система",
  "/crm/set": "Система",
  "/crm/pos-print-settings": "Система",
  "/crm/market/summary": "Продажи",
  "/crm/market/rentals": "Продажи",
  "/crm/market/appointments": "Продажи",
  "/crm/market/work-orders": "Продажи",
  "/crm/market/calculator": "Склад",
  "/crm/market/abc": "Финансы",
  "/crm/market/knowledge-base": "Помощь",
  "/crm/market/error-log": "Помощь",
};

const GROUP_BY_LABEL: Record<string, string> = {
  История: "Продажи",
  Смены: "Продажи",
  Продажа: "Продажи",
  Склад: "Склад",
  Закупки: "Склад",
  Документы: "Склад",
  Категории: "Склад",
  "Бренд,Категория": "Склад",
  Клиенты: "Люди",
  Поставщики: "Люди",
  Сотрудники: "Люди",
  Филиалы: "Люди",
  Касса: "Финансы",
  Долги: "Финансы",
  Аналитика: "Финансы",
  "Доп услуги": "Система",
  Настройки: "Система",
  Сводка: "Продажи",
  Калькуляция: "Склад",
  "ABC-анализ": "Финансы",
  "База знаний": "Помощь",
  "Журнал ошибок": "Помощь",
};

/**
 * Resolve group for a menu item.
 */
export function resolveMenuGroup(item: any) {
  if (item?.group) return item.group;
  if (item?.label && GROUP_BY_LABEL[item.label]) {
    return GROUP_BY_LABEL[item.label];
  }
  if (typeof item?.to === "string") {
    if (GROUP_BY_TO[item.to]) return GROUP_BY_TO[item.to];
    for (const [prefix, group] of Object.entries(GROUP_BY_TO)) {
      if (item.to === prefix || item.to.startsWith(`${prefix}/`)) {
        return group;
      }
    }
  }
  return "Прочее";
}

/**
 * Sort flat menu items into grouped sections preserving relative order
 * within each group according to MENU_GROUP_ORDER.
 */
export function groupMenuItems(items: any[]) {
  const buckets: Record<string, any[]> = Object.fromEntries(
    MENU_GROUP_ORDER.map((g) => [g, [] as any[]]),
  );

  items.forEach((item) => {
    const group = resolveMenuGroup(item);
    if (!buckets[group]) buckets[group] = [];
    buckets[group].push({ ...item, group });
  });

  return MENU_GROUP_ORDER.map((label) => ({
    label,
    items: buckets[label] || [],
  })).filter((section) => section.items.length > 0);
}
