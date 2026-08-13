import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadProductFormLayout,
  normalizeHidden,
  normalizeLayout,
  saveProductFormLayout,
  storageKey,
} from "./storage";

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

describe("product form layout storage", () => {
  it("keeps only known block ids and preserves catalog order", () => {
    expect(normalizeHidden(["images", "nope", "adult", "images"])).toEqual([
      "images",
      "adult",
    ]);
  });

  it("treats missing hidden as empty — new fields stay visible", () => {
    expect(normalizeLayout({})).toEqual({ hidden: [] });
    expect(normalizeLayout(null)).toEqual({ hidden: [] });
  });

  it("reads hidden from payload object", () => {
    expect(normalizeLayout({ hidden: ["expiry", "debt"] })).toEqual({
      hidden: ["debt", "expiry"],
    });
  });

  it("round-trips localStorage per company", () => {
    saveProductFormLayout({ hidden: ["images", "ghost" as any] }, 42);
    expect(localStorage.getItem(storageKey(42))).toContain("images");
    expect(loadProductFormLayout(42)).toEqual({ hidden: ["images"] });
    expect(loadProductFormLayout(99)).toEqual({ hidden: [] });
  });
});
