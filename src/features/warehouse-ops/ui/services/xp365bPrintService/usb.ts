/** WebUSB + TSPL send queue for XP-365B */

import { encodeForPrinter } from "./encoding";
import { getOrientation, getTsplCodepageToken } from "./settings";

export const usbState: {
  dev: any;
  outEP: any;
  intfNum: any;
} = {
  dev: null,
  outEP: null,
  intfNum: null,
};

let usbListenersAttached = false;
let sendQueue: Promise<any> = Promise.resolve(); // serialize writes to avoid interleaving TSPL

const sleep = (ms: any) => new Promise((r) => setTimeout(r, ms));

const chunkBytes = (u8: any, size = 4096) => {
  const out: any[] = [];
  for (let i = 0; i < u8.length; i += size) out.push(u8.subarray(i, i + size));
  return out;
};

async function requestUsbDevice() {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    throw new Error("WebUSB не поддерживается (нужен Chrome/Edge)");
  }
  return (navigator as any).usb.requestDevice({
    // Some XPrinters use vendor-specific class; keep broad enough
    filters: [{ classCode: 0x07 }, { classCode: 0xff }],
  });
}

async function openUsbDevice(dev: any) {
  await dev.open();
  if (!dev.configuration) await dev.selectConfiguration(1).catch(() => {});

  const cfg = dev.configuration;
  if (!cfg) throw new Error("Нет активной USB-конфигурации");

  let outEP = null;
  let intfNum = null;

  for (const intf of cfg.interfaces) {
    for (const alt of intf.alternates) {
      const ep = (alt.endpoints || []).find(
        (e: any) => e.direction === "out" && e.type === "bulk"
      );
      if (!ep) continue;

      try {
        await dev.claimInterface(intf.interfaceNumber);
      } catch {
        continue;
      }

      const needAlt = alt.alternateSetting ?? 0;
      try {
        await dev.selectAlternateInterface(intf.interfaceNumber, needAlt);
      } catch {
        try {
          await dev.releaseInterface(intf.interfaceNumber);
        } catch {}
        continue;
      }

      outEP = ep.endpointNumber;
      intfNum = intf.interfaceNumber;
      break;
    }
    if (outEP != null) break;
  }

  if (outEP == null || intfNum == null) {
    throw new Error(
      "Bulk OUT endpoint не найден (проверь WinUSB/Zadig и что принтер не занят)"
    );
  }

  usbState.dev = dev;
  usbState.outEP = outEP;
  usbState.intfNum = intfNum;
}

function ensureCrLf(s) {
  const v = String(s ?? "");
  return v.endsWith("\r\n") ? v : v + "\r\n";
}

export async function sendTsplQueued(tspl) {
  sendQueue = sendQueue.then(async () => {
    if (!usbState.dev || usbState.outEP == null || !usbState.dev.opened) {
      throw new Error("Принтер не подключен");
    }

    const payload = ensureCrLf(tspl);
    const buf = encodeForPrinter(payload);

    for (const part of chunkBytes(buf)) {
      await usbState.dev.transferOut(usbState.outEP, part);
      await sleep(5);
    }
  });
  return sendQueue;
}

export async function sendBytesQueued(bytes) {
  sendQueue = sendQueue.then(async () => {
    if (!usbState.dev || usbState.outEP == null || !usbState.dev.opened) {
      throw new Error("Принтер не подключен");
    }
    for (const part of chunkBytes(bytes)) {
      await usbState.dev.transferOut(usbState.outEP, part);
      await sleep(5);
    }
  });
  return sendQueue;
}

async function initPrinter() {
  const cmds = [
    `CODEPAGE ${getTsplCodepageToken()}`,
    "SET GAP ON",
    "SET BLINE OFF",
    "\r\n",
  ].join("\r\n");
  await sendTsplQueued(cmds);
}

export async function connectXprinter() {
  if (usbState.dev && usbState.outEP != null && usbState.dev.opened) {
    // Re-apply settings to avoid "random" codepage after power cycle
    await initPrinter().catch(() => {});
    return;
  }

  const dev = await requestUsbDevice();
  await openUsbDevice(dev);
  await initPrinter();
}

export const connectXp365bManually = connectXprinter;

export function attachXp365bUsbListenersOnce() {
  if (usbListenersAttached) return;
  usbListenersAttached = true;

  if (typeof navigator === "undefined" || !(navigator as any).usb?.addEventListener)
    return;

  (navigator as any).usb.addEventListener("disconnect", (event) => {
    if (usbState.dev && event?.device === usbState.dev) {
      usbState.dev = null;
      usbState.outEP = null;
      usbState.intfNum = null;
    }
  });
}

export async function checkXp365bConnection() {
  return !!(usbState.dev && usbState.outEP != null && usbState.dev.opened);
}

export async function calibrateXprinter({
  widthMm = 30,
  heightMm = 20,
  gapMm = 2,
} = {}) {
  await connectXprinter();
  const orientation = getOrientation();
  const w = orientation === "rotated" ? heightMm : widthMm;
  const h = orientation === "rotated" ? widthMm : heightMm;

  const tspl = [
    `SIZE ${w} mm,${h} mm`,
    `GAP ${gapMm} mm,0 mm`,
    "CLS",
    "PRINT 1",
    "\r\n",
  ].join("\r\n");

  await sendTsplQueued(tspl);
}
