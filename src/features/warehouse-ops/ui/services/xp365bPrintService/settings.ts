/** XP-365B localStorage settings */

export const LS_CODEPAGE = "xp365b_codepage"; // "WPC1251" | "1251" | "866" | "936"
export const LS_ORIENTATION = "xp365b_orientation"; // "normal" | "rotated"
export const LS_RENDER_MODE = "xp365b_render_mode"; // "raster" | "tspl"
export const RASTER_FONT_FAMILY_LS = "xp365b_raster_font_family";
export const RASTER_INVERT_LS = "xp365b_raster_invert";

export const DEFAULT_CODEPAGE = 1251;
export const DEFAULT_CODEPAGE_TOKEN = "WPC1251";
export const DEFAULT_ORIENTATION = "normal";
export const DEFAULT_RENDER_MODE = "raster";
export const DEFAULT_FONT_ID = "1";

export const DEFAULT_LABEL_PRESET = {
  lineGap: 22,
  gapAfterTitle: 7,
  gapAfterPrice: 4,
  barcodeRaise: 3,
  barcodeHeight: 44,
  barcodeBarWidth: 2,
};

function normalizeCodepage(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_CODEPAGE;
  if (/^wpc\s*1251$/i.test(raw)) return 1251;
  if (/^cp\s*1251$/i.test(raw)) return 1251;
  if (/^1251$/i.test(raw)) return 1251;
  if (/^866$/i.test(raw)) return 866;
  if (/^pc\s*936$/i.test(raw)) return 936;
  if (/^cp\s*936$/i.test(raw)) return 936;
  if (/^936$/i.test(raw)) return 936;
  return DEFAULT_CODEPAGE;
}

export function getXp365bCodepage() {
  try {
    return normalizeCodepage(localStorage.getItem(LS_CODEPAGE));
  } catch {
    return DEFAULT_CODEPAGE;
  }
}

export function setXp365bCodepage(cp) {
  try {
    localStorage.setItem(LS_CODEPAGE, String(cp));
  } catch {}
}

export function getTsplCodepageToken() {
  const cp = getXp365bCodepage();
  if (cp === 1251) return DEFAULT_CODEPAGE_TOKEN;
  if (cp === 866) return "866";
  if (cp === 936) return "936";
  return DEFAULT_CODEPAGE_TOKEN;
}

export function getOrientation() {
  try {
    const v = String(localStorage.getItem(LS_ORIENTATION) || "")
      .trim()
      .toLowerCase();
    return v === "rotated" ? "rotated" : DEFAULT_ORIENTATION;
  } catch {
    return DEFAULT_ORIENTATION;
  }
}

export function setXp365bOrientation(v) {
  try {
    localStorage.setItem(
      LS_ORIENTATION,
      v === "rotated" ? "rotated" : "normal"
    );
  } catch {}
}

export function getRenderMode(requested) {
  if (requested === "raster" || requested === "tspl") return requested;
  try {
    const raw = String(localStorage.getItem(LS_RENDER_MODE) || "")
      .trim()
      .toLowerCase();
    if (raw === "raster" || raw === "tspl") return raw;
  } catch {}
  return DEFAULT_RENDER_MODE;
}

export function setXp365bRenderMode(mode) {
  try {
    localStorage.setItem(LS_RENDER_MODE, mode === "tspl" ? "tspl" : "raster");
  } catch {}
}

export function getRasterFontFamily() {
  try {
    const raw = String(
      localStorage.getItem(RASTER_FONT_FAMILY_LS) || ""
    ).trim();
    return raw || "Arial";
  } catch {
    return "Arial";
  }
}

export function setXp365bRasterFontFamily(name) {
  try {
    localStorage.setItem(RASTER_FONT_FAMILY_LS, String(name || "Arial"));
  } catch {}
}

export function getRasterInvert() {
  try {
    const raw = String(localStorage.getItem(RASTER_INVERT_LS) || "")
      .trim()
      .toLowerCase();
    if (raw === "0" || raw === "false" || raw === "no") return false;
  } catch {}
  return true;
}

export function setXp365bRasterInvert(v) {
  try {
    localStorage.setItem(RASTER_INVERT_LS, v ? "true" : "false");
  } catch {}
}
