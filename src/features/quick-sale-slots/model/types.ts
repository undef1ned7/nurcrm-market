export type QuickSlotDigit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export type QuickSlotsMap = Partial<Record<QuickSlotDigit, string>>;

export const QUICK_SLOT_DIGITS: QuickSlotDigit[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
];

export const F3_AWAIT_MS = 2000;
