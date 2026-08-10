/**
 * Конфигурация меню — сфера «Магазин» + общие пункты
 */
import { commonMenu } from "./commonMenu";
import { marketMenu } from "./sectors/marketMenu";
import { additionalMenu } from "./sectors/additionalMenu";

const marketCommonPaths = new Set([
  "/crm/sell",
  "/crm/sklad",
  "/crm/kassa",
  "/crm/employ",
  "/crm/clients",
  "/crm/branch",
  "/crm/debts",
  "/crm/brand-category",
  "/crm/set",
]);

const marketCommonMenu = commonMenu.filter((item) =>
  marketCommonPaths.has(item.to),
);

const marketAdditionalMenu = additionalMenu.filter((item) =>
  ["barcode-print", "scales"].includes(item.id),
);

export const MENU_CONFIG = {
  basic: marketCommonMenu,
  sector: {
    market: marketMenu,
  },
  additional: marketAdditionalMenu,
};
