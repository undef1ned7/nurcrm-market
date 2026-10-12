/**
 * Кодовые страницы и энкодеры ESC/POS.
 * Поддерживаемые кодовые страницы для кириллицы:
 * 73 — CP1251 (часто встречается у Xprinter) - по умолчанию
 * 66 — PC866 (часто встречается у Xprinter по self-test)
 * 17 — PC866 (часто стандартный номер таблицы в ESC/POS)
 * 59 — PC866(Russian) - альтернативный вариант для русской кириллицы
 * 18 — PC852 (Latin2, также поддерживает PC866)
 * 22 — CP1251 (альтернативный код)
 * ====== ЖЁСТКАЯ НАСТРОЙКА ДЛЯ XP-N160II: PC866 ======
 * Важно: у части Xprinter (в т.ч. XP-N160II) PC866 на ESC/POS бывает как 17 или 66.
 * Если будет "корябяза", поменяйте 17 <-> 66.
 */

import {
  hasEscposWidthSettings,
  safeByte,
  safeLsGet,
  safeNumber,
} from "./storage";

const DEFAULT_DOTS_PER_LINE = 576; // 80 мм печать (~576 точек при 203 dpi)
/** 48 мм зона печати на рулоне ~58 мм (203 dpi → 384 точки). */
export const PRINT_WIDTH_48MM_DPL = 384;
export const PRINT_WIDTH_48MM_CHARS_B = 42; // font B: 384 / 9
const MARKET_DEFAULT_DOTS_PER_LINE = PRINT_WIDTH_48MM_DPL;
const MARKET_DEFAULT_CHARS_PER_LINE = PRINT_WIDTH_48MM_CHARS_B;
const DEFAULT_FONT = "B";
const DEFAULT_CODEPAGE = 17; // PC866 (часто 17 или 66)

const PC866_CODES = new Set([66, 17, 18, 59]); // 17 — частый ESC/POS номер PC866, 59 — PC866(Russian)
const CP1251_CODES = new Set([73, 22]);
const PC936_CODES = new Set([255]);

function encodeCP1251(s: any = "") {
  const out: any[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c <= 0x7f) out.push(c);
    else if (c === 0x0401) out.push(0xa8);
    else if (c === 0x0451) out.push(0xb8);
    else if (c >= 0x0410 && c <= 0x042f) out.push(0xc0 + (c - 0x0410));
    else if (c >= 0x0430 && c <= 0x044f) out.push(0xe0 + (c - 0x0430));
    else if (c === 0x2116) out.push(0xb9);
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

function encodePC866(s: any = "") {
  const out: any[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c <= 0x7f) out.push(c);
    else if (c >= 0x0410 && c <= 0x042f) out.push(0x80 + (c - 0x0410));
    // PC866: строчные а..п идут 0xA0..0xAF, а р..я идут 0xE0..0xEF
    else if (c >= 0x0430 && c <= 0x043f) out.push(0xa0 + (c - 0x0430));
    else if (c >= 0x0440 && c <= 0x044f) out.push(0xe0 + (c - 0x0440));
    else if (c === 0x0401) out.push(0xf0);
    else if (c === 0x0451) out.push(0xf1);
    else if (c === 0x2116) out.push(0xfc);
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

function encodePC936(s: any = "") {
  const out: any[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c <= 0x7f) out.push(c);
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

export const getEncoder = (n: any) =>
  PC866_CODES.has(n)
    ? encodePC866
    : CP1251_CODES.has(n)
      ? encodeCP1251
      : PC936_CODES.has(n)
        ? encodePC936
        : encodeCP1251;

export function getEscposRuntimeConfig(opts: any = {}) {
  const useMarketDefault = Boolean(opts.marketDefault) && !hasEscposWidthSettings();
  const fontRaw = String(safeLsGet("escpos_font") || DEFAULT_FONT).toUpperCase();
  const font = fontRaw === "A" ? "A" : "B";
  const charDotWidth = font === "B" ? 9 : 12;

  const fallbackDots = useMarketDefault
    ? MARKET_DEFAULT_DOTS_PER_LINE
    : DEFAULT_DOTS_PER_LINE;
  const dotsPerLine = safeNumber(safeLsGet("escpos_dpl"), fallbackDots);
  const fallbackChars = useMarketDefault
    ? MARKET_DEFAULT_CHARS_PER_LINE
    : Math.floor(dotsPerLine / charDotWidth);
  const charsPerLine = safeNumber(safeLsGet("escpos_cpl"), fallbackChars);
  const lineDotHeight = safeNumber(
    safeLsGet("escpos_line"),
    font === "B" ? 22 : 24
  );
  const codepage = safeByte(safeLsGet("escpos_cp"), DEFAULT_CODEPAGE);
  const encoder = getEncoder(codepage);

  return {
    font,
    charDotWidth,
    dotsPerLine,
    charsPerLine,
    lineDotHeight,
    codepage,
    encoder,
  };
}