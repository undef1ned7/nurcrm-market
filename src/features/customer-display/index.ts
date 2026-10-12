export { CustomerDisplayView } from "./ui/CustomerDisplayView";
export { useCustomerDisplayPublisher } from "./model/useCustomerDisplayPublisher";
export {
  dismissAdultAgeCheck,
  publishAdultAgeCheck,
} from "./lib/ageCheck";
export {
  CUSTOMER_DISPLAY_PATH,
  CUSTOMER_DISPLAY_SETTINGS_SYNCED_EVENT,
  getCustomerDisplaySlides,
  getCustomerDisplaySlidesText,
  getCustomerDisplayTheme,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
  pushCustomerDisplaySettingsUpdate,
  setCustomerDisplayEnabled,
  setCustomerDisplaySlides,
  setCustomerDisplayTheme,
  setCustomerDisplayWelcome,
  syncCustomerDisplaySettingsFromBackend,
} from "./model/settings";
export type { CustomerDisplayMessage, CustomerDisplayPhase } from "./model/types";
export type { CustomerDisplayTheme } from "./model/settings";
