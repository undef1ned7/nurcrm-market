/** PDF → растер → ESC/POS */

import { ESC } from "./bytes";

async function ensurePdfJs() {
  if (typeof window === "undefined") throw new Error("No window");
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Не удалось загрузить pdf.js"));
    document.head.appendChild(s);
  });
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return (window as any).pdfjsLib;
}

export async function pdfBlobToCanvas(pdfBlob: any, targetWidth = 384) {
  const pdfjsLib = await ensurePdfJs();
  const ab = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / viewport.width;
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
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

export function buildEscPosForRaster(raster: any, bytesPerLine: any, h: any) {
  const xL = bytesPerLine & 0xff;
  const xH = (bytesPerLine >> 8) & 0xff;
  const yL = h & 0xff;
  const yH = (h >> 8) & 0xff;

  const init = ESC(0x1b, 0x40);
  const alignLeft = ESC(0x1b, 0x61, 0x00);
  const header = ESC(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);

  // компактная подача + рез
  const feedAndCut = new Uint8Array([0x1b, 0x64, 0x01, 0x1d, 0x56, 0x00]);


  const total = new Uint8Array(
    init.length +
    alignLeft.length +
    header.length +
    raster.length +
    feedAndCut.length
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
  total.set(feedAndCut, o);
  return total;
}
