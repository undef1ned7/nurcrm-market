import { useCallback, useEffect, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import { normalizeRotation } from "./cropImage";

const DEFAULT_ZOOM = 1;
const DEFAULT_ROTATION = 0;
const DEFAULT_CROP: Point = { x: 0, y: 0 };

/**
 * Cropper UI state. Resets when `imageSrc` changes (next file in queue).
 */
export function useImageCropper(imageSrc: string | null | undefined) {
  const [crop, setCrop] = useState<Point>(DEFAULT_CROP);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [rotation, setRotation] = useState(DEFAULT_ROTATION);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
    setRotation(DEFAULT_ROTATION);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const rotateBy = useCallback((deltaDegrees: number) => {
    setRotation((prev) => normalizeRotation(prev + deltaDegrees));
  }, []);

  const setRotationNormalized = useCallback((value: number) => {
    setRotation(normalizeRotation(value));
  }, []);

  return {
    crop,
    setCrop,
    zoom,
    setZoom,
    rotation,
    setRotation: setRotationNormalized,
    rotateBy,
    croppedAreaPixels,
    onCropComplete,
  };
}
