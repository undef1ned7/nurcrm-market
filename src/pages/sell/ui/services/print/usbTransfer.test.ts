import { describe, expect, it, vi, beforeEach } from "vitest";
import { ESC } from "./bytes";
import { transferEscPosBytes, resetUsbTransferState } from "./usbTransfer";

describe("transferEscPosBytes", () => {
  const state = {
    dev: null as USBDevice | null,
    outEP: 1,
    sessionReady: false,
  };

  beforeEach(() => {
    resetUsbTransferState(state);
    state.outEP = 1;
    vi.useFakeTimers();
  });

  it("sends ESC @ wake before first payload", async () => {
    const transfers: Uint8Array[] = [];
    const dev = {
      transferOut: vi.fn(async (_ep: number, data: Uint8Array) => {
        transfers.push(new Uint8Array(data));
      }),
    } as unknown as USBDevice;

    const payload = ESC(0x1b, 0x40, 0x1d, 0x56, 0x00);
    const promise = transferEscPosBytes(dev, 1, payload, state);
    await vi.runAllTimersAsync();
    await promise;

    expect(transfers[0]).toEqual(ESC(0x1b, 0x40));
    expect(state.sessionReady).toBe(true);
  });

  it("sends raster prefix separately when rasterPrefix is true", async () => {
    const transfers: Uint8Array[] = [];
    const dev = {
      transferOut: vi.fn(async (_ep: number, data: Uint8Array) => {
        transfers.push(new Uint8Array(data));
      }),
    } as unknown as USBDevice;

    state.sessionReady = true;
    const rasterBody = new Uint8Array(20).fill(0xff);
    const prefix = ESC(0x1b, 0x40, 0x1b, 0x61, 0x00, 0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, 0x10, 0x00);
    const all = new Uint8Array(prefix.length + rasterBody.length);
    all.set(prefix, 0);
    all.set(rasterBody, prefix.length);

    const promise = transferEscPosBytes(dev, 1, all, state, { rasterPrefix: true });
    await vi.runAllTimersAsync();
    await promise;

    expect(transfers[0].length).toBe(13);
    expect(transfers[0][5]).toBe(0x1d);
    expect(transfers[0][6]).toBe(0x76);
  });

  it("skips wake when skipWake is true", async () => {
    const transfers: Uint8Array[] = [];
    const dev = {
      transferOut: vi.fn(async (_ep: number, data: Uint8Array) => {
        transfers.push(new Uint8Array(data));
      }),
    } as unknown as USBDevice;

    const payload = ESC(0x1b, 0x40, 0x1b, 0x70, 0x00, 0x19, 0xfa, 0x0a);
    await transferEscPosBytes(dev, 1, payload, state, { skipWake: true });

    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual(payload);
    expect(state.sessionReady).toBe(false);
  });
});
