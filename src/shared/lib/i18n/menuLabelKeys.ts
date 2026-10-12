/** Stable sidebar label (RU) → i18n key under `crm.nav`. */
export const MENU_LABEL_I18N_KEYS: Record<string, string> = {
  Обзор: "crm.nav.items.overview",
  Закупки: "crm.nav.items.procurement",
  Продажа: "crm.nav.items.sell",
  Аналитика: "crm.nav.items.analytics",
  Склад: "crm.nav.items.warehouse",
  Касса: "crm.nav.items.cashbox",
  Сотрудники: "crm.nav.items.employees",
  Бронирование: "crm.nav.items.booking",
  Клиенты: "crm.nav.items.clients",
  Филиалы: "crm.nav.items.branches",
  Отделы: "crm.nav.items.departments",
  Долги: "crm.nav.items.debts",
  "Бренд,Категория": "crm.nav.items.brandCategory",
  Настройки: "crm.nav.items.settings",
  История: "crm.nav.items.history",
  Смены: "crm.nav.items.shifts",
  Поставщики: "crm.nav.items.suppliers",
  Документы: "crm.nav.items.documents",
  "Доп услуги": "crm.nav.items.additionalServices",
  "Печать штрих-кодов": "crm.nav.items.barcodePrint",
  "Интеграция с весами": "crm.nav.items.scales",
  "Интерфейс кассира": "crm.nav.items.cashierUi",
  Категории: "crm.nav.items.categories",
  Сводка: "crm.nav.items.summary",
  Калькуляция: "crm.nav.items.calculator",
  "ABC-анализ": "crm.nav.items.abc",
  "База знаний": "crm.nav.items.knowledgeBase",
  "Журнал ошибок": "crm.nav.items.errorLog",
  Прокат: "crm.nav.items.rentals",
  "Запись клиентов": "crm.nav.items.appointments",
  "Заказ-наряды": "crm.nav.items.workOrders",
};

export const MENU_GROUP_I18N_KEYS: Record<string, string> = {
  Продажи: "crm.nav.groups.sales",
  Склад: "crm.nav.groups.warehouse",
  Люди: "crm.nav.groups.people",
  Финансы: "crm.nav.groups.finance",
  Система: "crm.nav.groups.system",
  Помощь: "crm.nav.groups.help",
  Прочее: "crm.nav.groups.other",
};

export function translateMenuLabel(
  label: string,
  t: (key: string) => string,
): string {
  const key = MENU_LABEL_I18N_KEYS[label];
  return key ? t(key) : label;
}

export function translateMenuGroup(
  label: string,
  t: (key: string) => string,
): string {
  const key = MENU_GROUP_I18N_KEYS[label];
  return key ? t(key) : label;
}
