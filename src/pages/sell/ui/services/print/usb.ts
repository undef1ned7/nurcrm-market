/** WebUSB подключение ESC/POS принтера */

import {
  PRINTER_IN_USE_MESSAGE,
  acquireUsbLock,
  attachUsbLockListenersOnce,
  isUsbLockHeldByOtherTab,
  releaseUsbLock,
} from "./usbLock";
import {
  resetUsbTransferState,
  type UsbTransferState,
} from "./usbTransfer";

export const usbState: UsbTransferState & {
  dev: USBDevice | null;
  opening: Promise<unknown> | null;
  iface: number | null;
} = {
  dev: null,
  opening: null,
  outEP: null,
  iface: null,
  sessionReady: false,
};
const navUsb: any = () => (navigator as any).usb;

function saveVidPidToLS(dev: any) {
  try {
    localStorage.setItem("escpos_vid", dev.vendorId.toString(16));
    localStorage.setItem("escpos_pid", dev.productId.toString(16));
    if (dev.serialNumber)
      localStorage.setItem("escpos_serial", String(dev.serialNumber));
    if (dev.productName) localStorage.setItem("escpos_product", dev.productName);
    if (dev.manufacturerName)
      localStorage.setItem("escpos_manufacturer", dev.manufacturerName);
  } catch { }
}
async function tryUsbAutoConnect() {
  if (!("usb" in navigator)) throw new Error("Браузер не поддерживает WebUSB");
  const savedSerial = localStorage.getItem("escpos_serial") || "";
  const savedVid = parseInt(localStorage.getItem("escpos_vid") || "", 16);
  const savedPid = parseInt(localStorage.getItem("escpos_pid") || "", 16);
  const devs = await navUsb().getDevices();
  if (savedSerial) {
    return devs.find((d: any) => d.serialNumber === savedSerial) || null;
  }
  return (
    devs.find(
      (d: any) =>
        (!savedVid || d.vendorId === savedVid) &&
        (!savedPid || d.productId === savedPid)
    ) || null
  );
}
async function requestUsbDevice() {
  const filters = [{ classCode: 0x07 }, { classCode: 0xff }];
  return await (navigator as any).usb.requestDevice({ filters });
}
async function openUsbDevice(dev: USBDevice) {
  if (!dev) throw new Error("USB устройство не найдено");
  if (isUsbLockHeldByOtherTab()) {
    throw new Error(PRINTER_IN_USE_MESSAGE);
  }

  // Уже открыт этот принтер в текущей вкладке — не делаем повторный claim.
  if (usbState.dev === dev && usbState.outEP != null) {
    return {
      iface: usbState.iface as number,
      alt: 0,
      outEP: usbState.outEP,
    };
  }

  if (usbState.dev && usbState.dev !== dev) {
    resetUsbTransferState(usbState);
    usbState.dev = null;
    usbState.iface = null;
  }

  if (!dev.opened) await dev.open();

  if (dev.configuration == null) {
    await dev.selectConfiguration(1).catch(() => { });
    if (dev.configuration == null && dev.configurations?.length) {
      const cfgNum = dev.configurations[0]?.configurationValue ?? 1;
      await dev.selectConfiguration(cfgNum).catch(() => { });
    }
  }
  const cfg = dev.configuration;
  if (!cfg) throw new Error("Нет активной USB-конфигурации");

  for (const intf of cfg.interfaces) {
    for (const alt of intf.alternates) {
      const out = (alt.endpoints || []).find(
        (e: any) => e.direction === "out" && e.type === "bulk"
      );
      if (!out) continue;

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
        } catch { }
        continue;
      }
      acquireUsbLock();
      usbState.outEP = out.endpointNumber;
      usbState.iface = intf.interfaceNumber;
      usbState.sessionReady = false;
      return {
        iface: intf.interfaceNumber,
        alt: needAlt,
        outEP: out.endpointNumber,
      };
    }
  }
  if (isUsbLockHeldByOtherTab()) {
    throw new Error(PRINTER_IN_USE_MESSAGE);
  }
  throw new Error(
    "Не удалось захватить интерфейс с bulk OUT. На Windows установите WinUSB (Zadig) и закройте другие приложения принтера."
  );
}
async function ensureUsbReadyAuto() {
  if (!("usb" in navigator)) throw new Error("WebUSB не поддерживается");
  attachUsbLockListenersOnce();
  if (isUsbLockHeldByOtherTab()) {
    throw new Error(PRINTER_IN_USE_MESSAGE);
  }
  if (usbState.dev) return usbState;
  if (!usbState.opening) {
    (usbState.opening as any) = (async () => {
      const dev = await tryUsbAutoConnect();
      if (!dev) return null;
      const info = await openUsbDevice(dev);
      usbState.dev = dev;
      usbState.outEP = info.outEP;
      usbState.iface = info.iface;
      return usbState;
    })().finally(() => (usbState.opening = null));
  }
  await usbState.opening;
  return usbState.dev ? usbState : null;
}

