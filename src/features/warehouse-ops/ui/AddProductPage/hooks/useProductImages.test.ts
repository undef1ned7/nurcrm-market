import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProductImages } from "./useProductImages";

vi.mock("@shared/ui/ImageCropperModal", async () => {
  const actual = await vi.importActual<
    typeof import("@shared/ui/ImageCropperModal")
  >("@shared/ui/ImageCropperModal");
  return {
    ...actual,
    prepareImageForCropper: vi.fn(async (file: File) => ({
      src: `blob:prepared-${file.name}`,
      revoke: vi.fn(),
      exifOrientation: 1,
      sourceMimeType: file.type || "image/jpeg",
      fileName: file.name,
    })),
  };
});

describe("useProductImages crop queue", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("opens cropper for a new file instead of appending immediately", async () => {
    const { result } = renderHook(() => useProductImages());
    const file = new File(["img"], "a.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addImages([file]);
    });

    await waitFor(() => {
      expect(result.current.imageCropper.open).toBe(true);
    });
    expect(result.current.images).toHaveLength(0);
    expect(result.current.imageCropper.imageSrc).toContain("prepared-a.jpg");
  });

  it("appends cropped file on apply, not the original", async () => {
    const { result } = renderHook(() => useProductImages());
    const original = new File(["orig"], "orig.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addImages([original]);
    });

    await waitFor(() => expect(result.current.imageCropper.open).toBe(true));

    const cropped = new File(["cropped"], "orig.jpg", { type: "image/jpeg" });
    act(() => {
      result.current.imageCropper.onCropComplete(cropped);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });
    expect(result.current.images[0].file).toBe(cropped);
    expect(result.current.images[0].file).not.toBe(original);
    expect(result.current.imageCropper.open).toBe(false);
  });

  it("cancel skips file and advances queue", async () => {
    const { result } = renderHook(() => useProductImages());
    const a = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const b = new File(["b"], "b.jpg", { type: "image/jpeg" });

    act(() => {
      result.current.addImages([a, b]);
    });

    await waitFor(() => expect(result.current.imageCropper.open).toBe(true));
    expect(result.current.imageCropper.fileName).toBe("a.jpg");

    act(() => {
      result.current.imageCropper.onClose();
    });

    await waitFor(() => {
      expect(result.current.imageCropper.fileName).toBe("b.jpg");
    });
    expect(result.current.images).toHaveLength(0);
  });
});
