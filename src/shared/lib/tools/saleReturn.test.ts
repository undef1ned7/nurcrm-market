import { describe, expect, it } from "vitest";
import {
  buildSaleReturnPayload,
  buildSaleReturnSignature,
  isReturnableSaleStatus,
  normalizeSaleStatus,
} from "./saleReturn";

describe("normalizeSaleStatus / isReturnableSaleStatus", () => {
  it("maps localized statuses to slugs", () => {
    expect(normalizeSaleStatus("Оплачен")).toBe("paid");
    expect(normalizeSaleStatus("в долг")).toBe("debt");
    expect(normalizeSaleStatus("Отменён")).toBe("canceled");
  });

  it("recognizes the backend partially_returned status and variants", () => {
    expect(normalizeSaleStatus("partially_returned")).toBe("partially_returned");
    expect(normalizeSaleStatus("PARTIALLY_RETURNED")).toBe("partially_returned");
    expect(normalizeSaleStatus("partial_return")).toBe("partially_returned");
    expect(normalizeSaleStatus("частично возвращён")).toBe("partially_returned");
  });

  it("allows return for paid / debt / partially returned sales", () => {
    expect(isReturnableSaleStatus("paid")).toBe(true);
    expect(isReturnableSaleStatus("debt")).toBe(true);
    expect(isReturnableSaleStatus("partially_returned")).toBe(true);
    expect(isReturnableSaleStatus("canceled")).toBe(false);
    expect(isReturnableSaleStatus("new")).toBe(false);
  });
});

describe("buildSaleReturnSignature", () => {
  it("uses a :full marker when no items are passed", () => {
    expect(buildSaleReturnSignature("s1")).toBe("s1:full");
    expect(buildSaleReturnSignature("s1", [])).toBe("s1:full");
  });

  it("is stable regardless of item order", () => {
    const a = buildSaleReturnSignature("s1", [
      { sale_item_id: "b", quantity: 2 },
      { sale_item_id: "a", quantity: 1 },
    ]);
    const b = buildSaleReturnSignature("s1", [
      { sale_item_id: "a", quantity: 1 },
      { sale_item_id: "b", quantity: 2 },
    ]);
    expect(a).toBe(b);
  });

  it("differs when quantity or sale changes", () => {
    const base = buildSaleReturnSignature("s1", [
      { sale_item_id: "a", quantity: 1 },
    ]);
    expect(base).not.toBe(
      buildSaleReturnSignature("s1", [{ sale_item_id: "a", quantity: 2 }]),
    );
    expect(base).not.toBe(
      buildSaleReturnSignature("s2", [{ sale_item_id: "a", quantity: 1 }]),
    );
    expect(base).not.toBe(buildSaleReturnSignature("s1"));
  });
});

describe("buildSaleReturnPayload", () => {
  it("always carries an idempotency_key and reuses the provided one", () => {
    const payload = buildSaleReturnPayload({ idempotencyKey: "key-1" });
    expect(payload.idempotency_key).toBe("key-1");
  });

  it("generates an idempotency_key when none is given", () => {
    const payload = buildSaleReturnPayload({});
    expect(typeof payload.idempotency_key).toBe("string");
    expect(payload.idempotency_key.length).toBeGreaterThan(10);
  });

  it("attaches POS routing for non-agent returns", () => {
    const payload = buildSaleReturnPayload({
      routing: {
        branch_id: "br-1",
        cashbox_role: "pos_branch",
        shift_id: "sh-1",
      },
    });
    expect(payload.branch_id).toBe("br-1");
    expect(payload.cashbox_role).toBe("pos_branch");
    expect(payload.shift_id).toBe("sh-1");
  });

  it("omits routing for agent returns", () => {
    const payload = buildSaleReturnPayload({
      isAgent: true,
      routing: { branch_id: "br-1", cashbox_role: "pos_branch" },
    });
    expect(payload.branch_id).toBeUndefined();
    expect(payload.cashbox_role).toBeUndefined();
  });

  it("skips blank routing values", () => {
    const payload = buildSaleReturnPayload({
      routing: { branch_id: "", cashbox_role: "pos_main", shift_id: "  " },
    });
    expect(payload).not.toHaveProperty("branch_id");
    expect(payload).not.toHaveProperty("shift_id");
    expect(payload.cashbox_role).toBe("pos_main");
  });

  it("includes items only for partial returns", () => {
    expect(buildSaleReturnPayload({}).items).toBeUndefined();
    expect(buildSaleReturnPayload({ items: [] }).items).toBeUndefined();
    const partial = buildSaleReturnPayload({
      items: [{ sale_item_id: "a", quantity: 1 }],
    });
    expect(partial.items).toEqual([{ sale_item_id: "a", quantity: 1 }]);
  });

  it("passes is_defect only when explicitly true", () => {
    expect(buildSaleReturnPayload({}).is_defect).toBeUndefined();
    expect(buildSaleReturnPayload({ is_defect: false }).is_defect).toBeUndefined();
    expect(buildSaleReturnPayload({ is_defect: true }).is_defect).toBe(true);
  });
});
