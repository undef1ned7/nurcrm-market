/** PDF → растер → ESC/POS */

import { ESC } from "./bytes";

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

/**
 * Ленивая загрузка pdf.js из локального `pdfjs-dist` (не CDN).
 * Worker Vite кладёт в hashed asset того же origin (`?url`) — это отдельный
 * запрос к нашему хосту, не к cdnjs. На критический путь кассы не попадает:
 * импорт выполняется только в PDF-фолбэке печати.
 */
async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function pdfBlobToCanvas(pdfBlob: any, targetWidth = 384) {
  const pdfjsLib = await loadPdfJs();
  const ab = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / viewport.width;
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas context is not available");
  canvas.width = Math.round(scaled.width);
  canvas.height = Math.round(scaled.height);
  await page.render({ canvasContext: ctx, viewport: scaled }).promise;
  return canvas;
}

export function canvasToRasterBytes(canvas: any, threshold = 180) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h).data;
  const bytesPerLine = Math.ceil(w / 8);
  const raster = new Uint8Array(bytesPerLine * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = img[i],
        g = img[i + 1],
        b = img[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum < threshold)
        raster[y * bytesPerLine + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { raster, w, h, bytesPerLine };
}

export function buildEscPosForRaster(
  raster: Uint8Array,
  bytesPerLine: number,
  h: number,
  opts: { includeCut?: boolean } = {},
) {
  const xL = bytesPerLine & 0xff;
  const xH = (bytesPerLine >> 8) & 0xff;
  const yL = h & 0xff;
  const yH = (h >> 8) & 0xff;

  const init = ESC(0x1b, 0x40);
  const alignLeft = ESC(0x1b, 0x61, 0x00);
  const header = ESC(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);
  const includeCut = opts.includeCut !== false;
  const tail = includeCut
    ? new Uint8Array([0x1b, 0x64, 0x01, 0x1d, 0x56, 0x00])
    : new Uint8Array(0);

  const total = new Uint8Array(
    init.length + alignLeft.length + header.length + raster.length + tail.length,
  );
  let o = 0;
  total.set(init, o);
  o += init.length;
  total.set(alignLeft, o);
  o += alignLeft.length;
  total.set(header, o);
  o += header.length;
  total.set(raster, o);
  o += raster.length;
  if (tail.length) total.set(tail, o);
  return total;
}
