import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportEscposSettings,
  importEscposSettings,
  parseEscposSettingsImport,
  getReceiptPrintMode,
  setEscposReceiptMode,
  isGraphicReceiptMode,
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

describe("escpos settings export/import", () => {
  it("exports only present escpos_* keys", () => {
    localStorage.setItem("escpos_dpl", "384");
    localStorage.setItem("escpos_cp", "17");
    localStorage.setItem("unrelated", "nope");
    const dumped = exportEscposSettings();
    expect(dumped.version).toBe(1);
    expect(dumped.settings).toEqual({ escpos_dpl: "384", escpos_cp: "17" });
  });

  it("imports a wrapped backup and ignores unknown keys", () => {
    const { applied } = importEscposSettings({
      version: 1,
      settings: {
        escpos_font: "A",
        escpos_drawer_enabled: "1",
        secret: "nope",
      },
    });
    expect(applied.sort()).toEqual(["escpos_drawer_enabled", "escpos_font"]);
    expect(localStorage.getItem("escpos_font")).toBe("A");
    expect(localStorage.getItem("secret")).toBeNull();
  });

  it("accepts a flat object of escpos_* keys", () => {
    const parsed = parseEscposSettingsImport({ escpos_cpl: "42" });
    expect(parsed).toEqual({ escpos_cpl: "42" });
  });

  it("rejects JSON without escpos keys", () => {
    expect(() => parseEscposSettingsImport({ foo: 1 })).toThrow(/escpos_/);
  });

  it("defaults receipt print mode to graphic", () => {
    expect(getReceiptPrintMode()).toBe("graphic");
    expect(isGraphicReceiptMode()).toBe(true);
  });

  it("persists text receipt print mode", () => {
    setEscposReceiptMode("text");
    expect(getReceiptPrintMode()).toBe("text");
    expect(isGraphicReceiptMode()).toBe(false);
    setEscposReceiptMode("graphic");
    expect(getReceiptPrintMode()).toBe("graphic");
  });
});
