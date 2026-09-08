/** Graphic market receipt: layout → canvas → GS v 0 */

import {
  buildMarketItemLineLeft,
  hasReceiptText,
  money,
  prepareReceiptContent,
  wrapReceiptName,
  type ReceiptContent,
} from "./receiptContent";

export const RECEIPT_CANVAS_FONT =
  '"Courier New", Menlo, Consolas, "Liberation Mono", monospace';

/** Чуть легче обычного bold (700) — на растре термопринтера не «залипает». */
const RECEIPT_EMPHASIS_WEIGHT = "600";

function receiptFontWeight(bold?: boolean) {
  return bold ? RECEIPT_EMPHASIS_WEIGHT : "normal";
}

const CANVAS_PADDING = 8;

export type ReceiptLayoutLine = {
  /** Однострочный текст (legacy / центрирование). */
  text?: string;
  /** Левая колонка — рисуется по пикселям, не по пробелам. */
  left?: string;
  right?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  large?: boolean;
  proportionalLarge?: boolean;
  /** Меньший зазор между колонками (для шапки таблицы позиций). */
  tightColumns?: boolean;
  gapAfter?: number;
};

export type ReceiptLayout = {
  lines: ReceiptLayoutLine[];
  qrLink?: string;
};

/** Сколько символов реально помещается на canvas при 48 мм (384 точки). */
export function resolveGraphicLineWidth(
  dotsPerLine: number,
  charsPerLine: number,
): number {
  const fromDots = Math.max(28, Math.floor((dotsPerLine - CANVAS_PADDING * 2) / 8.5));
  return Math.min(charsPerLine, fromDots, 42);
}

function pushDivider(lines: ReceiptLayoutLine[], divider: string) {
  lines.push({ text: divider });
}

function pushLrLine(
  lines: ReceiptLayoutLine[],
  left: string,
  right: string,
  opts: Partial<ReceiptLayoutLine> = {},
) {
  lines.push({ left, right, ...opts });
}

