/**
 * XPrinter XP-350B / XP-365B — TSPL • 203 DPI
 * Public API barrel (implementation in sibling modules).
 */

export {
  getXp365bCodepage,
  setXp365bCodepage,
  setXp365bOrientation,
  setXp365bRenderMode,
  setXp365bRasterFontFamily,
  setXp365bRasterInvert,
} from "./settings";

export {
  connectXprinter,
  connectXp365bManually,
  attachXp365bUsbListenersOnce,
  checkXp365bConnection,
  calibrateXprinter,
} from "./usb";

export { printXp365bBarcodeLabel, testPrint } from "./print";

import { printXp365bBarcodeLabel, testPrint } from "./print";
import { calibrateXprinter } from "./usb";
import {
  setXp365bCodepage,
  setXp365bOrientation,
  setXp365bRenderMode,
  setXp365bRasterFontFamily,
} from "./settings";

declare global {
  interface Window {
    printLabel?: typeof printXp365bBarcodeLabel;
    testPrint?: typeof testPrint;
    calibrateXprinter?: typeof calibrateXprinter;
    setXp365bCodepage?: typeof setXp365bCodepage;
    setXp365bOrientation?: typeof setXp365bOrientation;
    setXp365bRenderMode?: typeof setXp365bRenderMode;
    setXp365bRasterFontFamily?: typeof setXp365bRasterFontFamily;
  }
}

if (typeof window !== "undefined") {
  window.printLabel = printXp365bBarcodeLabel;
  window.testPrint = testPrint;
  window.calibrateXprinter = calibrateXprinter;
  window.setXp365bCodepage = setXp365bCodepage;
  window.setXp365bOrientation = setXp365bOrientation;
  window.setXp365bRenderMode = setXp365bRenderMode;
  window.setXp365bRasterFontFamily = setXp365bRasterFontFamily;
}
