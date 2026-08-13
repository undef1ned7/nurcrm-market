import { describe, expect, it } from "vitest";
import { DEFAULT_DRAWER_CMD, parseEscPosCommand } from "./drawer";

describe("parseEscPosCommand", () => {
  it("parses default decimal kick command", () => {
    expect(parseEscPosCommand(DEFAULT_DRAWER_CMD)).toEqual([
      27, 112, 0, 25, 250,
    ]);
  });

  it("parses hex bytes", () => {
    expect(parseEscPosCommand("0x1B, 0x70, 0x00, 0x19, 0xFA")).toEqual([
      27, 112, 0, 25, 250,
    ]);
  });

  it("rejects values outside 0–255", () => {
    expect(() => parseEscPosCommand("27, 300")).toThrow(/0–255/);
  });

  it("rejects empty command", () => {
    expect(() => parseEscPosCommand("  ,  ")).toThrow(/пустой/);
  });
});
