import type {
  FontOption,
  LabelDimensions,
  PreviewLayout,
  PreviewPositions,
  PrintSettings,
} from "./barcodePrintTab.types";

export const DOTS_PER_MM = 8; // 203 DPI ≈ 8 dots/mm
export const PREVIEW_SCALE = 2; // масштаб для предпросмотра

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  // Default to raster (no encoding issues)
  fontId: "__RASTER__",
  textScale: 1,
  copies: 1,
  lineGap: 22,
  gapAfterTitle: 7,
  gapAfterPrice: 4,
  barcodeRaise: 3,
  barcodeHeight: 44,
  barcodeBarWidth: 2,
};

export const AVAILABLE_FONTS: FontOption[] = [
  { value: "__RASTER__", label: "Растер (без кодировок) — рекомендовано" },
  // Built-in numeric fonts (firmware-dependent)
  { value: "1", label: 'Font "1" (built-in)' },
  { value: "2", label: 'Font "2" (built-in)' },
  { value: "3", label: 'Font "3" (built-in)' },
  { value: "4", label: 'Font "4" (built-in)' },
  { value: "5", label: 'Font "5" (built-in)' },
  // Common BF2 fonts on many TSPL firmwares (may or may not exist on a конкретном принтере)
  { value: "TSS16.BF2", label: "TSS16.BF2 (часто лучше для кириллицы)" },
  { value: "TSS24.BF2", label: "TSS24.BF2 (часто лучше для кириллицы)" },
];

export const FONT_BASE_MAP: Record<number, number> = {
  1: 4,
  2: 5,
  3: 6,
  4: 7,
  5: 8,
};

export const SIZE_MAP: Record<string, LabelDimensions> = {
  "30x20": { widthMm: 30, heightMm: 20 },
  "58x40": { widthMm: 58, heightMm: 40 },
  "58x30": { widthMm: 58, heightMm: 30 },
};

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const clampMm = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return clamp(n, min, max);
};

export const getBarcodeModuleCount = (codeValue) => {
  const code = String(codeValue || "");
  if (/^\d{13}$/.test(code)) return 95 + 20;
  if (/^\d{8}$/.test(code)) return 67 + 20;
  if (/^\d{12}$/.test(code)) return 95 + 20;
  return 11 * code.length + 35 + 20;
};

export const getAutoPrintSettingsBySize = ({
  heightMm,
  fontId: currentFontId,
  base = DEFAULT_PRINT_SETTINGS,
}: any) => {
  // Базовая калибровка была под 30x20 и raster (lineGap=22).
  // Для более крупных этикеток увеличиваем lineGap (а значит и fontSize в raster),
  // и при TSPL-шрифтах увеличиваем textScale.
  const factor = Math.max(0.75, Number(heightMm || 20) / 20);
  const isRaster = String(currentFontId || "") === "__RASTER__";

  const scaled = (v) => Math.round(Number(v || 0) * factor);

  // Для raster: textScale оставляем 1 (иначе в сервисе оно квадратично влияет на fontSize),
  // для TSPL: textScale зависит от высоты.
  const autoTextScale = isRaster ? 1 : clamp(Math.round(factor), 1, 3);

  return {
    // текст
    textScale: autoTextScale,
    lineGap: clamp(scaled(base.lineGap), 16, 64),
    gapAfterTitle: clamp(scaled(base.gapAfterTitle), 0, 40),
    gapAfterPrice: clamp(scaled(base.gapAfterPrice), 0, 40),

    // штрих‑код (не критично, но на больших этикетках выглядит гармоничнее)
    barcodeRaise: clamp(scaled(base.barcodeRaise), 0, 40),
    barcodeHeight: clamp(scaled(base.barcodeHeight), 20, 200),
    barcodeBarWidth: base.barcodeBarWidth,
  };
};

export const resolveCurrentLabel = ({
  labelSize,
  customWidthMm,
  customHeightMm,
}): LabelDimensions => {
  if (labelSize === "custom") {
    return {
      widthMm: clampMm(customWidthMm, 15, 110, 30),
      heightMm: clampMm(customHeightMm, 10, 110, 20),
    };
  }
  return SIZE_MAP[labelSize] || SIZE_MAP["30x20"];
};

export const wrapPreviewText = (text = "", width = 16, maxLines = 2) => {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const out: any[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= width) {
      line = next;
    } else {
      if (line) out.push(line);
      line = w;
    }
  }

  if (line) out.push(line);

  return out.slice(0, maxLines);
};

export const formatPrice = (value) => {
  const num = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(num)) return "";
  return Math.round(num).toString();
};

