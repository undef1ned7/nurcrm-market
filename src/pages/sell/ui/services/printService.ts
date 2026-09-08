/**
 * Print Service
 * Модуль для работы с печатью чеков через WebUSB и ESC/POS принтеры
 *
 * Реализация разнесена по `./print/*`; этот файл — публичный API (barrel).
 */

export {
  setEscposDotsPerLine,
  setEscposCharsPerLine,
  setEscposLineHeight,
  setEscposFont,
  setEscposCodepage,
  setEscposReceiptMode,
  getReceiptPrintMode,
  isGraphicReceiptMode,
  exportEscposSettings,
  importEscposSettings,
} from "./print/storage";

export { getEscposRuntimeConfig, PRINT_WIDTH_48MM_DPL, PRINT_WIDTH_48MM_CHARS_B } from "./print/encoding";

export {
  ensurePrinterConnectedInteractively,
  attachUsbListenersOnce,
  checkPrinterConnection,
} from "./print/usb";

export { PRINTER_IN_USE_MESSAGE } from "./print/usbLock";

export { mapMarketReceiptItem } from "./print/receiptItems";

export {
  printRussianRawUsb,
  enrichMarketReceiptPayload,
  handleCheckoutResponseForPrinting,
  kickCashDrawer,
  isOpaquePrintPayload,
  isPrintFormatError,
} from "./print/print";

export {
  buildMarketReceiptLayout,
  renderReceiptLayoutToCanvas,
} from "./print/receiptLayout";

export {
  DEFAULT_DRAWER_CMD,
  getDrawerSettings,
  parseEscPosCommand,
  saveDrawerSettings,
} from "./print/drawer";
