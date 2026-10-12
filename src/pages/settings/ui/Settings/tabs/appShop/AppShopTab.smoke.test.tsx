import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ru from "../../../../../../../public/locales/ru/translation.json";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));
// Карта в jsdom не нужна.
vi.mock("./ShopLocationMap", () => ({ ShopLocationMap: () => <div data-testid="map" /> }));

import { AppShopTab } from "./AppShopTab";

const i18n = i18next.createInstance();
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
});

const settings = (over: Record<string, any> = {}) => ({
  show_in_app: true,
  visible_in_app: false,
  reason: "no_address",
  address: "",
  phone: "",
  working_hours: "",
  latitude: null,
  longitude: null,
  bonus_enabled: true,
  bonus_percent: 5,
  branches: [],
  ...over,
});

const mount = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AppShopTab companyName="NBS" />
      </MemoryRouter>
    </I18nextProvider>,
  );

describe("Магазин в приложении", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.patch.mockReset();
  });

  it("показывает статус, сохраняет и обновляет статус из ответа", async () => {
    apiMock.get.mockResolvedValue({ data: settings() });
    apiMock.patch.mockResolvedValue({
      data: settings({ address: "Бишкек, Киевская 1", visible_in_app: true, reason: null }),
    });
    mount();

    expect(await screen.findAllByText("Укажите адрес, чтобы магазин появился на карте")).not.toHaveLength(0);
    const save = screen.getByRole("button", { name: "Сохранить" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Адрес/), { target: { value: "Бишкек, Киевская 1" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    await screen.findByText("Сохранено. Магазин появится в приложении в течение минуты");
    expect(apiMock.patch).toHaveBeenCalledWith("/main/app-shop-settings/", { address: "Бишкек, Киевская 1" });
    expect(screen.getAllByText("Магазин виден на карте в приложении")).not.toHaveLength(0);
  });

  it("нет связи — форма не теряет ввод, есть «Повторить»", async () => {
    apiMock.get.mockResolvedValue({ data: settings() });
    apiMock.patch.mockRejectedValueOnce(new Error("Network Error"));
    mount();

    const address = (await screen.findByLabelText(/Адрес/)) as HTMLInputElement;
    fireEvent.change(address, { target: { value: "Ош" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await screen.findByText("Не удалось сохранить. Проверьте интернет");
    expect(address.value).toBe("Ош");
    apiMock.patch.mockResolvedValueOnce({ data: settings({ address: "Ош" }) });
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(2));
  });

  it("процент вне 0–100 не даёт сохранить", async () => {
    apiMock.get.mockResolvedValue({ data: settings() });
    mount();
    fireEvent.change(await screen.findByLabelText("Процент от покупки"), { target: { value: "150" } });
    expect(screen.getByText("Укажите процент от 0 до 100")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Сохранить" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("403 client_app_payment_required — сообщение вместо формы", async () => {
    apiMock.get.mockRejectedValue({ response: { status: 403, data: { code: "client_app_payment_required" } } });
    mount();
    expect(await screen.findByText("Бесплатный период закончился")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Сохранить" })).toBeNull();
  });

  it("филиалы: список со статусами и форма выбранного", async () => {
    apiMock.get.mockResolvedValue({
      data: settings({
        branches: [{ id: 3, name: "Филиал Юг", show_in_app: false, visible_in_app: false, reason: "disabled", address: "Ош" }],
      }),
    });
    mount();
    fireEvent.click(await screen.findByText("Филиал Юг"));
    expect((screen.getByLabelText(/Адрес/) as HTMLInputElement).value).toBe("Ош");
    expect(screen.getAllByText("Показ выключен")).not.toHaveLength(0);
  });
});
