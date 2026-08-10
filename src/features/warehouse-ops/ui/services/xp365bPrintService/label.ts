/** TSPL / raster label builders */

import JsBarcode from "jsbarcode";
import { getBarcodePrintEncoding } from "@shared/lib/tools/productBarcode";
import {
  DEFAULT_FONT_ID,
  getOrientation,
  getRasterFontFamily,
  getRasterInvert,
  getTsplCodepageToken,
} from "./settings";

function safeTsplText(s) {
  // TSPL TEXT uses "...", so remove quotes and control chars
  return String(s ?? "")
    .replace(/"/g, "")
    // Strip ASCII control chars that break TSPL TEXT payloads
    // eslint-disable-next-line no-control-regex -- intentional control-char filter
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrice(value) {
  const num = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(num)) return "";
  return Math.round(num).toString();
}

function wrap(text = "", width = 16, maxLines = 2) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const out: any[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= width) line = next;
    else {
      if (line) out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.slice(0, maxLines);
}

function wrapByPixelWidth(ctx, text, maxPx, maxLines = 2) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const out: any[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const width = ctx.measureText(next).width;
    if (width <= maxPx || !line) {
      line = next;
    } else {
      out.push(line);
      line = w;
      if (out.length >= maxLines) break;
    }
  }
  if (line && out.length < maxLines) out.push(line);
  return out.slice(0, maxLines);
}

function drawFullWidthText(
  ctx,
  text,
  x,
  y,
  width,
  fontSize,
  fontFamily,
  fontWeight = "normal",
  boldOffset = 0
) {
  const str = String(text || "");
  if (!str) return;
  let size = Math.max(6, Math.round(fontSize));
  let widths: any[] = [];
  let totalWidth = 0;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    widths = Array.from(str).map((ch) => ctx.measureText(ch).width);
    totalWidth = widths.reduce((s, w) => s + w, 0);
    if (totalWidth <= width || size <= 6) break;
    size = Math.max(6, Math.floor(size * 0.9));
  }

  const gap =
    str.length > 1 ? Math.max(0, (width - totalWidth) / (str.length - 1)) : 0;
  let cursor = x;
  for (let i = 0; i < str.length; i += 1) {
    ctx.fillText(str[i], cursor, y);
    if (boldOffset) ctx.fillText(str[i], cursor + boldOffset, y);
    cursor += widths[i] + gap;
  }
}

/** Возвращает { code, format: "EAN13" | "EAN8" | "CODE128" } */
function normalizeBarcode(raw) {
  return getBarcodePrintEncoding(raw);
}

