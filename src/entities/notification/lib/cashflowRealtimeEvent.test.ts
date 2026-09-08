import { describe, expect, it } from "vitest";
import {
  cashflowRealtimeEventKind,
  extractCashflowRealtimeEvent,
  isCashflowRealtimeEventType,
} from "./cashflowRealtimeEvent";

describe("isCashflowRealtimeEventType", () => {
  it("recognizes the documented market.cashflow.* events", () => {
    expect(isCashflowRealtimeEventType("market.cashflow.updated")).toBe(true);
    expect(isCashflowRealtimeEventType("market.cashflow.deleted")).toBe(true);
    expect(isCashflowRealtimeEventType("market.cashflow.created")).toBe(true);
  });

  it("recognizes generic cashflow.* fallbacks", () => {
    expect(isCashflowRealtimeEventType("cashflow.updated")).toBe(true);
    expect(isCashflowRealtimeEventType("cashflow.deleted")).toBe(true);
  });

  it("rejects unrelated event types", () => {
    expect(isCashflowRealtimeEventType("notification")).toBe(false);
    expect(isCashflowRealtimeEventType("market.shift.updated")).toBe(false);
    expect(isCashflowRealtimeEventType("cashflow.something_else")).toBe(false);
  });
});

describe("cashflowRealtimeEventKind", () => {
  it("maps updated/created/deleted suffixes", () => {
    expect(cashflowRealtimeEventKind("market.cashflow.updated")).toBe("updated");
    expect(cashflowRealtimeEventKind("market.cashflow.created")).toBe("created");
    expect(cashflowRealtimeEventKind("market.cashflow.deleted")).toBe("deleted");
    expect(cashflowRealtimeEventKind("market.cashflow.cancelled")).toBe("deleted");
  });
});

describe("extractCashflowRealtimeEvent", () => {
  it("reads cashbox/flow ids under common field-name aliases", () => {
    expect(
      extractCashflowRealtimeEvent("market.cashflow.updated", {
        cashbox_id: "cb-1",
        cashflow_id: "fl-1",
      }),
    ).toEqual({ kind: "updated", cashboxId: "cb-1", flowId: "fl-1" });

    expect(
      extractCashflowRealtimeEvent("market.cashflow.deleted", {
        cashbox: "cb-2",
        id: "fl-2",
      }),
    ).toEqual({ kind: "deleted", cashboxId: "cb-2", flowId: "fl-2" });
  });

  it("falls back to null when payload is missing or malformed", () => {
    expect(extractCashflowRealtimeEvent("market.cashflow.created", null)).toEqual({
      kind: "created",
      cashboxId: null,
      flowId: null,
    });
  });
});
