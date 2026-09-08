import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import type { ComponentProps } from "react";
import ImageCropperModal from "./ImageCropperModal";

vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete, onZoomChange, onRotationChange }: any) => (
    <div data-testid="mock-cropper">
      <button
        type="button"
        data-testid="emit-crop"
        onClick={() =>
          onCropComplete?.(
            { x: 0, y: 0, width: 100, height: 100 },
            { x: 0, y: 0, width: 80, height: 80 },
          )
        }
      >
        emit
      </button>
      <button
        type="button"
        data-testid="emit-zoom"
        onClick={() => onZoomChange?.(2)}
      >
        zoom
      </button>
      <button
        type="button"
        data-testid="emit-rotation"
        onClick={() => onRotationChange?.(45)}
      >
        rotation
      </button>
    </div>
  ),
}));

vi.mock("./cropImage", async () => {
  const actual = await vi.importActual<typeof import("./cropImage")>("./cropImage");
  return {
    ...actual,
    getCroppedImg: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })),
  };
});

const resources = {
  ru: {
    translation: {
      common: {
        cancel: "Отмена",
        apply: "Применить",
        close: "Закрыть",
        saving: "Сохранение…",
      },
      crm: {
        imageCropper: {
          title: "Редактирование фото",
          zoom: "Масштаб",
          rotation: "Поворот",
          rotateCw: "Повернуть на 90° по часовой",
          rotateCcw: "Повернуть на 90° против часовой",
          applyError: "Ошибка кропа",
        },
      },
    },
  },
};

async function setupI18n() {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      lng: "ru",
      fallbackLng: "ru",
      resources,
      interpolation: { escapeValue: false },
    });
  }
}

function renderModal(props: Partial<ComponentProps<typeof ImageCropperModal>> = {}) {
  const onCropComplete = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <I18nextProvider i18n={i18n}>
      <ImageCropperModal
        open
        imageSrc="blob:test"
        fileName="photo.jpg"
        sourceMimeType="image/jpeg"
        onCropComplete={onCropComplete}
        onClose={onClose}
        {...props}
      />
    </I18nextProvider>,
  );
  return { ...result, onCropComplete, onClose };
}

describe("ImageCropperModal", () => {
  beforeEach(async () => {
    await setupI18n();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("renders title when open", () => {
    renderModal();
    expect(screen.getByText("Редактирование фото")).toBeTruthy();
    expect(screen.getByTestId("mock-cropper")).toBeTruthy();
  });

  it("does not render when closed", () => {
    renderModal({ open: false });
    expect(screen.queryByText("Редактирование фото")).toBeNull();
  });

  it("calls onClose on cancel and does not call onCropComplete", () => {
    const { onCropComplete, onClose } = renderModal();
    fireEvent.click(screen.getByText("Отмена"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCropComplete).not.toHaveBeenCalled();
  });

  it("±90° buttons change rotation label", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Повернуть на 90° по часовой"));
    expect(screen.getByText(/Поворот \(90°\)/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Повернуть на 90° против часовой"));
    expect(screen.getByText(/Поворот \(0°\)/)).toBeTruthy();
  });

  it("calls onCropComplete with File on Apply", async () => {
    const { onCropComplete, onClose } = renderModal();
    fireEvent.click(screen.getByTestId("emit-crop"));
    fireEvent.click(screen.getByText("Применить"));
    await waitFor(() => {
      expect(onCropComplete).toHaveBeenCalledTimes(1);
    });
    const file = onCropComplete.mock.calls[0][0];
    expect(file).toBeInstanceOf(File);
    expect(file.name).toMatch(/photo\.jpg$/i);
    expect(onClose).not.toHaveBeenCalled();
  });
});