export const buildPreviewLayout = ({
  currentLabel,
  fontId,
  lineGap,
  textScaleValue,
  barcodeHeight,
  isRasterFont,
}): PreviewLayout => {
  const fontBase = FONT_BASE_MAP[Number(fontId)] ?? 6;
  const lineGapDots = Math.max(1, Math.round(lineGap));
  const textScaleInt = Math.max(1, Math.round(textScaleValue));
  const textSizeDots = isRasterFont
    ? Math.max(8, Math.round(lineGapDots * 0.85 * textScaleInt))
    : Math.max(3, fontBase * textScaleValue);
  const widthDots = Math.max(1, Math.round(currentLabel.widthMm * DOTS_PER_MM));
  const heightDots = Math.max(
    1,
    Math.round(currentLabel.heightMm * DOTS_PER_MM)
  );

  return {
    widthDots,
    heightDots,
    widthPx: Math.round(widthDots * PREVIEW_SCALE),
    heightPx: Math.round(heightDots * PREVIEW_SCALE),
    scale: PREVIEW_SCALE,
    text: {
      x: 8,
      y: 10,
      lineGap: lineGapDots,
      size: textSizeDots,
    },
    barcode: {
      x: 12,
      height: Math.max(1, Math.round(barcodeHeight)),
    },
    border: {
      margin: 6,
      thick: 2,
    },
  };
};

export const buildPreviewPositions = ({
  previewLinesLength,
  previewPriceText,
  previewLayout,
  gapAfterTitle,
  gapAfterPrice,
  barcodeRaise,
  barcodeBarWidth,
  barcodeValue,
}): PreviewPositions => {
  const lineCount = previewLinesLength;
  const gapTitle = Math.max(0, Math.round(gapAfterTitle));
  const gapPrice = Math.max(0, Math.round(gapAfterPrice));
  const barcodeRaiseDots = Math.max(0, Math.round(barcodeRaise));
  const barcodeBottomGap = 2;
  const safePad = previewLayout.border.margin + previewLayout.border.thick;
  const safeLeft = safePad;
  const safeTop = safePad;
  const safeW = previewLayout.widthDots - safePad * 2;
  const safeH = previewLayout.heightDots - safePad * 2;
  const textBlockHeight = previewLayout.text.lineGap * lineCount;
  const priceBlockHeight = previewPriceText
    ? gapTitle + previewLayout.text.lineGap
    : 0;
  const gapToBarcode = previewPriceText ? gapPrice : gapTitle;
  const barcodeBlockHeight =
    gapToBarcode + previewLayout.barcode.height + barcodeBottomGap;
  const contentHeight = textBlockHeight + priceBlockHeight + barcodeBlockHeight;
  const startY = safeTop + Math.max(0, Math.round((safeH - contentHeight) / 2));
  const textY = startY;
  const desiredPriceY = previewPriceText
    ? textY + textBlockHeight + gapTitle
    : null;
  const barcodeY =
    textY + textBlockHeight + priceBlockHeight + gapToBarcode - barcodeRaiseDots;
  const maxBarcodeY =
    safeTop + safeH - previewLayout.barcode.height - barcodeBottomGap;
  const clampedBarcodeY = Math.min(barcodeY, maxBarcodeY);
  const maxPriceY = clampedBarcodeY - gapPrice - previewLayout.text.lineGap;
  const priceY = previewPriceText ? Math.min(desiredPriceY, maxPriceY) : null;
  const textX = safeLeft;
  const priceX = safeLeft;
  const barcodeModules = getBarcodeModuleCount(barcodeValue);
  const barcodeWidthDots = Math.round(
    barcodeModules * Math.max(1, barcodeBarWidth)
  );
  const barcodeShiftX = Math.round(previewLayout.widthDots * 0.03);
  const barcodeX =
    safeLeft +
    Math.max(0, Math.round((safeW - barcodeWidthDots) / 2)) -
    barcodeShiftX;

  return {
    priceY,
    barcodeY: clampedBarcodeY,
    textX,
    priceX,
    barcodeX,
    textY,
    textW: safeW,
  };
};

export const getPrinterErrorMessage = (
  error,
  fallback = "Не удалось отправить данные на принтер"
) => {
  const msg = String(error?.message || "");
  if (msg.includes("WebUSB")) {
    return "Браузер не поддерживает WebUSB. Используйте Chrome или Edge.";
  }
  if (msg.includes("не найден") || msg.includes("не найдено")) {
    return "Принтер не подключен. Подключите принтер XP-365B и попробуйте снова.";
  }
  if (msg) return msg;
  return fallback;
};
