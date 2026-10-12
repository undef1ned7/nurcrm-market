/** Безопасная отправка ESC/POS на WebUSB (прогрев, чанки). */

import { ESC, chunkBytes } from "./bytes";

const WAKE_DELAY_MS = 120;
const RASTER_CMD_PREFIX_BYTES = 2 + 3 + 8; // ESC @ + align + GS v 0 header

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type UsbTransferState = {
  dev: USBDevice | null;
  outEP: number | null;
  sessionReady: boolean;
};

export function resetUsbTransferState(state: UsbTransferState) {
  state.outEP = null;
  state.sessionReady = false;
}

async function wakePrinterSession(dev: USBDevice, outEP: number, state: UsbTransferState) {
  if (state.sessionReady) return;
  await dev.transferOut(outEP, ESC(0x1b, 0x40));
  await delay(WAKE_DELAY_MS);
  state.sessionReady = true;
}

/**
 * Отправка ESC/POS-буфера на принтер.
 * Перед первой отправкой в сессии — ESC @ и пауза (иначе первая печать часто «иероглифами»).
 * Для растра (GS v 0) заголовок команды уходит отдельным пакетом, чтобы не резать ESC-последовательность.
 */
export async function transferEscPosBytes(
  dev: USBDevice,
  outEP: number,
  bytes: Uint8Array,
  state: UsbTransferState,
  opts: { rasterPrefix?: boolean; skipWake?: boolean } = {},
) {
  if (!opts.skipWake) {
    await wakePrinterSession(dev, outEP, state);
  }

  const useRasterPrefix =
    opts.rasterPrefix &&
    bytes.length > RASTER_CMD_PREFIX_BYTES &&
    bytes[0] === 0x1b &&
    bytes[1] === 0x40 &&
    bytes[5] === 0x1d &&
    bytes[6] === 0x76;

  if (useRasterPrefix) {
    await dev.transferOut(outEP, bytes.subarray(0, RASTER_CMD_PREFIX_BYTES));
    await delay(40);
    for (const chunk of chunkBytes(bytes.subarray(RASTER_CMD_PREFIX_BYTES))) {
      await dev.transferOut(outEP, chunk);
    }
    return;
  }

  for (const chunk of chunkBytes(bytes)) {
    await dev.transferOut(outEP, chunk);
  }
}

export { RASTER_CMD_PREFIX_BYTES };
