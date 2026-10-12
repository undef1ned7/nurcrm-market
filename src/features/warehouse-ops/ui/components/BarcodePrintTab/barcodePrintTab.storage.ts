import type {
  BarcodePrintPageState,
  BarcodePrintSettingsState,
  LabelSizeKey,
} from "./barcodePrintTab.types";
import {
  AVAILABLE_FONTS,
  DEFAULT_PRINT_SETTINGS,
  SIZE_MAP,
  clamp,
  clampMm,
} from "./barcodePrintTab.utils";

export const BARCODE_PRINT_SETTINGS_KEY = "barcode_print_settings";
export const BARCODE_PRINT_PAGE_KEY = "barcode_print_page";

const LABEL_SIZE_KEYS = new Set<string>([...Object.keys(SIZE_MAP), "custom"]);
const FONT_IDS = new Set(AVAILABLE_FONTS.map((font) => font.value));
const MAX_MAP_ENTRIES = 2000;

export const DEFAULT_BARCODE_PRINT_SETTINGS: BarcodePrintSettingsState = {
  labelSize: "30x20",
  customWidthMm: 40,
  customHeightMm: 30,
  fontId: DEFAULT_PRINT_SETTINGS.fontId,
  textScale: Number(DEFAULT_PRINT_SETTINGS.textScale) || 1,
  copies: Number(DEFAULT_PRINT_SETTINGS.copies) || 1,
  barcodeHeight: DEFAULT_PRINT_SETTINGS.barcodeHeight,
  barcodeBarWidth: DEFAULT_PRINT_SETTINGS.barcodeBarWidth,
  didTouchTextScale: false,
  didTouchBarcodeSize: false,
  showName: true,
  showPrice: true,
  barcodeById: {},
  copiesById: {},
};

export const DEFAULT_BARCODE_PRINT_PAGE: BarcodePrintPageState = {
  searchTerm: "",
  page: 1,
};

const isLabelSize = (value: unknown): value is LabelSizeKey =>
  typeof value === "string" && LABEL_SIZE_KEYS.has(value);

const toBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

function capEntries<T>(entries: [string, T][]): [string, T][] {
  if (entries.length <= MAX_MAP_ENTRIES) return entries;
  return entries.slice(entries.length - MAX_MAP_ENTRIES);
}

export function normalizeBarcodeById(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([id, value]) => [String(id), String(value ?? "").trim()] as [string, string])
    .filter(([id, value]) => id && value);
  return Object.fromEntries(capEntries(entries));
}

export function normalizeCopiesById(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([id, value]) => {
      const copies = Math.round(Number(value));
      if (!id || !Number.isFinite(copies)) return null;
      return [String(id), clamp(copies, 1, 100)] as [string, number];
    })
    .filter((entry): entry is [string, number] => Boolean(entry));
  return Object.fromEntries(capEntries(entries));
}

export function normalizeBarcodePrintSettings(
  raw: unknown,
): BarcodePrintSettingsState {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<BarcodePrintSettingsState>)
      : {};

  return {
    labelSize: isLabelSize(source.labelSize)
      ? source.labelSize
      : DEFAULT_BARCODE_PRINT_SETTINGS.labelSize,
    customWidthMm: clampMm(
      source.customWidthMm,
      15,
      110,
      DEFAULT_BARCODE_PRINT_SETTINGS.customWidthMm,
    ),
    customHeightMm: clampMm(
      source.customHeightMm,
      10,
      110,
      DEFAULT_BARCODE_PRINT_SETTINGS.customHeightMm,
    ),
    fontId: FONT_IDS.has(String(source.fontId || ""))
      ? String(source.fontId)
      : DEFAULT_BARCODE_PRINT_SETTINGS.fontId,
    textScale: clamp(Math.round(Number(source.textScale) || 1), 1, 3),
    copies: clamp(Math.round(Number(source.copies) || 1), 1, 100),
    barcodeHeight: clamp(
      Number(source.barcodeHeight) || DEFAULT_PRINT_SETTINGS.barcodeHeight,
      20,
      200,
    ),
    barcodeBarWidth: clamp(
      Math.round(
        Number(source.barcodeBarWidth) ||
          DEFAULT_PRINT_SETTINGS.barcodeBarWidth,
      ),
      1,
      4,
    ),
    didTouchTextScale: toBoolean(source.didTouchTextScale, false),
    didTouchBarcodeSize: toBoolean(source.didTouchBarcodeSize, false),
    showName: toBoolean(source.showName, true),
    showPrice: toBoolean(source.showPrice, true),
    barcodeById: normalizeBarcodeById(source.barcodeById),
    copiesById: normalizeCopiesById(source.copiesById),
  };
}

export function normalizeBarcodePrintPage(raw: unknown): BarcodePrintPageState {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<BarcodePrintPageState>)
      : {};
  const page = Math.round(Number(source.page) || 1);
  return {
    searchTerm: String(source.searchTerm ?? "").slice(0, 200),
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
  };
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function loadBarcodePrintSettings(): BarcodePrintSettingsState {
  return normalizeBarcodePrintSettings(readJson(BARCODE_PRINT_SETTINGS_KEY));
}

export function saveBarcodePrintSettings(state: BarcodePrintSettingsState) {
  writeJson(
    BARCODE_PRINT_SETTINGS_KEY,
    normalizeBarcodePrintSettings(state),
  );
}

export function loadBarcodePrintPage(): BarcodePrintPageState {
  return normalizeBarcodePrintPage(readJson(BARCODE_PRINT_PAGE_KEY));
}

export function saveBarcodePrintPage(state: BarcodePrintPageState) {
  writeJson(BARCODE_PRINT_PAGE_KEY, normalizeBarcodePrintPage(state));
}
