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
} from "./print/storage";

export { getEscposRuntimeConfig } from "./print/encoding";

export {
  ensurePrinterConnectedInteractively,
  attachUsbListenersOnce,
  checkPrinterConnection,
} from "./print/usb";

export {
  printRussianRawUsb,
  enrichMarketReceiptPayload,
  handleCheckoutResponseForPrinting,
  kickCashDrawer,
} from "./print/print";

export {
  DEFAULT_DRAWER_CMD,
  getDrawerSettings,
  parseEscPosCommand,
  saveDrawerSettings,
} from "./print/drawer";
