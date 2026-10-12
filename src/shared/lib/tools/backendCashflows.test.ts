import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isBackendCashflowsEnabled,
  shouldPostCashflowFallback,
} from "./backendCashflows";

describe("backendCashflows flag", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled by default", () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", undefined);
    expect(isBackendCashflowsEnabled()).toBe(false);
    expect(shouldPostCashflowFallback()).toBe(true);
  });

  it("is disabled when set to false-ish strings", () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "false");
    expect(isBackendCashflowsEnabled()).toBe(false);
    expect(shouldPostCashflowFallback()).toBe(true);

    vi.stubEnv("VITE_BE_CASHFLOWS", "1");
    expect(isBackendCashflowsEnabled()).toBe(false);
  });

  it("is enabled only when exactly true", () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "true");
    expect(isBackendCashflowsEnabled()).toBe(true);
    expect(shouldPostCashflowFallback()).toBe(false);
  });
});
