import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_DRAWER_CMD,
  getDrawerSettings,
  parseEscPosCommand,
  buildDrawerKickPayload,
  buildDrawerKickInline,
  prependDrawerKickAfterInit,
  appendDrawerKick,
  saveDrawerSettings,
  DRAWER_ENABLED_KEY,
} from "./drawer";

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

describe("buildDrawerKickPayload", () => {
  it("wraps kick with ESC @ init and line feed", () => {
    expect(buildDrawerKickPayload([27, 112, 0, 25, 250])).toEqual(
      new Uint8Array([0x1b, 0x40, 27, 112, 0, 25, 250, 0x0a]),
    );
  });
});

describe("buildDrawerKickInline", () => {
  it("returns only ESC p bytes", () => {
    expect(buildDrawerKickInline([27, 112, 0, 25, 250])).toEqual(
      new Uint8Array([27, 112, 0, 25, 250]),
    );
  });
});

describe("prependDrawerKickAfterInit", () => {
  it("inserts kick after ESC @", () => {
    const receipt = new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x00]);
    expect(prependDrawerKickAfterInit(receipt, [27, 112, 0, 25, 250])).toEqual(
      new Uint8Array([0x1b, 0x40, 27, 112, 0, 25, 250, 0x1b, 0x61, 0x00]),
    );
  });
});

describe("appendDrawerKick", () => {
  it("appends kick to buffer end", () => {
    const receipt = new Uint8Array([0x1d, 0x56, 0x00]);
    expect(appendDrawerKick(receipt, [27, 112, 0, 25, 250])).toEqual(
      new Uint8Array([0x1d, 0x56, 0x00, 27, 112, 0, 25, 250]),
    );
  });
});

describe("getDrawerSettings", () => {
  const memory: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(memory)) delete memory[key];
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory[key] ?? null,
      setItem: (key: string, value: string) => {
        memory[key] = String(value);
      },
      removeItem: (key: string) => {
        delete memory[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults drawer to enabled and after print", () => {
    expect(getDrawerSettings()).toMatchObject({
      enabled: true,
      when: "after",
    });
  });

  it("persists disabled state", () => {
    saveDrawerSettings({
      enabled: false,
      when: "after",
      command: DEFAULT_DRAWER_CMD,
    });
    expect(getDrawerSettings().enabled).toBe(false);
    expect(memory[DRAWER_ENABLED_KEY]).toBe("0");
  });
});
