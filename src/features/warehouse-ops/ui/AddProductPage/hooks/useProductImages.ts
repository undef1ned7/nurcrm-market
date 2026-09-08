import { useCallback, useRef, useState } from "react";
import { prepareImageForCropper } from "@shared/ui/ImageCropperModal";

type ProductImageItem = {
  file: File | null;
  alt: string;
  is_primary: boolean;
  preview: string;
  id?: string | number;
};

type CropSession = {
  src: string;
  revoke: () => void;
  fileName: string;
  sourceMimeType: string;
};

const toFileArray = (files: FileList | File[] | File | null | undefined): File[] => {
  if (!files) return [];
  if (files instanceof FileList) return Array.from(files);
  if (Array.isArray(files)) return files.filter((f) => f instanceof File);
  if (files instanceof File) return [files];
  return [];
};

/**
 * Product images state + sequential crop queue for new local files.
 */
export const useProductImages = () => {
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<File[]>([]);
  const busyRef = useRef(false);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);

  const appendCroppedImage = useCallback((file: File) => {
    setImages((prev) => [
      ...prev,
      {
        file,
        alt: "",
        is_primary: prev.length === 0,
        preview: URL.createObjectURL(file),
      },
    ]);
  }, []);

  const openNextInQueue = useCallback(async () => {
    if (busyRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setCropSession(null);
      return;
    }

    busyRef.current = true;
    try {
      const prepared = await prepareImageForCropper(next);
      setCropSession({
        src: prepared.src,
        revoke: prepared.revoke,
        fileName: prepared.fileName,
        sourceMimeType: prepared.sourceMimeType,
      });
    } catch (err) {
      console.warn("Failed to prepare image for cropper:", err);
      busyRef.current = false;
      await openNextInQueue();
    }
  }, []);

  const closeCropSession = useCallback(() => {
    setCropSession((prev) => {
      prev?.revoke();
      return null;
    });
    busyRef.current = false;
  }, []);

  /**
   * Enqueue local image files for cropping (input / drag&drop).
   * Server images (with id) are never passed here.
   */
  const addImages = useCallback(
    (files: FileList | File[] | File | null | undefined) => {
      const fileArray = toFileArray(files).filter((f) =>
        String(f.type || "").startsWith("image/"),
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (fileArray.length === 0) return;

      queueRef.current.push(...fileArray);
      if (!busyRef.current && !cropSession) {
        void openNextInQueue();
      }
    },
    [cropSession, openNextInQueue],
  );

  const handleCropComplete = useCallback(
    (croppedFile: File) => {
      appendCroppedImage(croppedFile);
      closeCropSession();
      void openNextInQueue();
    },
    [appendCroppedImage, closeCropSession, openNextInQueue],
  );

  const handleCropCancel = useCallback(() => {
    closeCropSession();
    void openNextInQueue();
  }, [closeCropSession, openNextInQueue]);

  const removeImage = (index: number) => {
    setImages((current) => {
      const image = current[index];
      if (image?.preview && String(image.preview).startsWith("blob:")) {
        URL.revokeObjectURL(image.preview);
      }
      const newImages = current.filter((_, i) => i !== index);
      if (
        image?.is_primary &&
        newImages.length > 0 &&
        !newImages.some((p) => p.is_primary)
      ) {
        newImages[0] = { ...newImages[0], is_primary: true };
      }
      return newImages;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((it, i) => ({
        ...it,
        is_primary: i === index,
      })),
    );
  };

  const updateImageAlt = (index: number, alt: string) => {
    setImages((prev) =>
      prev.map((it, i) => (i === index ? { ...it, alt } : it)),
    );
  };

  const loadImagesFromAPI = (apiImages: any[]) => {
    if (apiImages && apiImages.length > 0) {
      const loadedImages = apiImages.map((img) => ({
        file: null,
        alt: img.alt || "",
        is_primary: img.is_primary || false,
        preview: img.image_url || img.image || "",
        id: img.id,
      }));
      setImages(loadedImages);
    }
  };

  const clearImages = () => {
    setImages((current) => {
      current.forEach((img) => {
        if (img.preview && img.file) {
          URL.revokeObjectURL(img.preview);
        }
      });
      return [];
    });
  };

  return {
    images,
    setImages,
    fileInputRef,
    addImages,
    removeImage,
    setPrimaryImage,
    updateImageAlt,
    loadImagesFromAPI,
    clearImages,
    imageCropper: {
      open: Boolean(cropSession),
      imageSrc: cropSession?.src || "",
      fileName: cropSession?.fileName || "image.jpg",
      sourceMimeType: cropSession?.sourceMimeType,
      onCropComplete: handleCropComplete,
      onClose: handleCropCancel,
    },
  };
};
