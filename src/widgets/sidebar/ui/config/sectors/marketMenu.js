import { menuIcons } from "../menuIcons";

export const marketMenu = [
  {
    label: "История",
    to: "/crm/market/history",
    icon: menuIcons.clipboard,
    permission: "can_view_orders",
    implemented: true,
    group: "Продажи",
  },
  {
    label: "Аналитика",
    to: "/crm/market/analytics",
    icon: menuIcons.chartBar,
    permission: "can_view_analytics",
    implemented: true,
    group: "Финансы",
  },
  {
    label: "Смены",
    to: "/crm/shifts",
    icon: menuIcons.calendar,
    permission: "can_view_shifts",
    implemented: true,
    group: "Продажи",
  },
  {
    label: "Закупки",
    to: "/crm/market/procurement",
    icon: menuIcons.receiptText,
    permission: "can_view_market_procurement",
    implemented: true,
    group: "Склад",
  },
  {
    label: "Поставщики",
    to: "/crm/market/suppliers",
    icon: menuIcons.filePerson,
    permission: "can_view_market_supplier",
    implemented: true,
    group: "Люди",
  },
  {
    label: "Документы",
    to: "/crm/market/documents",
    icon: menuIcons.documentScanner,
    permission: "can_view_document",
    implemented: true,
    group: "Склад",
  },
];
