import { publishCustomerDisplay } from "./channel";
import { isCustomerDisplayEnabled } from "../model/settings";

export function publishAdultAgeCheck(productName?: string) {
  if (!isCustomerDisplayEnabled()) return false;
  publishCustomerDisplay({
    type: "age-check",
    productName: String(productName || "").trim() || undefined,
  });
  return true;
}

export function dismissAdultAgeCheck() {
  if (!isCustomerDisplayEnabled()) return;
  publishCustomerDisplay({ type: "age-check-dismiss" });
}
