/** Печать чеков и обработка checkout-ответа */

import { ESC } from "./bytes";
import { getEscposRuntimeConfig } from "./encoding";
import { buildReceiptFromJSON } from "./formatters";
import {
  looksLikePdf,
  tryParseJsonFromBlob,
  unwrapPrintablePayload,
} from "./detect";
import {
  canvasToRasterBytes,
  buildEscPosForRaster,
  pdfBlobToCanvas,
} from "./raster";
import {
  buildMarketReceiptLayout,
  renderReceiptLayoutToCanvas,
} from "./receiptLayout";
import { buildEscPosQr } from "./receiptQr";
import { isGraphicReceiptMode, safeLsGet } from "./storage";
import { resolveReceiptStyle } from "./receiptStyle";
import { isOpaquePrintPayload, isPrintFormatError } from "./printErrors";
import {
  usbState,
  saveVidPidToLS,
  requestUsbDevice,
  openUsbDevice,
  ensureUsbReadyAuto,
} from "./usb";
import { transferEscPosBytes } from "./usbTransfer";
import {
  applyDrawerToChunks,
  applyDrawerToEscPosBuffer,
  buildDrawerKickPayload,
  getDrawerSettings,
  type DrawerAt,
} from "./drawer";

export { isOpaquePrintPayload, isPrintFormatError };

async function ensureUsbPrinter(options: any = {}) {
  if (!("usb" in navigator)) throw new Error("WebUSB не поддерживается");
  await ensureUsbReadyAuto();
  let dev: any = usbState.dev;
  if (!dev) {
    if (options?.interactive === false) {
      throw new Error("Принтер не подключен");
    }
    dev = await requestUsbDevice();
    saveVidPidToLS(dev);
  }
  if (usbState.dev === dev && usbState.outEP != null) {
    saveVidPidToLS(dev);
    return { dev, outEP: usbState.outEP };
  }
  const { outEP } = await openUsbDevice(dev);
  saveVidPidToLS(dev);
  return { dev, outEP };
}

async function sendEscPosBytes(
  bytes: Uint8Array,
  options: any = {},
  transferOpts: { rasterPrefix?: boolean; skipWake?: boolean } = {},
) {
  const { dev, outEP } = await ensureUsbPrinter(options);
  await transferEscPosBytes(dev, outEP, bytes, usbState, transferOpts);
}

export async function kickCashDrawer(
  bytes?: number[],
  options: any = {},
): Promise<void> {
  const cmd =
    Array.isArray(bytes) && bytes.length > 0
      ? bytes
      : getDrawerSettings().bytes;
  await sendEscPosBytes(buildDrawerKickPayload(cmd), options, {
    skipWake: true,
  });
}

function resolveDrawerPrintOptions(options: any = {}) {
  if (options?.skipDrawer) return options;
  const settings = getDrawerSettings();
  if (!settings.enabled) return options;
  return {
    ...options,
    drawerKickBytes: settings.bytes,
    drawerAt: (settings.when === "before" ? "start" : "end") as DrawerAt,
  };
}

function resolveUseGraphicPrint(options: any = {}) {
  if (options?.graphic === false) return false;
  if (options?.graphic === true) return true;
  if (options?.receiptStyle !== "market") return false;
  return isGraphicReceiptMode();
}

async function printReceiptFromPdfUSB(pdfBlob: any, options: any = {}) {
  const isMarket = options?.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: isMarket });
  const canvas = await pdfBlobToCanvas(pdfBlob, cfg.dotsPerLine);
  const { raster, bytesPerLine, h } = canvasToRasterBytes(canvas);
  const escpos = applyDrawerToEscPosBuffer(
    buildEscPosForRaster(raster, bytesPerLine, h),
    options.drawerAt as DrawerAt | undefined,
    options.drawerKickBytes,
  );
  await sendEscPosBytes(escpos, options, { rasterPrefix: true });
}

async function printReceiptJSONGraphicViaUSB(payload: any, options: any = {}) {
  const isMarket = options?.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: isMarket });

  const layout = buildMarketReceiptLayout(payload, {
    receiptStyle: options?.receiptStyle,
    width: cfg.charsPerLine,
    dotsPerLine: cfg.dotsPerLine,
    charsPerLine: cfg.charsPerLine,
  });
  const canvas = renderReceiptLayoutToCanvas(layout, {
    dotsPerLine: cfg.dotsPerLine,
    charsPerLine: cfg.charsPerLine,
    lineDotHeight: cfg.lineDotHeight,
  });
  const { raster, bytesPerLine, h } = canvasToRasterBytes(canvas);
  const rasterEsc = buildEscPosForRaster(raster, bytesPerLine, h, {
    includeCut: false,
  });

  const tailParts: Uint8Array[] = [];
  if (layout.qrLink) {
    tailParts.push(ESC(0x1b, 0x61, 0x01));
    tailParts.push(new TextEncoder().encode("Проверка чека\n"));
    tailParts.push(...buildEscPosQr(layout.qrLink));
    tailParts.push(new TextEncoder().encode("\n"));
    tailParts.push(ESC(0x1b, 0x61, 0x00));
  }
  tailParts.push(ESC(0x1b, 0x64, 0x06));
  tailParts.push(ESC(0x1d, 0x56, 0x00));

  const tailLen = tailParts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(rasterEsc.length + tailLen);
  all.set(rasterEsc, 0);
  let offset = rasterEsc.length;
  for (const part of tailParts) {
    all.set(part, offset);
    offset += part.length;
  }

  const escpos = applyDrawerToEscPosBuffer(
    all,
    options.drawerAt as DrawerAt | undefined,
    options.drawerKickBytes,
  );
  await sendEscPosBytes(escpos, options, { rasterPrefix: true });
}

