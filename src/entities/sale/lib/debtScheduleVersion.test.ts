import { describe, expect, it } from "vitest";
import {
  isDebtScheduleV2,
  parseDebtScheduleVersion,
} from "./debtScheduleVersion";

describe("parseDebtScheduleVersion", () => {
  it("defaults to v2 for this app", () => {
    expect(parseDebtScheduleVersion(undefined)).toBe("v2");
    expect(parseDebtScheduleVersion("")).toBe("v2");
    expect(parseDebtScheduleVersion("v2")).toBe("v2");
    expect(isDebtScheduleV2(undefined)).toBe(true);
  });

  it("uses v1 only when explicitly set", () => {
    expect(parseDebtScheduleVersion("v1")).toBe("v1");
    expect(parseDebtScheduleVersion("1")).toBe("v1");
    expect(isDebtScheduleV2("v1")).toBe(false);
  });

  it("accepts v2 aliases", () => {
    expect(parseDebtScheduleVersion("v2")).toBe("v2");
    expect(parseDebtScheduleVersion("V2")).toBe("v2");
    expect(parseDebtScheduleVersion("2")).toBe("v2");
    expect(isDebtScheduleV2("v2")).toBe(true);
  });
});
