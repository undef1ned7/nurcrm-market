export { CustomerDisplayView } from "./ui/CustomerDisplayView";
export { useCustomerDisplayPublisher } from "./model/useCustomerDisplayPublisher";
export {
  dismissAdultAgeCheck,
  publishAdultAgeCheck,
} from "./lib/ageCheck";
export {
  CUSTOMER_DISPLAY_PATH,
  getCustomerDisplaySlidesText,
  getCustomerDisplayTheme,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
  setCustomerDisplayEnabled,
  setCustomerDisplaySlides,
  setCustomerDisplayTheme,
  setCustomerDisplayWelcome,
} from "./model/settings";
export type { CustomerDisplayMessage, CustomerDisplayPhase } from "./model/types";
export type { CustomerDisplayTheme } from "./model/settings";
