
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
