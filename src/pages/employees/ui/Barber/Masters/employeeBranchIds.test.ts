import { describe, expect, it } from "vitest";
import { employeeBranchIds } from "./masters.utils";

describe("employeeBranchIds", () => {
  it("читает массив id, объекты и одиночное поле", () => {
    expect(employeeBranchIds({ branches: ["a", { id: "b" }] })).toEqual(["a", "b"]);
    expect(employeeBranchIds({ branch_ids: ["c"] })).toEqual(["c"]);
    expect(employeeBranchIds({ branch: "d" })).toEqual(["d"]);
    expect(employeeBranchIds({})).toEqual([]);
  });
});
