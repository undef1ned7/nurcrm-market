import type { QuickSlotDigit, QuickSlotsMap } from "./types";
import { QUICK_SLOT_DIGITS } from "./types";

const storageKey = (companyId?: string | number | null) =>
  `market_f3_slots_${companyId || "default"}`;

export function loadQuickSlots(companyId?: string | number | null): QuickSlotsMap {
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: QuickSlotsMap = {};
    QUICK_SLOT_DIGITS.forEach((digit) => {
      const id = parsed[digit];
      if (id != null && String(id).trim()) out[digit] = String(id);
    });
    return out;
  } catch {
    return {};
  }
}

export function saveQuickSlots(
  slots: QuickSlotsMap,
  companyId?: string | number | null,
) {
  localStorage.setItem(storageKey(companyId), JSON.stringify(slots || {}));
}

export function slotForProduct(
  slots: QuickSlotsMap,
  productId?: string | number | null,
): QuickSlotDigit | "" {
  const id = String(productId || "");
  if (!id) return "";
  const found = QUICK_SLOT_DIGITS.find((digit) => slots[digit] === id);
  return found || "";
}

export function digitFromKeyboardEvent(event: KeyboardEvent): QuickSlotDigit | "" {
  const code = String(event.code || "");
  const key = String(event.key || "");
  if (/^Digit[0-9]$/.test(code)) return code.slice(-1) as QuickSlotDigit;
  if (/^Numpad[0-9]$/.test(code)) return code.slice(-1) as QuickSlotDigit;
  if (/^[0-9]$/.test(key)) return key as QuickSlotDigit;
  return "";
}
