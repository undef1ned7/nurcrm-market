/** Encoding: CP866 / CP1251 / PC936 (GBK) */

import { getXp365bCodepage } from "./settings";

function encodeCP866(str = "") {
  const out: number[] = [];
  for (const ch of String(str)) {
    const c = ch.codePointAt(0)!;
    if (c <= 0x7f) out.push(c);
    else if (c >= 0x0410 && c <= 0x042f) out.push(0x80 + (c - 0x0410)); // А-Я
    else if (c >= 0x0430 && c <= 0x043f) out.push(0xa0 + (c - 0x0430)); // а-п
    else if (c >= 0x0440 && c <= 0x044f) out.push(0xe0 + (c - 0x0440)); // р-я
    else if (c === 0x0401) out.push(0xf0); // Ё
    else if (c === 0x0451) out.push(0xf1); // ё
    else if (c === 0x2116) out.push(0xfc); // №
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

function encodeCP1251(str = "") {
  const out: number[] = [];
  for (const ch of String(str)) {
    const c = ch.codePointAt(0)!;
    if (c <= 0x7f) out.push(c);
    else if (c === 0x0401) out.push(0xa8); // Ё
    else if (c === 0x0451) out.push(0xb8); // ё
    else if (c >= 0x0410 && c <= 0x042f) out.push(0xc0 + (c - 0x0410)); // А-Я
    else if (c >= 0x0430 && c <= 0x044f) out.push(0xe0 + (c - 0x0430)); // а-я
    else if (c === 0x2116) out.push(0xb9); // №
    else out.push(0x3f);
  }
  return new Uint8Array(out);
}

/**
 * Encode string to GBK (CP936) for browser. Uses native TextEncoder('gbk') when
 * available (e.g. Chrome on Windows), otherwise falls back to ASCII + ? for non-ASCII.
 */
function encodeGBK(str = "") {
  const s = String(str);
  try {
    const enc = new (TextEncoder as any)("gbk");
    return new Uint8Array(enc.encode(s));
  } catch {
    // Fallback: ASCII as-is, other code points as 0x3f (?) for browser compatibility
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      const c = s.codePointAt(i)!;
      out[i] = c <= 0x7f ? c : 0x3f;
    }
    return out;
  }
}

function encodeForPrinter(str = "") {
  const cp = getXp365bCodepage();
  if (cp === 866) return encodeCP866(str);
  if (cp === 936) return encodeGBK(str);
  return encodeCP1251(str);
}


export { encodeForPrinter };
