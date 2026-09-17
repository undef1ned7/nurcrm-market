import { describe, expect, it } from "vitest";
import {
  extractShiftRealtimeEvent,
  isShiftRealtimeEventType,
} from "./shiftRealtimeEvent";

describe("isShiftRealtimeEventType", () => {
  it("recognizes market.shift.updated and generic shift.*.updated", () => {
    expect(isShiftRealtimeEventType("market.shift.updated")).toBe(true);
    expect(isShiftRealtimeEventType("shift.drawer.updated")).toBe(true);
  });

  it("rejects unrelated types", () => {
    expect(isShiftRealtimeEventType("market.shift.opened")).toBe(false);
    expect(isShiftRealtimeEventType("market.shift.closed")).toBe(false);
    expect(isShiftRealtimeEventType("market.cashflow.updated")).toBe(false);
  });
});

describe("extractShiftRealtimeEvent", () => {
  it("reads documented snake_case fields", () => {
    expect(
      extractShiftRealtimeEvent({
        shift_id: "84abf50b",
        drawer_expected_cash: "1300.00",
        cash_sales_total: "300.00",
      }),
    ).toEqual({
      shiftId: "84abf50b",
      drawerExpectedCash: "1300.00",
      cashSalesTotal: "300.00",
    });
  });

  it("falls back to null on missing / malformed payload", () => {
    expect(extractShiftRealtimeEvent(null)).toEqual({
      shiftId: null,
      drawerExpectedCash: null,
      cashSalesTotal: null,
    });
  });
});
