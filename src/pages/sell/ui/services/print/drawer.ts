import { safeLsGet, safeLsSet } from "./storage";

export const DEFAULT_DRAWER_CMD = "27, 112, 0, 25, 250";
export const DRAWER_ENABLED_KEY = "escpos_drawer_enabled";
export const DRAWER_WHEN_KEY = "escpos_drawer_when";
export const DRAWER_CMD_KEY = "escpos_drawer_cmd";

export type DrawerWhen = "before" | "after";

export type DrawerSettings = {
  enabled: boolean;
  when: DrawerWhen;
  command: string;
  bytes: number[];
};

export function parseEscPosCommand(raw: unknown): number[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  const parts = text.split(/[\s,;]+/).filter(Boolean);
  const bytes: number[] = [];

  for (const part of parts) {
    const token = part.trim().toLowerCase();
    if (!token) continue;

    let value: number;
    if (token.startsWith("0x")) {
      value = Number.parseInt(token.slice(2), 16);
    } else {
      value = Number(token);
    }

    if (!Number.isFinite(value)) {
      throw new Error(`Некорректный байт: ${part}`);
    }
    const byte = Math.trunc(value);
    if (byte < 0 || byte > 255) {
      throw new Error(`Байт вне диапазона 0–255: ${part}`);
    }
    bytes.push(byte);
  }

  if (bytes.length === 0) {
    throw new Error("Команда ESC/POS не должна быть пустой");
  }

  return bytes;
}

export function getDrawerSettings(): DrawerSettings {
  const enabled = safeLsGet(DRAWER_ENABLED_KEY) === "1";
  const whenRaw = safeLsGet(DRAWER_WHEN_KEY);
  const when: DrawerWhen = whenRaw === "before" ? "before" : "after";
  const command = safeLsGet(DRAWER_CMD_KEY) || DEFAULT_DRAWER_CMD;
  let bytes: number[] = [];
  try {
    bytes = parseEscPosCommand(command);
  } catch {
    bytes = parseEscPosCommand(DEFAULT_DRAWER_CMD);
  }
  return { enabled, when, command, bytes };
}

export function saveDrawerSettings(next: {
  enabled: boolean;
  when: DrawerWhen;
  command: string;
}): DrawerSettings {
  const bytes = parseEscPosCommand(next.command);
  safeLsSet(DRAWER_ENABLED_KEY, next.enabled ? "1" : "0");
  safeLsSet(DRAWER_WHEN_KEY, next.when === "before" ? "before" : "after");
  safeLsSet(DRAWER_CMD_KEY, next.command.trim() || DEFAULT_DRAWER_CMD);
  return {
    enabled: next.enabled,
    when: next.when === "before" ? "before" : "after",
    command: next.command.trim() || DEFAULT_DRAWER_CMD,
    bytes,
  };
}
