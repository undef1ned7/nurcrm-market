import { safeLsGet, safeLsSet } from "./storage";

export const DEFAULT_DRAWER_CMD = "27, 112, 0, 25, 250";
export const DRAWER_ENABLED_KEY = "escpos_drawer_enabled";
export const DRAWER_WHEN_KEY = "escpos_drawer_when";
export const DRAWER_CMD_KEY = "escpos_drawer_cmd";

export type DrawerWhen = "before" | "after";
export type DrawerAt = "start" | "end";

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
  const enabledRaw = safeLsGet(DRAWER_ENABLED_KEY);
  const enabled = enabledRaw == null ? true : enabledRaw === "1";
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

function resolveDrawerKickBytes(bytes?: number[]): number[] {
  if (Array.isArray(bytes) && bytes.length > 0) {
    return parseEscPosCommand(bytes.join(","));
  }
  return parseEscPosCommand(DEFAULT_DRAWER_CMD);
}

/** Только ESC p m t1 t2 — для встраивания в поток печати чека. */
export function buildDrawerKickInline(bytes?: number[]): Uint8Array {
  return new Uint8Array(resolveDrawerKickBytes(bytes));
}

/** ESC @ + kick + LF — одним пакетом для отдельного теста ящика. */
export function buildDrawerKickPayload(bytes: number[]): Uint8Array {
  const validated = resolveDrawerKickBytes(bytes);
  const payload = new Uint8Array(2 + validated.length + 1);
  payload[0] = 0x1b;
  payload[1] = 0x40;
  payload.set(validated, 2);
  payload[payload.length - 1] = 0x0a;
  return payload;
}

export function prependDrawerKickAfterInit(
  target: Uint8Array,
  bytes?: number[],
): Uint8Array {
  const kick = buildDrawerKickInline(bytes);
  if (target.length >= 2 && target[0] === 0x1b && target[1] === 0x40) {
    const out = new Uint8Array(target.length + kick.length);
    out.set(target.subarray(0, 2), 0);
    out.set(kick, 2);
    out.set(target.subarray(2), 2 + kick.length);
    return out;
  }
  const out = new Uint8Array(kick.length + target.length);
  out.set(kick, 0);
  out.set(target, kick.length);
  return out;
}

export function appendDrawerKick(
  target: Uint8Array,
  bytes?: number[],
): Uint8Array {
  const kick = buildDrawerKickInline(bytes);
  const out = new Uint8Array(target.length + kick.length);
  out.set(target, 0);
  out.set(kick, target.length);
  return out;
}

export function applyDrawerToEscPosBuffer(
  target: Uint8Array,
  drawerAt: DrawerAt | undefined,
  bytes?: number[],
): Uint8Array {
  if (!drawerAt) return target;
  if (drawerAt === "start") return prependDrawerKickAfterInit(target, bytes);
  return appendDrawerKick(target, bytes);
}

/** Вставляет kick после ESC @ (start) или в конец последнего чанка (end). */
export function applyDrawerToChunks(
  chunks: Uint8Array[],
  drawerAt: DrawerAt | undefined,
  bytes?: number[],
): Uint8Array[] {
  if (!drawerAt || chunks.length === 0) return chunks;
  const kick = buildDrawerKickInline(bytes);
  if (drawerAt === "start") {
    const next = [...chunks];
    const insertAt =
      next[0]?.length >= 2 && next[0][0] === 0x1b && next[0][1] === 0x40 ? 1 : 0;
    next.splice(insertAt, 0, kick);
    return next;
  }
  const next = [...chunks];
  const last = next[next.length - 1];
  const merged = new Uint8Array(last.length + kick.length);
  merged.set(last, 0);
  merged.set(kick, last.length);
  next[next.length - 1] = merged;
  return next;
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
