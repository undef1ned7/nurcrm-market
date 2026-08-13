import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAdultProduct,
  isLocalAdultProduct,
  rememberAdultProduct,
} from "./isAdultProduct";

const COMPANY = "company-1";
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

describe("isAdultProduct", () => {
  it("reads explicit API flags", () => {
    expect(isAdultProduct({ id: "1", is_adult: true })).toBe(true);
    expect(isAdultProduct({ id: "1", is_18_plus: true })).toBe(true);
    expect(isAdultProduct({ id: "1", is_adult: false })).toBe(false);
  });

  it("falls back to localStorage when API flag is missing", () => {
    rememberAdultProduct("p-1", true, COMPANY);
    expect(isLocalAdultProduct("p-1", COMPANY)).toBe(true);
    expect(isAdultProduct({ id: "p-1" }, COMPANY)).toBe(true);
    expect(isAdultProduct({ id: "p-2" }, COMPANY)).toBe(false);
  });

  it("API false wins over localStorage", () => {
    rememberAdultProduct("p-1", true, COMPANY);
    expect(isAdultProduct({ id: "p-1", is_adult: false }, COMPANY)).toBe(false);
  });

  it("clears local flag when unchecked", () => {
    rememberAdultProduct("p-1", true, COMPANY);
    rememberAdultProduct("p-1", false, COMPANY);
    expect(isAdultProduct({ id: "p-1" }, COMPANY)).toBe(false);
  });
});
