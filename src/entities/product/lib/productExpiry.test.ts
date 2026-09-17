import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBatchDaysLeft,
  getBatchExpiryStatus,
  isBatchExpiryEnabled,
} from "./productExpiry";

describe("isBatchExpiryEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("off by default", () => {
    vi.stubEnv("VITE_PRODUCT_BATCH_EXPIRY", undefined);
    expect(isBatchExpiryEnabled()).toBe(false);
  });

  it("on only for the literal string 'true'", () => {
    vi.stubEnv("VITE_PRODUCT_BATCH_EXPIRY", "true");
    expect(isBatchExpiryEnabled()).toBe(true);
    vi.stubEnv("VITE_PRODUCT_BATCH_EXPIRY", "1");
    expect(isBatchExpiryEnabled()).toBe(false);
  });
});

describe("getBatchDaysLeft", () => {
  it("prefers server-computed days_left", () => {
    expect(getBatchDaysLeft({ id: "b1", days_left: 3, expires_at: "2099-01-01" })).toBe(3);
  });

  it("falls back to computing from expires_at", () => {
    // Время без "Z" — обе даты парсятся как локальные, тест не зависит
    // от таймзоны раннера (в отличие от "2026-01-04" — date-only строка
    // парсится как UTC-полночь, что плывёт относительно локальной полуночи).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00"));
    expect(getBatchDaysLeft({ id: "b1", expires_at: "2026-01-04T00:00:00" })).toBe(3);
    vi.useRealTimers();
  });

  it("returns null without days_left or expires_at", () => {
    expect(getBatchDaysLeft({ id: "b1" })).toBeNull();
  });
});

describe("getBatchExpiryStatus", () => {
  it("maps documented thresholds", () => {
    expect(getBatchExpiryStatus({ id: "b1", days_left: -1 })).toBe("expired");
    expect(getBatchExpiryStatus({ id: "b1", days_left: 0 })).toBe("critical");
    expect(getBatchExpiryStatus({ id: "b1", days_left: 3 })).toBe("critical");
    expect(getBatchExpiryStatus({ id: "b1", days_left: 6 })).toBe("warning");
    expect(getBatchExpiryStatus({ id: "b1", days_left: 14 })).toBe("warning");
    expect(getBatchExpiryStatus({ id: "b1", days_left: 15 })).toBeNull();
  });

  /**
   * Ровно сценарий из репорта пользователя: один товар, срок годности
   * 6 дней. Партия A получена сегодня-3дня (осталось 3 дня — critical),
   * партия B — сегодня (осталось 6 дней — warning). Каждая партия считает
   * свой остаток независимо, а не одну дату на весь товар.
   */
  it("gives independent remaining days per batch of the same product", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T00:00:00"));

    const batchA = { id: "a", received_at: "2026-01-01", expires_at: "2026-01-07T00:00:00" };
    const batchB = { id: "b", received_at: "2026-01-04", expires_at: "2026-01-10T00:00:00" };

    expect(getBatchDaysLeft(batchA)).toBe(3);
    expect(getBatchExpiryStatus(batchA)).toBe("critical");

    expect(getBatchDaysLeft(batchB)).toBe(6);
    expect(getBatchExpiryStatus(batchB)).toBe("warning");

    vi.useRealTimers();
  });
});
