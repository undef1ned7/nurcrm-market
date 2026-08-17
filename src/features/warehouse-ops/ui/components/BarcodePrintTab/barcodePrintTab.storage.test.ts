import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BARCODE_PRINT_PAGE_KEY,
  BARCODE_PRINT_SETTINGS_KEY,
  DEFAULT_BARCODE_PRINT_PAGE,
  DEFAULT_BARCODE_PRINT_SETTINGS,
  loadBarcodePrintPage,
  loadBarcodePrintSettings,
  normalizeBarcodeById,
  normalizeBarcodePrintPage,
  normalizeBarcodePrintSettings,
  saveBarcodePrintPage,
  saveBarcodePrintSettings,
} from "./barcodePrintTab.storage";

const memory: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(memory)) delete memory[key];
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => {
      memory[key] = String(value);
    },
    removeItem: (key: string) => {
      delete memory[key];
    },
    clear: () => {
      for (const key of Object.keys(memory)) delete memory[key];
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("barcode print settings storage", () => {
  it("falls back to defaults for empty or invalid payload", () => {
    expect(normalizeBarcodePrintSettings(null)).toEqual(
      DEFAULT_BARCODE_PRINT_SETTINGS,
    );
    expect(normalizeBarcodePrintSettings({ labelSize: "99x99" }).labelSize).toBe(
      "30x20",
    );
  });

  it("keeps last used barcode per product and drops empty values", () => {
    expect(
      normalizeBarcodeById({
        "11": " 4601234567890 ",
        "12": "",
        "": "skip",
      }),
    ).toEqual({ "11": "4601234567890" });
  });

  it("round-trips settings and last used barcodes", () => {
    saveBarcodePrintSettings({
      ...DEFAULT_BARCODE_PRINT_SETTINGS,
      labelSize: "58x40",
      copies: 4,
      showName: false,
      barcodeById: { "7": "2000000000017" },
      copiesById: { "7": 3 },
    });

    expect(localStorage.getItem(BARCODE_PRINT_SETTINGS_KEY)).toContain("58x40");
    expect(loadBarcodePrintSettings()).toMatchObject({
      labelSize: "58x40",
      copies: 4,
      showName: false,
      barcodeById: { "7": "2000000000017" },
      copiesById: { "7": 3 },
    });
  });
});

describe("barcode print page storage", () => {
  it("clamps page and keeps search", () => {
    expect(normalizeBarcodePrintPage({ searchTerm: "чай", page: 0 })).toEqual({
      searchTerm: "чай",
      page: 1,
    });
  });

  it("round-trips search and page", () => {
    saveBarcodePrintPage({ searchTerm: "молоко", page: 3 });
    expect(localStorage.getItem(BARCODE_PRINT_PAGE_KEY)).toContain("молоко");
    expect(loadBarcodePrintPage()).toEqual({
      searchTerm: "молоко",
      page: 3,
    });
    expect(normalizeBarcodePrintPage(null)).toEqual(DEFAULT_BARCODE_PRINT_PAGE);
  });
});
