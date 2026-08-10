/* ============================================================
   A) WebUSB helpers (autoconnect)
   ============================================================ */

const usbState: any = { dev: null, opening: null };
const navUsb: any = (navigator as any).usb;

export async function tryUsbAutoConnect() {
  if (!("usb" in navigator)) throw new Error("Браузер не поддерживает WebUSB");
  const savedVid = parseInt(localStorage.getItem("escpos_vid") || "", 16);
  const savedPid = parseInt(localStorage.getItem("escpos_pid") || "", 16);
  const devs = await navUsb.getDevices();
  return (
    devs.find(
      (d: any) =>
        (!savedVid || d.vendorId === savedVid) &&
        (!savedPid || d.productId === savedPid)
    ) || null
  );
}

export async function openUsbDevice(dev: any) {
  if (!dev) throw new Error("USB устройство не найдено");
  if (!dev.opened) await dev.open();
  if (dev.configuration == null) {
    await dev.selectConfiguration(1).catch(() => {});
    if (dev.configuration == null && dev.configurations?.length) {
      const cfgNum = dev.configurations[0]?.configurationValue ?? 1;
      await dev.selectConfiguration(cfgNum).catch(() => {});
    }
  }
  const cfg = dev.configuration;
  if (!cfg) throw new Error("USB configuration not selected");
  for (const iface of cfg.interfaces) {
    for (const alt of iface.alternates) {
      const outEP = alt.endpoints.find((e: any) => e.direction === "out" && e.type === "bulk");
      if (outEP) {
        await dev.claimInterface(iface.interfaceNumber).catch(() => {});
        return { outEP: outEP.endpointNumber };
      }
    }
  }
  throw new Error(
    "Не удалось захватить интерфейс с bulk OUT. На Windows установите WinUSB (Zadig) и закройте другие приложения принтера."
  );
}

export async function ensureUsbReadyAuto() {
  if (!("usb" in navigator)) throw new Error("WebUSB не поддерживается");
  if (usbState.dev) return usbState;
  if (!usbState.opening) {
    usbState.opening = (async () => {
      const dev = await tryUsbAutoConnect();
      if (!dev) return null;
      await openUsbDevice(dev);
      usbState.dev = dev;
      return usbState;
    })().finally(() => (usbState.opening = null));
  }
  await usbState.opening;
  return usbState.dev ? usbState : null;
}

export function attachUsbListenersOnce() {
  if (!("usb" in navigator)) return;
  const self: any = attachUsbListenersOnce;
  if (self._did) return;
  self._did = true;

  navUsb.addEventListener("connect", async (e: any) => {
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

  navUsb.addEventListener("disconnect", (e: any) => {
    if (usbState.dev && e.device === usbState.dev) {
      usbState.dev = null;
    }
  });
}
