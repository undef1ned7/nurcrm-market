import { describe, it, expect } from "vitest";
import {
  normalizeAmount,
  isValidProposedChange,
  hasProposedDiff,
  buildEditRequestPayload,
  buildCancelRequestPayload,
} from "./cashFlowChangeRequest";

describe("normalizeAmount", () => {
  it("normalizes separators and spaces", () => {
    expect(normalizeAmount(" 1 200,50 ")).toBe("1200.5");
    expect(normalizeAmount("800.00")).toBe("800");
  });
  it("returns empty for non-numeric", () => {
    expect(normalizeAmount("abc")).toBe("");
    expect(normalizeAmount("")).toBe("");
  });
});

describe("isValidProposedChange", () => {
  it("requires positive amount, known type, non-empty name", () => {
    expect(isValidProposedChange({ name: "x", amount: "10", type: "income" })).toBe(true);
    expect(isValidProposedChange({ name: "x", amount: "0", type: "income" })).toBe(false);
    expect(isValidProposedChange({ name: "x", amount: "-1", type: "expense" })).toBe(false);
    expect(isValidProposedChange({ name: "", amount: "10", type: "expense" })).toBe(false);
    expect(isValidProposedChange({ name: "x", amount: "10", type: "foo" as any })).toBe(false);
  });
});

describe("hasProposedDiff", () => {
  const current = { name: "Вода", amount: "1000.00", type: "expense" as const };
  it("false when nothing changed (ignoring format)", () => {
    expect(hasProposedDiff(current, { name: "Вода", amount: "1000", type: "expense" })).toBe(false);
  });
  it("true when a field changed", () => {
    expect(hasProposedDiff(current, { name: "Вода", amount: "820", type: "expense" })).toBe(true);
    expect(hasProposedDiff(current, { name: "Вода", amount: "1000", type: "income" })).toBe(true);
  });
});

describe("payload builders", () => {
  it("edit payload carries normalized proposed + stable idempotency key", () => {
    const a = buildEditRequestPayload("flow-1", { name: " Вода ", amount: "820,00", type: "expense" }, " ошибка ");
    const b = buildEditRequestPayload("flow-1", { name: "Вода", amount: "820", type: "expense" }, "ошибка");
    expect(a.proposed).toEqual({ name: "Вода", amount: "820", type: "expense" });
    expect(a.reason).toBe("ошибка");
    expect(a.idempotency_key).toBe(b.idempotency_key);
    expect(a.idempotency_key).toContain("cfedit-flow-1-");
  });
  it("cancel payload key depends only on target id", () => {
    expect(buildCancelRequestPayload("flow-9", "dup").idempotency_key).toBe("cfcancel-flow-9");
  });
});
