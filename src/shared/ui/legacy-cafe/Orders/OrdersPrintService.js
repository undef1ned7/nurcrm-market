/** Stub printer helpers for Settings cafe panels (unused in market UI). */
export function getSavedPrinters() {
  return [];
}
export async function listAuthorizedPrinters() {
  return [];
}
export async function choosePrinterByDialog() {
  return null;
}
export async function setActivePrinterByKey() {
  return null;
}
export function formatPrinterBinding(input) {
  return typeof input === "string" ? input : "";
}
export function parsePrinterBinding(raw) {
  return raw || "";
}
export async function printOrderReceiptJSONViaUSB() {
  return false;
}
export async function printViaWiFiSimple() {
  return false;
}
