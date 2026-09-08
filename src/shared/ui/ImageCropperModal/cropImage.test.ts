import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  combineRotationWithExif,
  exifOrientationToTransform,
  getCroppedImg,
  normalizeRotation,
  readJpegExifOrientation,
  rotateSize,
} from "./cropImage";

/** Minimal JPEG with APP1 Exif Orientation = `orientation` (II endian). */
function buildJpegWithOrientation(orientation: number): ArrayBuffer {
  // SOI
  const parts: number[] = [0xff, 0xd8];

  // APP1 length will be filled
  const app1Body: number[] = [];
  // Exif\0\0
  app1Body.push(0x45, 0x78, 0x69, 0x66, 0x00, 0x00);
  // TIFF II
  app1Body.push(0x49, 0x49, 0x2a, 0x00);
  // IFD0 offset = 8
  app1Body.push(0x08, 0x00, 0x00, 0x00);
  // 1 entry
  app1Body.push(0x01, 0x00);
  // tag 0x0112, type SHORT(3), count 1, value orientation
  app1Body.push(0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00);
  app1Body.push(orientation & 0xff, (orientation >> 8) & 0xff, 0x00, 0x00);
  // next IFD = 0
  app1Body.push(0x00, 0x00, 0x00, 0x00);

  const app1Len = app1Body.length + 2;
  parts.push(0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...app1Body);

  // SOF0 minimal 1x1
  parts.push(
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    0x00,
    0x01,
    0x00,
    0x01,
    0x01,
    0x01,
    0x11,
    0x00,
  );
  // SOS + EOI
  parts.push(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00);
  parts.push(0xff, 0xd9);

  return new Uint8Array(parts).buffer;
}

describe("normalizeRotation", () => {
  it("keeps values in [0, 360)", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(-450)).toBe(270);
  });

  it("normalizes non-finite to 0", () => {
    expect(normalizeRotation(Number.NaN)).toBe(0);
    expect(normalizeRotation(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("rotateSize", () => {
  it("swaps sides for 90° on a rectangle", () => {
    const size = rotateSize(200, 100, 90);
    expect(size.width).toBeCloseTo(100, 5);
    expect(size.height).toBeCloseTo(200, 5);
  });

  it("keeps sides for 0° / 180°", () => {
    expect(rotateSize(200, 100, 0).width).toBeCloseTo(200, 5);
    expect(rotateSize(200, 100, 180).width).toBeCloseTo(200, 5);
  });
});

describe("exifOrientationToTransform / combineRotationWithExif", () => {
  it("maps orientation 6 to 90° CW", () => {
    expect(exifOrientationToTransform(6)).toEqual({
      rotation: 90,
      flipH: false,
      flipV: false,
    });
  });

  it("adds EXIF rotation to user rotation", () => {
    expect(combineRotationWithExif(0, 6)).toBe(90);
    expect(combineRotationWithExif(90, 6)).toBe(180);
    expect(combineRotationWithExif(350, 6)).toBe(80);
  });
});

describe("readJpegExifOrientation", () => {
  it("returns 1 for non-JPEG", () => {
    expect(readJpegExifOrientation(new Uint8Array([0, 1, 2]).buffer)).toBe(1);
  });

  it("reads Orientation tag from EXIF", () => {
    expect(readJpegExifOrientation(buildJpegWithOrientation(6))).toBe(6);
    expect(readJpegExifOrientation(buildJpegWithOrientation(8))).toBe(8);
    expect(readJpegExifOrientation(buildJpegWithOrientation(3))).toBe(3);
  });
});

describe("getCroppedImg", () => {
  const makeCanvas = () => {
    const sizesLog: Array<{ w: number; h: number }> = [];
    let w = 0;
    let h = 0;
    const canvas = {
      get width() {
        return w;
      },
      set width(v: number) {
        w = Number(v);
        sizesLog.push({ w, h });
      },
      get height() {
        return h;
      },
      set height(v: number) {
        h = Number(v);
      },
      getContext: vi.fn(() => ({
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(
          (_x: number, _y: number, cw: number, ch: number) => ({
            data: new Uint8ClampedArray(Math.max(1, cw) * Math.max(1, ch) * 4),
            width: cw,
            height: ch,
          }),
        ),
        putImageData: vi.fn(),
      })),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob(["cropped"], { type: "image/jpeg" }));
      }),
      __sizesLog: sizesLog,
    };
    return canvas;
  };

  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class MockImage {
        width = 0;
        height = 0;
        crossOrigin = "";
        onload: (() => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        addEventListener(type: string, cb: () => void) {
          if (type === "load") this.onload = cb;
          if (type === "error") this.onerror = cb;
        }
        set src(_v: string) {
          this.width = 200;
          this.height = 100;
          queueMicrotask(() => this.onload?.());
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rotation=0 returns a blob (baseline crop)", async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") return makeCanvas() as unknown as HTMLCanvasElement;
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    const blob = await getCroppedImg(
      "blob:mock",
      { x: 10, y: 10, width: 50, height: 50 },
      0,
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/jpeg");
  });

  it("rotation=90 uses swapped bounding box for rectangle", async () => {
    const canvases: ReturnType<typeof makeCanvas>[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        const c = makeCanvas();
        canvases.push(c);
        return c as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    await getCroppedImg(
      "blob:mock",
      { x: 0, y: 0, width: 40, height: 40 },
      90,
    );

    const first = canvases[0];
    expect(first.width).toBe(100);
    expect(first.height).toBe(200);
  });
});

describe("EXIF correction path", () => {
  it("combineRotationWithExif applies orientation before user rotation", () => {
    // Phone photo with Orientation=6 (90° CW) + user +0 → effective 90
    expect(combineRotationWithExif(0, 6)).toBe(90);
    // Same photo, user adds another +90 → 180
    expect(combineRotationWithExif(90, 6)).toBe(180);
  });

  it("readJpegExifOrientation feeds combineRotationWithExif", () => {
    const orientation = readJpegExifOrientation(buildJpegWithOrientation(6));
    expect(orientation).toBe(6);
    expect(combineRotationWithExif(0, orientation)).toBe(90);
  });
});
