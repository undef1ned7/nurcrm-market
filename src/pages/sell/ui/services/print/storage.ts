
export const safeLsGet = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export const safeLsSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch { }
};

export const safeNumber = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const safeByte = (raw, fallback) => {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  if (!s) return fallback;
  const n = Number(s);
  if (!Number.isFinite(n)) return fallback;
  const b = Math.trunc(n);
  return b >= 0 && b <= 255 ? b : fallback;
};

export function hasEscposWidthSettings() {
  return safeLsGet("escpos_dpl") != null || safeLsGet("escpos_cpl") != null;
}

export function setEscposDotsPerLine(n) {
  safeLsSet("escpos_dpl", String(n));
}

export function setEscposCharsPerLine(n) {
  safeLsSet("escpos_cpl", String(n));
}

export function setEscposLineHeight(n) {
  safeLsSet("escpos_line", String(n));
}

export function setEscposFont(ch) {
  safeLsSet("escpos_font", String(ch).toUpperCase());
}

export function setEscposCodepage(n) {
  safeLsSet("escpos_cp", String(n));
}

export type ReceiptPrintMode = "graphic" | "text";

const RECEIPT_MODE_KEY = "escpos_receipt_mode";

/** По умолчанию graphic — canvas → GS v 0 (стабильная кириллица). */
export function getReceiptPrintMode(): ReceiptPrintMode {
  const raw = String(safeLsGet(RECEIPT_MODE_KEY) || "graphic").trim().toLowerCase();
  return raw === "text" ? "text" : "graphic";
}

export function setEscposReceiptMode(mode: ReceiptPrintMode) {
  safeLsSet(RECEIPT_MODE_KEY, mode === "text" ? "text" : "graphic");
}

export function isGraphicReceiptMode(): boolean {
  return getReceiptPrintMode() !== "text";
}

/** Все ключи ESC/POS + ящика, которые живут только в этом браузере. */
export const ESCPOS_SETTING_KEYS = [
  "escpos_vid",
  "escpos_pid",
  "escpos_serial",
  "escpos_product",
  "escpos_manufacturer",
  "escpos_dpl",
  "escpos_cpl",
  "escpos_font",
  "escpos_line",
  "escpos_cp",
  "escpos_receipt_mode",
  "escpos_drawer_enabled",
  "escpos_drawer_when",
  "escpos_drawer_cmd",
] as const;

export type EscposSettingKey = (typeof ESCPOS_SETTING_KEYS)[number];

export type EscposSettingsExport = {
  version: 1;
  exportedAt: string;
  settings: Partial<Record<EscposSettingKey, string>>;
};

const KEY_SET = new Set<string>(ESCPOS_SETTING_KEYS);

export function exportEscposSettings(): EscposSettingsExport {
  const settings: Partial<Record<EscposSettingKey, string>> = {};
  for (const key of ESCPOS_SETTING_KEYS) {
    const value = safeLsGet(key);
    if (value != null) settings[key] = value;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  };
}

function collectEscposKeyValues(source: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (!KEY_SET.has(key)) continue;
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

export function parseEscposSettingsImport(raw: unknown): Record<string, string> {
  if (raw == null) {
    throw new Error("Пустой файл настроек принтера");
  }
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("Некорректный JSON настроек принтера");
    }
  }
  if (typeof data !== "object") {
    throw new Error("Некорректный формат настроек принтера");
  }
  const obj = data as Record<string, unknown>;
  const nested =
    obj.settings && typeof obj.settings === "object"
      ? collectEscposKeyValues(obj.settings as Record<string, unknown>)
      : {};
  const flat = collectEscposKeyValues(obj);
  const settings = { ...flat, ...nested };
  if (Object.keys(settings).length === 0) {
    throw new Error("В файле нет ключей escpos_*");
  }
  return settings;
}

export function importEscposSettings(raw: unknown): { applied: string[] } {
  const settings = parseEscposSettingsImport(raw);
  const applied: string[] = [];
  for (const [key, value] of Object.entries(settings)) {
    safeLsSet(key, value);
    applied.push(key);
  }
  return { applied };
}
