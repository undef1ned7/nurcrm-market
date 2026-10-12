/**
 * Pure helpers for canvas crop + JPEG EXIF Orientation.
 * react-easy-crop gives croppedAreaPixels in the displayed image space;
 * we bake EXIF into an upright bitmap before the cropper opens so preview
 * and canvas stay consistent across browsers.
 */

export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropOutputOptions = {
  mimeType?: string;
  quality?: number;
};

/** Normalize degrees into [0, 360). */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const mod = degrees % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function getRadianAngle(degrees: number): number {
  return (normalizeRotation(degrees) * Math.PI) / 180;
}

/** Bounding box size after rotating a rectangle by `rotation` degrees. */
export function rotateSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * EXIF Orientation → rotation (CW degrees) + optional flips.
 * Values per JEITA CP-3451.
 */
export function exifOrientationToTransform(orientation: number): {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
} {
  switch (orientation) {
    case 2:
      return { rotation: 0, flipH: true, flipV: false };
    case 3:
      return { rotation: 180, flipH: false, flipV: false };
    case 4:
      return { rotation: 0, flipH: false, flipV: true };
    case 5:
      return { rotation: 90, flipH: true, flipV: false };
    case 6:
      return { rotation: 90, flipH: false, flipV: false };
    case 7:
      return { rotation: 270, flipH: true, flipV: false };
    case 8:
      return { rotation: 270, flipH: false, flipV: false };
    case 1:
    default:
      return { rotation: 0, flipH: false, flipV: false };
  }
}

/** Effective canvas rotation = user rotation + EXIF rotation (mod 360). */
export function combineRotationWithExif(
  userRotation: number,
  exifOrientation: number,
): number {
  const { rotation } = exifOrientationToTransform(exifOrientation);
  return normalizeRotation(userRotation + rotation);
}

/**
 * Read JPEG EXIF Orientation (tag 0x0112). Returns 1 if missing / not JPEG.
 */
export function readJpegExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) {
    return 1;
  }

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffda) break; // SOS
    if (offset + 2 > view.byteLength) break;
    const size = view.getUint16(offset, false);
    if (size < 2 || offset + size > view.byteLength) break;

    if (marker === 0xffe1) {
      const exifStart = offset + 2;
      if (
        exifStart + 6 <= view.byteLength &&
        view.getUint32(exifStart, false) === 0x45786966 && // "Exif"
        view.getUint16(exifStart + 4, false) === 0x0000
      ) {
        const tiffOffset = exifStart + 6;
        const byteOrder = view.getUint16(tiffOffset, false);
        const little = byteOrder === 0x4949; // "II"
        if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) {
          offset += size;
          continue;
        }
        const magic = view.getUint16(tiffOffset + 2, little);
        if (magic !== 0x002a) {
          offset += size;
          continue;
        }
        const ifd0 = tiffOffset + view.getUint32(tiffOffset + 4, little);
        if (ifd0 + 2 > view.byteLength) break;
        const entries = view.getUint16(ifd0, little);
        for (let i = 0; i < entries; i += 1) {
          const entry = ifd0 + 2 + i * 12;
          if (entry + 12 > view.byteLength) break;
          const tag = view.getUint16(entry, little);
          if (tag === 0x0112) {
            const value = view.getUint16(entry + 8, little);
            if (value >= 1 && value <= 8) return value;
            return 1;
          }
        }
      }
    }
    offset += size;
  }
  return 1;
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

/**
 * Draw source image with EXIF orientation baked in (upright, no EXIF needed).
 */
export async function bakeExifOrientation(
  imageSrc: string,
  orientation: number,
  outputOptions: CropOutputOptions = {},
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const { rotation, flipH, flipV } = exifOrientationToTransform(orientation);

  if (rotation === 0 && !flipH && !flipV) {
    const res = await fetch(imageSrc);
    return res.blob();
  }

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bBoxWidth));
  canvas.height = Math.max(1, Math.round(bBoxHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  const mimeType = outputOptions.mimeType || "image/jpeg";
  const quality = outputOptions.quality ?? 0.92;

  return canvasToBlob(canvas, mimeType, quality);
}

/**
 * Crop after user rotation. `croppedAreaPixels` are relative to the
 * rotated bounding box (react-easy-crop contract).
 */
export async function getCroppedImg(
  imageSrc: string,
  croppedAreaPixels: CropAreaPixels,
  rotation = 0,
  outputOptions: CropOutputOptions = {},
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const normalizedRotation = normalizeRotation(rotation);

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    normalizedRotation,
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bBoxWidth));
  canvas.height = Math.max(1, Math.round(bBoxHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(getRadianAngle(normalizedRotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const x = Math.round(croppedAreaPixels.x);
  const y = Math.round(croppedAreaPixels.y);
  const w = Math.max(1, Math.round(croppedAreaPixels.width));
  const h = Math.max(1, Math.round(croppedAreaPixels.height));

  const data = ctx.getImageData(x, y, w, h);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("Canvas 2D context unavailable");
  cropCtx.putImageData(data, 0, 0);

  const mimeType = outputOptions.mimeType || "image/jpeg";
  const quality = outputOptions.quality ?? 0.85;

  return canvasToBlob(cropCanvas, mimeType, quality);
}

export function blobToFile(
  blob: Blob,
  fileName: string,
  mimeType?: string,
): File {
  const type = mimeType || blob.type || "image/jpeg";
  const safeName = ensureExtension(fileName, type);
  return new File([blob], safeName, { type, lastModified: Date.now() });
}

export function resolveOutputMimeType(sourceMimeType?: string): string {
  const mime = String(sourceMimeType || "").toLowerCase();
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

export async function prepareImageForCropper(file: File): Promise<{
  src: string;
  revoke: () => void;
  exifOrientation: number;
  sourceMimeType: string;
  fileName: string;
}> {
  const sourceMimeType = file.type || "image/jpeg";
  const fileName = file.name || "image.jpg";
  const rawUrl = URL.createObjectURL(file);

  let exifOrientation = 1;
  try {
    if (
      sourceMimeType === "image/jpeg" ||
      sourceMimeType === "image/jpg" ||
      /\.jpe?g$/i.test(fileName)
    ) {
      const buffer = await file.arrayBuffer();
      exifOrientation = readJpegExifOrientation(buffer);
    }
  } catch {
    exifOrientation = 1;
  }

  if (exifOrientation === 1) {
    return {
      src: rawUrl,
      revoke: () => URL.revokeObjectURL(rawUrl),
      exifOrientation,
      sourceMimeType,
      fileName,
    };
  }

  try {
    const baked = await bakeExifOrientation(rawUrl, exifOrientation, {
      mimeType: resolveOutputMimeType(sourceMimeType),
      quality: 0.92,
    });
    URL.revokeObjectURL(rawUrl);
    const bakedUrl = URL.createObjectURL(baked);
    return {
      src: bakedUrl,
      revoke: () => URL.revokeObjectURL(bakedUrl),
      exifOrientation,
      sourceMimeType,
      fileName,
    };
  } catch {
    return {
      src: rawUrl,
      revoke: () => URL.revokeObjectURL(rawUrl),
      exifOrientation,
      sourceMimeType,
      fileName,
    };
  }
}

function ensureExtension(fileName: string, mimeType: string): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "image";
  if (mimeType === "image/webp") return `${base}.webp`;
  return `${base}.jpg`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
