import { useCallback, useEffect, useState, type MouseEvent } from "react";
import Cropper from "react-easy-crop";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactPortal from "../Portal/ReactPortal";
import {
  blobToFile,
  getCroppedImg,
  resolveOutputMimeType,
} from "./cropImage";
import { useImageCropper } from "./useImageCropper";
import "react-easy-crop/react-easy-crop.css";
import "./ImageCropperModal.scss";

export type ImageCropperModalProps = {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  sourceMimeType?: string;
  aspectRatio?: number;
  onCropComplete: (croppedFile: File) => void;
  onClose: () => void;
};

const ImageCropperModal = ({
  open,
  imageSrc,
  fileName = "image.jpg",
  sourceMimeType,
  aspectRatio = 1,
  onCropComplete,
  onClose,
}: ImageCropperModalProps) => {
  const { t } = useTranslation();
  const {
    crop,
    setCrop,
    zoom,
    setZoom,
    rotation,
    setRotation,
    rotateBy,
    croppedAreaPixels,
    onCropComplete: onCropAreaComplete,
  } = useImageCropper(open ? imageSrc : null);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setApplyError("");
    setApplying(false);
  }, [imageSrc, open]);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels || applying) return;
    setApplying(true);
    setApplyError("");
    try {
      const mimeType = resolveOutputMimeType(sourceMimeType);
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, {
        mimeType,
        quality: 0.85,
      });
      const file = blobToFile(blob, fileName, mimeType);
      onCropComplete(file);
    } catch (err) {
      console.error("Image crop failed:", err);
      setApplyError(t("crm.imageCropper.applyError"));
    } finally {
      setApplying(false);
    }
  }, [
    applying,
    croppedAreaPixels,
    fileName,
    imageSrc,
    onCropComplete,
    rotation,
    sourceMimeType,
    t,
  ]);

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && !applying) {
      onClose();
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <ReactPortal wrapperId="image-cropper-modal">
      <div
        className="image-cropper-modal"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-cropper-modal-title"
      >
        <div
          className="image-cropper-modal__dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="image-cropper-modal__header">
            <h2 id="image-cropper-modal-title" className="image-cropper-modal__title">
              {t("crm.imageCropper.title")}
            </h2>
            <button
              type="button"
              className="image-cropper-modal__close"
              onClick={onClose}
              disabled={applying}
              aria-label={t("common.close")}
            >
              <X size={20} />
            </button>
          </div>

          <div className="image-cropper-modal__crop-wrap">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropAreaComplete}
            />
          </div>

          <div className="image-cropper-modal__controls">
            <label className="image-cropper-modal__control">
              <span className="image-cropper-modal__control-label">
                {t("crm.imageCropper.zoom")}
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label={t("crm.imageCropper.zoom")}
              />
            </label>

            <label className="image-cropper-modal__control">
              <span className="image-cropper-modal__control-label">
                {t("crm.imageCropper.rotation")} ({Math.round(rotation)}°)
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                aria-label={t("crm.imageCropper.rotation")}
              />
            </label>

            <div className="image-cropper-modal__rotate-btns">
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={() => rotateBy(-90)}
                disabled={applying}
                aria-label={t("crm.imageCropper.rotateCcw")}
              >
                <RotateCcw size={18} />
                <span>−90°</span>
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={() => rotateBy(90)}
                disabled={applying}
                aria-label={t("crm.imageCropper.rotateCw")}
              >
                <RotateCw size={18} />
                <span>+90°</span>
              </button>
            </div>

            {applyError ? (
              <p className="image-cropper-modal__error" role="alert">
                {applyError}
              </p>
            ) : null}
          </div>

          <div className="image-cropper-modal__footer">
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={onClose}
              disabled={applying}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => void handleApply()}
              disabled={applying || !croppedAreaPixels}
            >
              {applying ? t("common.saving") : t("common.apply")}
            </button>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
};

export default ImageCropperModal;
