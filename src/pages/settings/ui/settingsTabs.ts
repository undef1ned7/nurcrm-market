export const SETTINGS_TABS = {
  company: "company",
  subscription: "subscription",
  security: "security",
  cashier: "cashier",
  scalesToken: "scalesToken",
  interface: "interface",
  print: "print",
  online: "online",
} as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[keyof typeof SETTINGS_TABS];

export const ALL_SETTINGS_TABS: SettingsTabId[] = [
  SETTINGS_TABS.company,
  SETTINGS_TABS.subscription,
  SETTINGS_TABS.security,
  SETTINGS_TABS.cashier,
  SETTINGS_TABS.scalesToken,
  SETTINGS_TABS.interface,
  SETTINGS_TABS.print,
  SETTINGS_TABS.online,
];
