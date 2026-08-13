export { CustomerDisplayView } from "./ui/CustomerDisplayView";
export { useCustomerDisplayPublisher } from "./model/useCustomerDisplayPublisher";
export {
  dismissAdultAgeCheck,
  publishAdultAgeCheck,
} from "./lib/ageCheck";
export {
  CUSTOMER_DISPLAY_PATH,
  getCustomerDisplaySlidesText,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
  setCustomerDisplayEnabled,
  setCustomerDisplaySlides,
  setCustomerDisplayWelcome,
} from "./model/settings";
export type { CustomerDisplayMessage, CustomerDisplayPhase } from "./model/types";