async function printReceiptJSONTextViaUSB(payload: any, options: any = {}) {
  const isMarket = options?.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: isMarket });
  const parts = applyDrawerToChunks(
    buildReceiptFromJSON(payload, {
      width: cfg.charsPerLine,
      codepage: cfg.codepage,
      encoder: cfg.encoder,
      receiptStyle: options?.receiptStyle,
    }),
    options.drawerAt as DrawerAt | undefined,
    options.drawerKickBytes,
  );
  for (const data of parts) {
    await sendEscPosBytes(data, options);
  }
}

async function printReceiptJSONViaUSB(payload: any, options: any = {}) {
  if (resolveUseGraphicPrint(options)) {
    await printReceiptJSONGraphicViaUSB(payload, options);
    return;
  }
  await printReceiptJSONTextViaUSB(payload, options);
}

/* ---------- Минимальная печать PC866 (XP-N160II) ---------- */
export async function printRussianRawUsb(text: any = "Привет, мир!", options: any = {}) {
  const cfg = getEscposRuntimeConfig();
  const init = ESC(0x1b, 0x40);
  const intl = ESC(0x1b, 0x52, 0x00);
  const cp = ESC(0x1b, 0x74, cfg.codepage);
  const body = cfg.encoder(String(text) + "\n");
  const cut = ESC(0x1d, 0x56, 0x00);

  const data = new Uint8Array(
    init.length + intl.length + cp.length + body.length + cut.length,
  );
  let o = 0;
  data.set(init, o);
  o += init.length;
  data.set(intl, o);
  o += intl.length;
  data.set(cp, o);
  o += cp.length;
  data.set(body, o);
  o += body.length;
  data.set(cut, o);

  await sendEscPosBytes(data, options);
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function enrichMarketReceiptPayload(payload: any, meta: any = {}) {
  if (isOpaquePrintPayload(payload)) return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const next = { ...payload };
  const orderTotal = toNum(
    meta.total ?? next.total_amount ?? next.paid_cash ?? next.paid_card,
  );
  const method = String(
    meta.paymentMethod ?? next.payment_method ?? "",
  ).toLowerCase();
  const received = toNum(
    meta.amountReceived ?? meta.cash_received ?? next.cash_received,
  );
  const paidCash = toNum(meta.paidCash ?? next.paid_cash);
  const paidCard = toNum(meta.paidCard ?? next.paid_card);
  const cashPaid = paidCash > 0 ? paidCash : orderTotal;

  if (method === "cash" || paidCash > 0 || received > 0) {
    const cashReceived =
      received > 0 ? received : cashPaid > 0 ? cashPaid : orderTotal;
    const change = toNum(
      meta.change ?? next.change ?? Math.max(0, cashReceived - cashPaid),
    );

    next.payment_method = next.payment_method || method || "cash";
    next.cash_received = cashReceived;
    next.paid_cash = cashPaid;
    next.change = change;
  }

  if (paidCard > 0) next.paid_card = paidCard;

  const consultantName = String(
    next.consultant_display ||
      next.consultant_name ||
      (next.consultant && typeof next.consultant === "object"
        ? next.consultant.name || next.consultant.full_name || ""
        : "") ||
      "",
  ).trim();
  if (consultantName) next.consultant_name = consultantName;

  return next;
}

function resolveMarketPrintOptions(options: any = {}) {
  const receiptStyle = resolveReceiptStyle(
    options?.receiptStyle,
    safeLsGet("selectedSector"),
  );
  if (!receiptStyle) return options;
  return { ...options, receiptStyle };
}

export async function handleCheckoutResponseForPrinting(res: any, options: any = {}) {
  const printOptions = resolveDrawerPrintOptions(
    resolveMarketPrintOptions(options),
  );
  return printCheckoutPayload(res, printOptions);
}

async function printCheckoutPayload(res: any, printOptions: any = {}) {
  const printable = unwrapPrintablePayload(res);

  if (typeof printable === "string") {
    const text = printable.trim();
    if (text.startsWith("data:application/pdf;base64,")) {
      const b64 = text.split(",")[1] || "";
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      await printReceiptFromPdfUSB(new Blob([bin], { type: "application/pdf" }), printOptions);
      return;
    }
    try {
      const json = JSON.parse(text);
      if (json && Array.isArray(json.items)) {
        await printReceiptJSONViaUSB(json, printOptions);
        return;
      }
    } catch {
      // not json
    }
  }

  if (
    printable &&
    typeof printable === "object" &&
    !(printable instanceof Blob) &&
    Array.isArray(printable.items)
  ) {
    await printReceiptJSONViaUSB(printable, printOptions);
    return;
  }
  if (printable instanceof Blob) {
    if (await looksLikePdf(printable)) {
      await printReceiptFromPdfUSB(printable, printOptions);
      return;
    }
    const parsed = await tryParseJsonFromBlob(printable);
    if (parsed?.json) {
      await printReceiptJSONViaUSB(parsed.json, printOptions);
      return;
    }
    if (parsed?.pdfBlob && (await looksLikePdf(parsed.pdfBlob))) {
      await printReceiptFromPdfUSB(parsed.pdfBlob, printOptions);
      return;
    }
    const url = URL.createObjectURL(printable);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipt.pdf";
    a.click();
    URL.revokeObjectURL(url);
    throw new Error("Получен невалидный PDF и не JSON: сохранён как файл.");
  }
  if (printable && typeof printable === "object" && Array.isArray(printable.items)) {
    await printReceiptJSONViaUSB(printable, printOptions);
    return;
  }
  throw new Error("Неизвестный формат ответа для печати");
}
