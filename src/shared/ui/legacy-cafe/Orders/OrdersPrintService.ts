/** Stub printer helpers for Settings cafe panels (unused in market UI). */
export function getSavedPrinters(..._args: any[]) {
  return [] as any[];
}
export async function listAuthorizedPrinters(..._args: any[]) {
  return [] as any[];
}
export async function choosePrinterByDialog(..._args: any[]) {
  return null as any;
}
export async function setActivePrinterByKey(..._args: any[]) {
  return null as any;
}
export function formatPrinterBinding(input: any) {
  return typeof input === "string" ? input : "";
}
export function parsePrinterBinding(raw: any) {
  return raw || "";
}
export async function printOrderReceiptJSONViaUSB(..._args: any[]) {
  return false;
}
export async function printViaWiFiSimple(..._args: any[]) {
  return false;
}
