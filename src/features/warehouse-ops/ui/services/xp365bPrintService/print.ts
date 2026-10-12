/** Public print API for XP-365B */

import { buildLabel, buildRasterLabelBytes } from "./label";
import {
  DEFAULT_LABEL_PRESET,
  getRenderMode,
} from "./settings";
import { connectXprinter, sendBytesQueued, sendTsplQueued } from "./usb";

export async function printXp365bBarcodeLabel(opts) {
  const options = { ...(opts || {}) };
  await connectXprinter();

  const mode = getRenderMode(options?.renderMode);
  const fontId = String(options?.fontId || "");
  const preferRaster = mode === "raster" || fontId === "__RASTER__";
  const copies = Math.max(1, Math.min(100, Math.round(Number(options?.copies) || 1)));
  options.copies = copies;

  // Auto-scale defaults by label size if caller didn't pass tuning params.
  // Goal: on bigger labels not only border/geometry grows, but fonts too.
  const heightMm = Number(options?.heightMm || 20);
  const factor = Math.max(0.75, (Number.isFinite(heightMm) ? heightMm : 20) / 20);
  const scaled = (v) => Math.round(Number(v || 0) * factor);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  if (options.lineGap == null)
    options.lineGap = clamp(scaled(DEFAULT_LABEL_PRESET.lineGap), 16, 64);
  if (options.gapAfterTitle == null)
    options.gapAfterTitle = clamp(scaled(DEFAULT_LABEL_PRESET.gapAfterTitle), 0, 40);
  if (options.gapAfterPrice == null)
    options.gapAfterPrice = clamp(scaled(DEFAULT_LABEL_PRESET.gapAfterPrice), 0, 40);
  if (options.barcodeRaise == null)
    options.barcodeRaise = clamp(scaled(DEFAULT_LABEL_PRESET.barcodeRaise), 0, 40);
  if (options.barcodeHeight == null)
    options.barcodeHeight = clamp(scaled(DEFAULT_LABEL_PRESET.barcodeHeight), 20, 200);
  if (options.barcodeBarWidth == null)
    options.barcodeBarWidth = DEFAULT_LABEL_PRESET.barcodeBarWidth;

  // textScale: for TSPL it controls font size; for raster we keep it 1 by default
  // to avoid quadratic scaling inside raster renderer.
  if (options.textScale == null) {
    options.textScale = preferRaster ? 1 : clamp(Math.round(factor), 1, 3);
  }

  if (preferRaster) {
    const bytes = await buildRasterLabelBytes(options);
    await sendBytesQueued(bytes);
    return;
  }

  const tspl = buildLabel(options);
  await sendTsplQueued(tspl);
}

export async function testPrint() {
  await printXp365bBarcodeLabel({
    title: "ТЕСТ: Кириллица Ёё №",
    barcode: "2000533006751",
    price: 250,
    widthMm: 30,
    heightMm: 20,
    gapMm: 2,
  });
}

