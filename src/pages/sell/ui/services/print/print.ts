/** Печать чеков и обработка checkout-ответа */

import { ESC, chunkBytes } from "./bytes";
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
import { safeLsGet } from "./storage";
import {
  usbState,
  saveVidPidToLS,
  requestUsbDevice,
  openUsbDevice,
  ensureUsbReadyAuto,
} from "./usb";

async function printReceiptFromPdfUSB(pdfBlob: any, options: any = {}) {
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
  const { outEP } = await openUsbDevice(dev);
  saveVidPidToLS(dev);

  // печатаем на ширину принтера
  const isMarket = options?.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: isMarket });
  const canvas = await pdfBlobToCanvas(pdfBlob, cfg.dotsPerLine);
  const { raster, bytesPerLine, h } = canvasToRasterBytes(canvas);
  const escpos = buildEscPosForRaster(raster, bytesPerLine, h);

  for (const part of chunkBytes(escpos)) {
    await (dev as any).transferOut(outEP, part);
  }
}

async function printReceiptJSONViaUSB(payload: any, options: any = {}) {
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
  const { outEP } = await openUsbDevice(dev);
  saveVidPidToLS(dev);

  const isMarket = options?.receiptStyle === "market";
  const cfg = getEscposRuntimeConfig({ marketDefault: isMarket });
  const parts = buildReceiptFromJSON(payload, {
    width: cfg.charsPerLine,
    codepage: cfg.codepage,
    encoder: cfg.encoder,
    receiptStyle: options?.receiptStyle,
  });
  for (const data of parts) {
    for (const chunk of chunkBytes(data)) {
      await (dev as any).transferOut(outEP, chunk);
    }
  }
}

/* ---------- Минимальная печать PC866 (XP-N160II) ---------- */
export async function printRussianRawUsb(text: any = "Привет, мир!", options: any = {}) {
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
  const { outEP } = await openUsbDevice(dev);
  saveVidPidToLS(dev);

  const cfg = getEscposRuntimeConfig();
  // ESC/POS: init, international USA (см. ESC R в buildReceiptFromJSON), codepage, text, cut
  const init = ESC(0x1b, 0x40);
  const intl = ESC(0x1b, 0x52, 0x00);
  const cp = ESC(0x1b, 0x74, cfg.codepage);
  const body = cfg.encoder(String(text) + "\n");
  const cut = ESC(0x1d, 0x56, 0x00);

  const data = new Uint8Array(
    init.length + intl.length + cp.length + body.length + cut.length
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

  for (const chunk of chunkBytes(data)) {
    await (dev as any).transferOut(outEP, chunk);
  }
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function enrichMarketReceiptPayload(payload: any, meta: any = {}) {
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

  return next;
}

function resolveMarketPrintOptions(options: any = {}) {
  if (options.receiptStyle) return options;
  const sectorSlug = String(safeLsGet("selectedSector") || "").toLowerCase();
  if (sectorSlug === "market") {
    return { ...options, receiptStyle: "market" };
  }
  return options;
}

export async function handleCheckoutResponseForPrinting(res: any, options: any = {}) {
  const printOptions = resolveMarketPrintOptions(options);
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
    // не PDF и не JSON — сохраним как файл (фолбэк)
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