function buildLabel({
  title,
  barcode,
  price,
  copies = 1,
  widthMm = 30,
  heightMm = 20,
  gapMm = 2,
  fontId = DEFAULT_FONT_ID,
  textScale = 1,
  lineGap = 7,
  gapAfterTitle = 7,
  gapAfterPrice = 4,
  barcodeRaise = 3,
  barcodeHeight = 44,
  barcodeBarWidth = 2,
}) {
  // title === "" — печатать без названия; null/undefined — фолбэк "ТОВАР"
  const t0 = safeTsplText(title ?? "ТОВАР");
  const rawCode = safeTsplText(barcode || "");
  const { code, format: bcType } = normalizeBarcode(rawCode);

  const priceText =
    price !== undefined && price !== null && String(price).trim() !== ""
      ? safeTsplText(`Цена: ${formatPrice(price)} с`)
      : "";

  const font = String(fontId || DEFAULT_FONT_ID);
  const textScaleInt = Math.max(1, Math.round(Number(textScale) || 1));
  const lineGapDots = Math.max(1, Math.round(Number(lineGap) || 7));
  const gapAfterTitleDots = Math.max(0, Math.round(Number(gapAfterTitle) || 0));
  const gapAfterPriceDots = Math.max(0, Math.round(Number(gapAfterPrice) || 0));
  const barcodeRaiseDots = Math.max(0, Math.round(Number(barcodeRaise) || 0));
  const barcodeHeightFactor = 0.8; // slightly taller
  const barcodeHeightDots = Math.max(
    1,
    Math.round((Number(barcodeHeight) || 44) * barcodeHeightFactor)
  );
  const barcodeDensityFactor = 1.1; // slightly thicker
  const barcodeBarWidthDots = Math.max(
    1,
    Math.round((Number(barcodeBarWidth) || 2) * barcodeDensityFactor)
  );
  const fontBaseMap = {
    1: 4,
    2: 5,
    3: 6,
    4: 7,
    5: 8,
  };
  const fontBase = fontBaseMap[Number(font)] ?? 6;
  const charWidth = fontBase * textScaleInt;

  const orientation = getOrientation();
  const w = orientation === "rotated" ? heightMm : widthMm;
  const h = orientation === "rotated" ? widthMm : heightMm;

  const mmToDots = (mm) => Math.max(1, Math.round(Number(mm) * 8)); // 203dpi ~ 8 dots/mm
  const W = mmToDots(w);
  const H = mmToDots(h);
  const shiftX = Math.round(W * 0.05);
  const shiftContentX = -shiftX;
  const sx = (v) => Math.max(0, Math.round(v));

  // safe zone
  const margin = 6;
  const thick = 2;
  const safePad = margin + thick;
  const safeLeft = safePad + shiftContentX;
  const safeTop = safePad;
  const safeW = W - safePad * 2;
  const safeH = H - safePad * 2;

  // dashed border
  const dash = 10;
  const space = 6;
  const leftX = sx(margin + shiftContentX);
  const rightX = sx(W - margin - thick + shiftContentX);
  const topY = margin;
  const botY = H - margin - thick;
  const border: any[] = [];
  for (let x = leftX; x < rightX; x += dash + space) {
    const bw = Math.min(dash, rightX - x);
    border.push(`BAR ${x},${topY},${bw},${thick}`);
    border.push(`BAR ${x},${botY},${bw},${thick}`);
  }
  for (let y = topY; y < botY; y += dash + space) {
    const bh = Math.min(dash, botY - y);
    border.push(`BAR ${leftX},${y},${thick},${bh}`);
    border.push(`BAR ${rightX},${y},${thick},${bh}`);
  }

  const wrapWidth = Math.max(6, Math.round(16 / textScaleInt));
  const lines = t0 ? wrap(t0, wrapWidth, 2) : [];
  const lineCount = lines.filter(Boolean).length;
  const lineWidth = (line) => (line ? line.length * charWidth : 0);

  // TSPL: EAN13/EAN8 как есть, CODE128 → "128"
  const tsplBcType = bcType === "CODE128" ? "128" : bcType;
  // estimate barcode width to center it
  const getBarcodeModuleCount = (value) => {
    const codeValue = String(value || "");
    if (/^\d{13}$/.test(codeValue)) return 95 + 20;
    if (/^\d{8}$/.test(codeValue)) return 67 + 20;
    if (/^\d{12}$/.test(codeValue)) return 95 + 20;
    return 11 * codeValue.length + 55;
  };
  const barcodeModules = getBarcodeModuleCount(code);
  const barcodeWidthDots = Math.round(barcodeModules * barcodeBarWidthDots);

  const textBlockHeight = lineGapDots * lineCount;
  const priceBlockHeight = priceText ? gapAfterTitleDots + lineGapDots : 0;
  const gapToBarcode = priceText ? gapAfterPriceDots : gapAfterTitleDots;
  const barcodeBottomGap = 2;
  const barcodeBlockHeight =
    gapToBarcode + barcodeHeightDots + barcodeBottomGap;
  const contentHeight = textBlockHeight + priceBlockHeight + barcodeBlockHeight;
  const startY = safeTop + Math.max(0, Math.round((safeH - contentHeight) / 2));

  const titleY = startY;
  const desiredPriceY = priceText
    ? titleY + textBlockHeight + gapAfterTitleDots
    : null;
  const desiredBarcodeY =
    titleY +
    textBlockHeight +
    priceBlockHeight +
    gapToBarcode -
    barcodeRaiseDots;

  const maxBarcodeY = safeTop + safeH - barcodeHeightDots - barcodeBottomGap;
  const bcY = Math.min(desiredBarcodeY, maxBarcodeY);

  const maxPriceY = bcY - gapAfterPriceDots - lineGapDots;
  const priceY = priceText ? Math.min(desiredPriceY as any, maxPriceY as any) : null;

  const titleX1 = sx(
    safeLeft + Math.max(0, Math.round((safeW - lineWidth(lines[0])) / 2))
  );
  const titleX2 = sx(
    safeLeft + Math.max(0, Math.round((safeW - lineWidth(lines[1])) / 2))
  );
  const priceX = sx(
    safeLeft + Math.max(0, Math.round((safeW - lineWidth(priceText)) / 2))
  );
  const barcodeShiftX = Math.round(W * 0.03);
  // Barcode centered, then shifted a bit left
  const bcX = sx(
    Math.max(0, Math.round((W - barcodeWidthDots) / 2) - barcodeShiftX)
  );

  const narrow = barcodeBarWidthDots;
  const wide = barcodeBarWidthDots;
  const copiesInt = Math.max(1, Math.min(100, Math.round(Number(copies) || 1)));

  return [
    `SIZE ${w} mm,${h} mm`,
    `GAP ${gapMm} mm,0 mm`,
    "SPEED 4",
    "DENSITY 6",
    "DIRECTION 1",
    "REFERENCE 0,0",
    "OFFSET 0",
    "CLS",
    `CODEPAGE ${getTsplCodepageToken()}`,
    ...border,
    lines[0]
      ? `TEXT ${titleX1},${titleY},"${font}",0,${textScaleInt},${textScaleInt},"${lines[0]}"`
      : "",
    lines[1]
      ? `TEXT ${titleX2},${
          titleY + lineGapDots
        },"${font}",0,${textScaleInt},${textScaleInt},"${lines[1]}"`
      : "",
    priceText && priceY != null
      ? `TEXT ${priceX},${priceY},"${font}",0,${textScaleInt},${textScaleInt},"${priceText}"`
      : "",
    priceText && priceY != null
      ? `TEXT ${
          priceX + 1
        },${priceY},"${font}",0,${textScaleInt},${textScaleInt},"${priceText}"`
      : "",
    `BARCODE ${bcX},${bcY},"${tsplBcType}",${barcodeHeightDots},1,0,${narrow},${wide},"${code}"`,
    `PRINT ${copiesInt}`,
    "\r\n",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function bytesFromAscii(str) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

function canvasToMonoRaster(canvas, threshold = 180, invert = false) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as any;
  const img = ctx.getImageData(0, 0, w, h).data;
  const bytesPerLine = Math.ceil(w / 8);
  const raster = new Uint8Array(bytesPerLine * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const r = img[i];
      const g = img[i + 1];
      const b = img[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum < threshold) {
        raster[y * bytesPerLine + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  if (invert) {
    for (let i = 0; i < raster.length; i += 1) {
      raster[i] = ~raster[i] & 0xff;
    }
  }
  return { raster, bytesPerLine, width: w, height: h };
}

async function buildRasterLabelBytes({
  title,
  barcode,
  price,
  copies = 1,
  widthMm = 30,
  heightMm = 20,
  gapMm = 2,
  textScale = 1,
  lineGap = 7,
  gapAfterTitle = 7,
  gapAfterPrice = 4,
  barcodeRaise = 3,
  barcodeHeight = 44,
  barcodeBarWidth = 2,
}) {
  // title === "" — печатать без названия; null/undefined — фолбэк "ТОВАР"
  const t0 = safeTsplText(title ?? "ТОВАР");
  const rawCode = safeTsplText(barcode || "");
  const { code, format: barcodeFormat } = normalizeBarcode(rawCode);

  const priceText =
    price !== undefined && price !== null && String(price).trim() !== ""
      ? safeTsplText(`Цена: ${formatPrice(price)} с`)
      : "";

  const textScaleInt = Math.max(1, Math.round(Number(textScale) || 1));
  const lineGapDots = Math.max(1, Math.round(Number(lineGap) || 7));
  const gapAfterTitleDots = Math.max(0, Math.round(Number(gapAfterTitle) || 0));
  const gapAfterPriceDots = Math.max(0, Math.round(Number(gapAfterPrice) || 0));
  const barcodeRaiseDots = Math.max(0, Math.round(Number(barcodeRaise) || 0));
  const barcodeHeightFactor = 0.8; // slightly taller
  const barcodeHeightDots = Math.max(
    1,
    Math.round((Number(barcodeHeight) || 44) * barcodeHeightFactor)
  );
  const barcodeDensityFactor = 1.1; // slightly thicker
  const barcodeBarWidthDots = Math.max(
    1,
    Math.round((Number(barcodeBarWidth) || 2) * barcodeDensityFactor)
  );
  const drawBarcodeText = true;
  const barcodeTextSize = Math.max(8, Math.round(lineGapDots * 0.72));
  const barcodeTextMargin = 12;
  const barcodeTextHeight = drawBarcodeText
    ? barcodeTextSize + barcodeTextMargin + 2
    : 0;

  const orientation = getOrientation();
  const w = orientation === "rotated" ? heightMm : widthMm;
  const h = orientation === "rotated" ? widthMm : heightMm;

  const mmToDots = (mm) => Math.max(1, Math.round(Number(mm) * 8));
  const W = mmToDots(w);
  const H = mmToDots(h);
  const shiftX = Math.round(W * 0.05);
  const shiftContentX = -shiftX;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as any;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  const fontFamily = getRasterFontFamily();
  const fontSize = Math.max(8, Math.round(lineGapDots * 0.85 * textScaleInt));
  const normalFont = `${fontSize}px ${fontFamily}`;
  const boldFont = `bold ${fontSize}px ${fontFamily}`;
  ctx.font = normalFont;

  const margin = 6;
  const thick = 2;
  const safePad = margin + thick;
  const safeLeft = Math.max(0, safePad + shiftContentX);
  const safeTop = safePad;
  const safeW = W - safePad * 2;
  const safeH = H - safePad * 2;

  // dashed border
  const dash = 10;
  const space = 6;
  const leftX = Math.max(0, margin + shiftContentX);
  const rightX = Math.max(
    leftX + 1,
    Math.min(W - thick, W - margin - thick + shiftContentX)
  );
  const topY = margin;
  const botY = H - margin - thick;
  for (let x = leftX; x < rightX; x += dash + space) {
    const bw = Math.min(dash, rightX - x);
    ctx.fillRect(x, topY, bw, thick);
    ctx.fillRect(x, botY, bw, thick);
  }
  for (let y = topY; y < botY; y += dash + space) {
    const bh = Math.min(dash, botY - y);
    ctx.fillRect(leftX, y, thick, bh);
    ctx.fillRect(rightX, y, thick, bh);
  }

  const lines = t0 ? wrapByPixelWidth(ctx, t0, safeW, 2) : [];
  const lineCount = lines.length;
  const textBlockHeight = lineGapDots * lineCount;
  const priceBlockHeight = priceText ? gapAfterTitleDots + lineGapDots : 0;
  const gapToBarcode = priceText ? gapAfterPriceDots : gapAfterTitleDots;
  const barcodeBottomGap = 2;
  const barcodeBlockHeight =
    gapToBarcode + barcodeHeightDots + barcodeTextHeight + barcodeBottomGap;
  const contentHeight = textBlockHeight + priceBlockHeight + barcodeBlockHeight;
  const startY = safeTop + Math.max(0, Math.round((safeH - contentHeight) / 2));

  const titleY = startY;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    const textX = Math.max(0, safeLeft + Math.round((safeW - w) / 2));
    ctx.fillText(line, textX, titleY + i * lineGapDots);
  });

  const desiredPriceY = priceText
    ? titleY + textBlockHeight + gapAfterTitleDots
    : null;
  const desiredBarcodeY =
    titleY +
    textBlockHeight +
    priceBlockHeight +
    gapToBarcode -
    barcodeRaiseDots;

  const maxBarcodeY =
    safeTop +
    safeH -
    (barcodeHeightDots + barcodeTextHeight) -
    barcodeBottomGap;
  const bcY = Math.min(desiredBarcodeY, maxBarcodeY);

  const maxPriceY = bcY - gapAfterPriceDots - lineGapDots;
  const priceY = priceText ? Math.min(desiredPriceY as any, maxPriceY as any) : null;
  if (priceText && priceY != null) {
    ctx.font = boldFont;
    const priceW = ctx.measureText(priceText).width;
    const priceX = Math.max(0, safeLeft + Math.round((safeW - priceW) / 2));
    ctx.fillText(priceText, priceX, priceY);
    ctx.font = normalFont;
  }

  // barcode: draw on temp canvas
  const barcodeCanvas = document.createElement("canvas");

  JsBarcode(barcodeCanvas, code, {
    format: barcodeFormat,
    width: Math.max(1, barcodeBarWidthDots),
    height: Math.max(1, barcodeHeightDots),
    displayValue: false,
    margin: 0,
    background: "#ffffff",
    lineColor: "#000000",
  });

  const barcodeShiftX = Math.round(W * 0.03);
  const bcX = Math.max(
    0,
    Math.round((W - barcodeCanvas.width) / 2) - barcodeShiftX
  );
  ctx.drawImage(barcodeCanvas, bcX, bcY);
  // make bars a bit bolder
  ctx.drawImage(barcodeCanvas, bcX + 1, bcY);
  if (drawBarcodeText) {
    const textY = bcY + barcodeHeightDots + barcodeTextMargin;
    drawFullWidthText(
      ctx,
      code,
      bcX,
      textY,
      barcodeCanvas.width,
      barcodeTextSize,
      fontFamily,
      "600",
      0
    );
  }

  const { raster, bytesPerLine, height } = canvasToMonoRaster(
    canvas,
    180,
    getRasterInvert()
  );
  const header = [
    `SIZE ${w} mm,${h} mm`,
    `GAP ${gapMm} mm,0 mm`,
    "SPEED 4",
    "DENSITY 6",
    "DIRECTION 1",
    "REFERENCE 0,0",
    "OFFSET 0",
    "CLS",
    `BITMAP 0,0,${bytesPerLine},${height},0,`,
  ].join("\r\n");
  const copiesInt = Math.max(1, Math.min(100, Math.round(Number(copies) || 1)));
  const footer = `\r\nPRINT ${copiesInt}\r\n`;

  const headerBytes = bytesFromAscii(header);
  const footerBytes = bytesFromAscii(footer);
  const total = new Uint8Array(
    headerBytes.length + raster.length + footerBytes.length
  );
  total.set(headerBytes, 0);
  total.set(raster, headerBytes.length);
  total.set(footerBytes, headerBytes.length + raster.length);
  return total;
}


export { buildLabel, buildRasterLabelBytes };