export function buildMarketReceiptLayout(
  payload: Record<string, unknown>,
  opts: {
    receiptStyle?: string;
    width?: number;
    dotsPerLine?: number;
    charsPerLine?: number;
  } = {},
): ReceiptLayout {
  const dotsPerLine = opts.dotsPerLine ?? 384;
  const graphicWidth = resolveGraphicLineWidth(
    dotsPerLine,
    opts.width ?? opts.charsPerLine ?? 42,
  );
  const c = prepareReceiptContent(payload, { ...opts, width: graphicWidth });
  const lines: ReceiptLayoutLine[] = [];

  lines.push({
    text: "СПАСИБО ЗА ПОКУПКУ!",
    align: "center",
    bold: true,
    gapAfter: 4,
  });
  lines.push({
    text: "Контрольно-кассовый чек - Продажа",
    align: "center",
  });

  if (hasReceiptText(c.company)) {
    lines.push({ text: `Магазин: ${c.company}`, align: "center", bold: true, large: true });
  }
  if (hasReceiptText(c.inn)) lines.push({ text: `ИНН ${c.inn}`, align: "center" });
  if (hasReceiptText(c.address)) lines.push({ text: c.address, align: "center" });

  pushDivider(lines, c.divider);

  if (hasReceiptText(c.docNo) && hasReceiptText(c.dt)) {
    pushLrLine(lines, `Чек № ${c.docNo}`, c.dt);
  } else if (hasReceiptText(c.docNo)) {
    lines.push({ text: `Чек № ${c.docNo}` });
  } else if (hasReceiptText(c.dt)) {
    lines.push({ text: c.dt });
  }
  if (hasReceiptText(c.cashier)) pushLrLine(lines, "Кассир", c.cashier);
  if (hasReceiptText(c.consultant)) pushLrLine(lines, "Консультант", c.consultant);
  if (hasReceiptText(c.shift)) pushLrLine(lines, "Смена", c.shift);

  pushDivider(lines, c.divider);

  if (c.ekassaFields) {
    lines.push({ text: "СНО: Общий налоговый режим" });
    pushDivider(lines, c.divider);
  }

  pushLrLine(lines, "Цена x Кол-о - Скидка", "Итого", {
    bold: true,
    large: true,
    tightColumns: true,
    gapAfter: 4,
  });

  for (const [index, it] of c.items.entries()) {
    const name = String(it.name ?? "Товар");
    const qty = Number(it.qty || 1);
    const price = Number(it.price || 0);
    const lineTotal = Number(it.total ?? qty * price);
    const lineDiscountAmt = Math.max(0, Number(it.line_discount_amount || 0));
    const prefix = `${index + 1}) `;
    const nameLines = wrapReceiptName(name, Math.max(8, c.width - prefix.length));

    lines.push({ text: prefix + nameLines[0], bold: true });
    for (let i = 1; i < nameLines.length; i += 1) {
      lines.push({ text: `  ${nameLines[i]}` });
    }
    pushLrLine(
      lines,
      buildMarketItemLineLeft(price, qty, lineDiscountAmt),
      money(lineTotal),
      { bold: true, large: true },
    );
    if (index < c.items.length - 1) pushDivider(lines, c.divider);
  }

  pushDivider(lines, c.divider);
  pushLrLine(lines, "Подытог", money(c.subtotal), { bold: true });
  if (c.discount > 0) {
    pushLrLine(lines, "Скидка", `-${money(c.discount)}`, { bold: true });
  }
  if (!c.ekassaFields) {
    if (c.vat > 0) pushLrLine(lines, "НДС", money(c.vat), { bold: true });
    if (c.nsp > 0) pushLrLine(lines, "НсП", money(c.nsp), { bold: true });
  }

  pushDivider(lines, c.divider);

  appendPaymentLines(lines, c);
  pushLrLine(lines, "Итог", `${money(c.total)} СОМ`, {
    bold: true,
    proportionalLarge: true,
  });
  pushDivider(lines, c.divider);

  appendFiscalLines(lines, c);

  return {
    lines,
    qrLink: c.qrLink || undefined,
  };
}

function appendPaymentLines(lines: ReceiptLayoutLine[], c: ReceiptContent) {
  if (c.ekassaFields) {
    pushLrLine(lines, "Всего", money(c.total), { bold: true });
    pushLrLine(lines, "Наличные", money(c.paidCash), { bold: true });
    pushLrLine(lines, "Безналичные", money(c.paidCard), { bold: true });
    if (c.cashReceived > c.paidCash) {
      pushLrLine(lines, "Получено", money(c.cashReceived), { bold: true });
    }
    if (c.change > 0) {
      pushLrLine(lines, "Сдача", money(c.change), { bold: true });
    }
    pushLrLine(lines, "Вид расчета", "Полный расчет");
    pushLrLine(lines, "НДС 0%", "0.00");
    pushLrLine(lines, "НсП 0%", "0.00");
    return;
  }

  if (c.paidCash > 0) pushLrLine(lines, "Наличные", money(c.paidCash), { bold: true });
  if (c.paidCard > 0) {
    pushLrLine(lines, "Безналичные", money(c.paidCard), { bold: true });
  }
  if (c.cashReceived > c.paidCash) {
    pushLrLine(lines, "Получено", money(c.cashReceived), { bold: true });
  }
  if (c.change > 0) pushLrLine(lines, "Сдача", money(c.change), { bold: true });
}

