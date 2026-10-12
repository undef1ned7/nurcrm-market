import { describe, expect, it } from "vitest";
import { computeAbc, summarizeAbc } from "./abc";

const item = (name: string, value: number) => ({ id: name, name, value });

describe("computeAbc", () => {
  it("сортирует по убыванию и считает нарастающий итог", () => {
    const rows = computeAbc([item("b", 10), item("a", 90)]);
    expect(rows.map((r) => r.name)).toEqual(["a", "b"]);
    expect(rows[0].cumShare).toBeCloseTo(90);
    expect(rows[1].cumShare).toBeCloseTo(100);
  });

  it("товар, пересекающий 80%, остаётся в A", () => {
    const rows = computeAbc([item("big", 96.8), item("x", 2), item("y", 1.2)]);
    expect(rows[0].abcClass).toBe("A");
    expect(rows[1].abcClass).toBe("C");
  });

  it("делит на A/B/C по границам 80/95", () => {
    const rows = computeAbc([
      item("p1", 50),
      item("p2", 30),
      item("p3", 10),
      item("p4", 5),
      item("p5", 5),
    ]);
    expect(rows.map((r) => r.abcClass)).toEqual(["A", "A", "B", "B", "C"]);
  });

  it("отрицательные и нулевые значения — в C и не влияют на базу", () => {
    const rows = computeAbc([item("a", 100), item("loss", -50), item("z", 0)]);
    expect(rows[0].share).toBeCloseTo(100);
    expect(rows.find((r) => r.name === "loss")?.abcClass).toBe("C");
    expect(rows.find((r) => r.name === "z")?.abcClass).toBe("C");
  });

  it("пустой список и нулевой итог не падают", () => {
    expect(computeAbc([])).toEqual([]);
    const rows = computeAbc([item("a", 0)]);
    expect(rows[0].abcClass).toBe("C");
    expect(rows[0].share).toBe(0);
  });
});

describe("summarizeAbc", () => {
  it("суммирует позиции, значения и доли по группам", () => {
    const rows = computeAbc([item("a", 80), item("b", 15), item("c", 5)]);
    const s = summarizeAbc(rows);
    expect(s.A.count).toBe(1);
    expect(s.B.count).toBe(1);
    expect(s.C.count).toBe(1);
    expect(s.A.share + s.B.share + s.C.share).toBeCloseTo(100);
    expect(s.A.value).toBe(80);
  });
});
