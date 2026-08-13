import { describe, expect, it } from "vitest";
import { isMissingLayoutEndpoint } from "./api";

describe("product form layout api", () => {
  it("treats missing CRUD methods as absent endpoint", () => {
    expect(isMissingLayoutEndpoint({ response: { status: 404 } })).toBe(true);
    expect(isMissingLayoutEndpoint({ response: { status: 405 } })).toBe(true);
    expect(isMissingLayoutEndpoint({ response: { status: 501 } })).toBe(true);
    expect(isMissingLayoutEndpoint({ response: { status: 500 } })).toBe(false);
    expect(isMissingLayoutEndpoint({})).toBe(false);
  });
});