function appendFiscalLines(lines: ReceiptLayoutLine[], c: ReceiptContent) {
  if (hasReceiptText(c.kkm)) {
    if (c.ekassaFields) {
      pushLrLine(lines, "ККМ версия", "1.0");
      pushDivider(lines, c.divider);
    }
    pushLrLine(lines, "РН ККМ", c.kkm);
    pushDivider(lines, c.divider);
  }
  if (hasReceiptText(c.fn)) {
    pushLrLine(lines, "ФМ", c.fn);
    pushDivider(lines, c.divider);
  }
  if (hasReceiptText(c.fd)) {
    pushLrLine(lines, "ФД", c.fd);
    pushDivider(lines, c.divider);
  }
  if (hasReceiptText(c.fpd)) pushLrLine(lines, "ФПД", c.fpd);
  pushDivider(lines, c.divider);
}

type CanvasCfg = {
  dotsPerLine: number;
  charsPerLine: number;
  lineDotHeight: number;
};

function lineFontSize(
  line: ReceiptLayoutLine,
  normalFontSize: number,
  slightLargeFontSize: number,
  proportionalLargeFontSize: number,
) {
  if (line.proportionalLarge) return proportionalLargeFontSize;
  if (line.large) return slightLargeFontSize;
  return normalFontSize;
}

function measureLineHeight(
  line: ReceiptLayoutLine,
  cfg: CanvasCfg,
  normalFontSize: number,
  slightLargeFontSize: number,
  proportionalLargeFontSize: number,
) {
  const fontSize = lineFontSize(
    line,
    normalFontSize,
    slightLargeFontSize,
    proportionalLargeFontSize,
  );
  return Math.max(cfg.lineDotHeight, fontSize + 4) + (line.gapAfter || 0);
}

function trimTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length < text.length ? `${trimmed}…` : trimmed;
}

export function renderReceiptLayoutToCanvas(
  layout: ReceiptLayout,
  cfg: CanvasCfg,
): HTMLCanvasElement {
  const padding = CANVAS_PADDING;
  const normalFontSize = Math.max(10, Math.round(cfg.lineDotHeight * 0.85));
  const slightLargeFontSize = Math.round(normalFontSize * 1.15);
  const proportionalLargeFontSize = Math.round(normalFontSize * 1.5);

  let contentHeight = padding;
  for (const line of layout.lines) {
    contentHeight += measureLineHeight(
      line,
      cfg,
      normalFontSize,
      slightLargeFontSize,
      proportionalLargeFontSize,
    );
  }
  contentHeight += padding;

  const canvas = document.createElement("canvas");
  canvas.width = cfg.dotsPerLine;
  canvas.height = Math.max(1, contentHeight);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D недоступен");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  let y = padding;
  for (const line of layout.lines) {
    const fontSize = lineFontSize(
      line,
      normalFontSize,
      slightLargeFontSize,
      proportionalLargeFontSize,
    );
    const weight = receiptFontWeight(line.bold);
    ctx.font = `${weight} ${fontSize}px ${RECEIPT_CANVAS_FONT}`;

    if (line.left != null && line.right != null) {
      const rightText = line.right;
      const rightW = ctx.measureText(rightText).width;
      const columnGap = line.tightColumns ? 2 : 6;
      const leftMaxW = canvas.width - padding * 2 - rightW - columnGap;
      const leftText = trimTextToWidth(ctx, line.left, Math.max(20, leftMaxW));
      ctx.fillText(leftText, padding, y);
      ctx.fillText(rightText, canvas.width - padding - rightW, y);
    } else {
      const text = String(line.text ?? "");
      let x = padding;
      if (line.align === "center") {
        x = Math.max(padding, (canvas.width - ctx.measureText(text).width) / 2);
      } else if (line.align === "right") {
        x = Math.max(padding, canvas.width - padding - ctx.measureText(text).width);
      } else {
        x = padding;
      }
      const maxW = canvas.width - padding * 2;
      ctx.fillText(trimTextToWidth(ctx, text, maxW), x, y);
    }

    y += measureLineHeight(
      line,
      cfg,
      normalFontSize,
      slightLargeFontSize,
      proportionalLargeFontSize,
    );
  }

  return canvas;
}