/**
 * Интерактивная проверка и подключение принтера.
 * Сначала пытается авто-подключиться к уже разрешённому устройству.
 * Если не найдено – показывает диалог выбора USB-устройства.
 * Возвращает true, если после этого принтер доступен.
 */
export async function ensurePrinterConnectedInteractively(options: any = {}) {
  if (!("usb" in navigator)) return false;

  if (isUsbLockHeldByOtherTab()) {
    console.warn("[PrintService]", PRINTER_IN_USE_MESSAGE);
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(PRINTER_IN_USE_MESSAGE);
    }
    return false;
  }

  // 1. Пытаемся автоматически подключиться к уже разрешённому устройству
  // (если не требуется принудительно показать окно выбора).
  if (!options?.forceChoose) {
    try {
      const state = await ensureUsbReadyAuto();
      if (state && usbState.dev) {
        return true;
      }
    } catch {
      // игнорируем и пробуем интерактивное подключение ниже
    }
  }

  // 2. Если авто-подключение не сработало – запрашиваем устройство у пользователя
  try {
    const dev = await requestUsbDevice();
    if (!dev) return false;

    // сохраняем VID/PID для будущих авто-подключений
    saveVidPidToLS(dev);

    // открываем устройство и захватываем интерфейс
    const info = await openUsbDevice(dev);

    usbState.dev = dev;
    usbState.outEP = info.outEP;
    usbState.iface = info.iface;

    return !!info?.outEP;
  } catch (e: any) {
    // Пользователь мог нажать Cancel или произошла другая ошибка
    console.warn("Не удалось подключить USB-принтер интерактивно:", e);
    return false;
  }
}

export function attachUsbListenersOnce() {
  if (!("usb" in navigator)) return;
  if ((attachUsbListenersOnce as any)._did) return;
  (attachUsbListenersOnce as any)._did = true;
  attachUsbLockListenersOnce();

  navUsb().addEventListener("connect", async (e: any) => {
    try {
      const savedVid = parseInt(localStorage.getItem("escpos_vid") || "", 16);
      const savedPid = parseInt(localStorage.getItem("escpos_pid") || "", 16);
      if (!savedVid || !savedPid) return;
      if (e.device.vendorId !== savedVid || e.device.productId !== savedPid)
        return;
      await openUsbDevice(e.device);
      usbState.dev = e.device;
    } catch (err: any) {
      console.warn("USB auto-connect failed:", err);
    }
  });

  navUsb().addEventListener("disconnect", (e: any) => {
    if (usbState.dev && e.device === usbState.dev) {
      usbState.dev = null;
      usbState.iface = null;
      resetUsbTransferState(usbState);
      releaseUsbLock();
    }
  });
}

export async function checkPrinterConnection() {
  if (!("usb" in navigator)) {
    console.warn("WebUSB не поддерживается в этом браузере");
    return false;
  }
  if (isUsbLockHeldByOtherTab()) {
    console.warn("[PrintService]", PRINTER_IN_USE_MESSAGE);
    return false;
  }
  try {
    const state = await ensureUsbReadyAuto();
    const connected = state !== null && usbState.dev !== null;
    console.log("[PrintService] checkPrinterConnection ->", {
      hasState: !!state,
      hasDevice: !!usbState.dev,
      connected,
    });
    return connected;
  } catch (err: any) {
    console.error(
      "[PrintService] Ошибка при проверке подключения принтера:",
      err
    );
    return false;
  }
}


export { saveVidPidToLS, requestUsbDevice, openUsbDevice, ensureUsbReadyAuto };
