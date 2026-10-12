import { describe, expect, it } from "vitest";
import reducer from "./shiftSlice";
import { fetchShiftsAsync } from "./shiftThunk";

const fulfilled = (payload: unknown) => reducer(undefined, { type: fetchShiftsAsync.fulfilled.type, payload });

describe("shiftSlice: список смен всегда массив", () => {
  it.each([
    [null, 0],
    [{ results: null }, 0],
    [{ results: { a: 1 } }, 0], // раньше объект попадал в shifts и ронял список
    [{ results: "x" }, 0],
    [{ results: [null, { id: 1 }] }, 1],
    [[{ id: 1 }, { id: 2 }], 2],
  ])("%j → %i смен", (payload, len) => {
    const s = fulfilled(payload);
    expect(Array.isArray(s.shifts)).toBe(true);
    expect(s.shifts).toHaveLength(len);
  });

  it("count берётся из ответа, мусор — по длине списка", () => {
    expect(fulfilled({ count: 250, results: [{ id: 1 }] }).shiftsCount).toBe(250);
    expect(fulfilled({ count: "abc", results: [{ id: 1 }] }).shiftsCount).toBe(1);
  });
});
