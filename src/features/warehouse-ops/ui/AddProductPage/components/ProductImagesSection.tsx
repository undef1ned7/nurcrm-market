import React from "react";
import { useTranslation } from "react-i18next";
import ImageCropperModal from "@shared/ui/ImageCropperModal";
import { FormBlock } from "../formLayout";

/**
 * Product image upload + sequential cropper for new local files.
 */
const ProductImagesSection = ({
  images,
  fileInputRef,
  onImageAdd,
  onImageRemove,
  onSetPrimary,
  imageCropper = null,
}: any) => {
  const { t } = useTranslation();

  return (
    <FormBlock id="images">
      <div className="market-product-form__section">
        <h3 className="market-product-form__section-title">
          {t("crm.warehouse.productImages.title")}
        </h3>
        <div className="market-product-form__image-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                onImageAdd(files);
              }
            }}
          />
          <div
            className="market-product-form__image-placeholder"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files || []).filter((f) =>
                f.type.startsWith("image/"),
              );
              onImageAdd(files);
            }}
            style={{ cursor: "pointer" }}
          >
            <p>{t("crm.warehouse.productImages.pickHint")}</p>
            <p>{t("crm.warehouse.productImages.dropHint")}</p>
            <button
              type="button"
              className="market-product-form__image-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              +
            </button>
          </div>
          {images.length > 0 && (
            <div className="market-product-form__image-list">
              {images.map((img, idx) => (
                <div key={idx} className="market-product-form__image-item">
                  <img
                    src={img.preview}
                    alt={img.alt || t("crm.warehouse.productImages.previewAlt")}
                    className="market-product-form__image-preview"
                  />
                  <button
                    type="button"
                    className="market-product-form__image-remove"
                    onClick={() => onImageRemove(idx)}
                  >
                    ×
                  </button>
                  {img.is_primary && (
                    <span className="market-product-form__image-primary">
                      {t("crm.warehouse.productImages.primary")}
                    </span>
                  )}
                  <button
                    type="button"
                    className="market-product-form__image-set-primary"
                    onClick={() => onSetPrimary(idx)}
                  >
                    {img.is_primary
                      ? t("crm.warehouse.productImages.primary")
                      : t("crm.warehouse.productImages.setPrimary")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {imageCropper ? (
        <ImageCropperModal
          open={imageCropper.open}
          imageSrc={imageCropper.imageSrc}
          fileName={imageCropper.fileName}
          sourceMimeType={imageCropper.sourceMimeType}
          aspectRatio={1}
          onCropComplete={imageCropper.onCropComplete}
          onClose={imageCropper.onClose}
        />
      ) : null}
    </FormBlock>
  );
};

export default React.memo(ProductImagesSection);
