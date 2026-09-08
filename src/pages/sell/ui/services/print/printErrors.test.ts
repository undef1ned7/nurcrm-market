import { describe, expect, it } from "vitest";
import { isOpaquePrintPayload, isPrintFormatError } from "./printErrors";

describe("printErrors", () => {
  it("detects opaque payloads", () => {
    expect(isOpaquePrintPayload(new Blob())).toBe(true);
    expect(isOpaquePrintPayload(new ArrayBuffer(8))).toBe(true);
    expect(isOpaquePrintPayload(new Uint8Array(4))).toBe(true);
    expect(isOpaquePrintPayload({ items: [] })).toBe(false);
  });

  it("detects format errors", () => {
    expect(isPrintFormatError(new Error("Неизвестный формат ответа для печати"))).toBe(
      true,
    );
    expect(isPrintFormatError(new Error("Принтер не подключен"))).toBe(false);
  });
});
