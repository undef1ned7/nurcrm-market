import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRINTER_IN_USE_MESSAGE,
  acquireUsbLock,
  assertUsbAvailableForThisTab,
  isUsbLockHeldByOtherTab,
  releaseUsbLock,
  resetUsbLockForTests,
  setUsbTabIdForTests,
} from "./usbLock";

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
  resetUsbLockForTests("test-tab-a");
});

afterEach(() => {
  resetUsbLockForTests("test-tab-a");
  vi.unstubAllGlobals();
});

describe("usb tab lock", () => {
  it("lets the same tab re-acquire", () => {
    resetUsbLockForTests("tab-a");
    acquireUsbLock();
    expect(() => assertUsbAvailableForThisTab()).not.toThrow();
    acquireUsbLock();
  });

  it("blocks another tab while the lock is fresh", () => {
    resetUsbLockForTests("tab-a");
    acquireUsbLock();

    setUsbTabIdForTests("tab-b");
    expect(isUsbLockHeldByOtherTab()).toBe(true);
    expect(() => assertUsbAvailableForThisTab()).toThrow(PRINTER_IN_USE_MESSAGE);
  });

  it("allows another tab after release", () => {
    resetUsbLockForTests("tab-a");
    acquireUsbLock();
    releaseUsbLock();

    setUsbTabIdForTests("tab-b");
    expect(isUsbLockHeldByOtherTab()).toBe(false);
    expect(() => acquireUsbLock()).not.toThrow();
  });
});
 