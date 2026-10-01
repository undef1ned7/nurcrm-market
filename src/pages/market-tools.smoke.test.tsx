import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ru from "../../public/locales/ru/translation.json";

vi.mock("@shared/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
  },
}));

import KnowledgeBase from "./knowledge-base/ui/KnowledgeBase";
import ErrorLogPage from "./error-log/ui/ErrorLogPage";
import MarketCalculator from "./market-calculator/ui/MarketCalculator";
import { logError, clearErrorLog } from "@shared/lib/errorLog";

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
});

const makeStore = (profile: any) =>
  configureStore({
    reducer: {
      user: (state = { profile, currentUser: profile, company: { name: "ACME", subscription_plan: { name: "Стандарт" } } }) => state,
    },
  });

const wrap = (ui: React.ReactNode, profile: any = { role: "owner", email: "o@x.kg" }) =>
  render(
    <Provider store={makeStore(profile)}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nextProvider>
    </Provider>,
  );

describe("База знаний", () => {
  it("показывает разделы, статью и ищет по ключевым словам", () => {
    wrap(<KnowledgeBase />);
    expect(screen.getAllByText("Сводка: что это и откуда цифры").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText("Например: возврат, весы, смена"), {
      target: { value: "денежный ящик" },
    });
    expect(screen.getByText("Журнал ошибок: частые записи")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Например: возврат, весы, смена"), {
      target: { value: "несуществующее" },
    });
    expect(screen.getByText("Ничего не найдено")).toBeTruthy();
  });
});

describe("Журнал ошибок", () => {
  it("пустой журнал — «это хорошо», с записью — понятный текст и статус", () => {
    clearErrorLog();
    const first = wrap(<ErrorLogPage />);
    expect(screen.getByText("Журнал пуст")).toBeTruthy();
    first.unmount();
    clearErrorLog();
    logError("x", { code: "printer_error" });
    wrap(<ErrorLogPage />);
    expect(screen.getByText("Чековый принтер вернул ошибку печати")).toBeTruthy();
    expect(screen.getByText("Ошибка")).toBeTruthy();
    clearErrorLog();
  });
});

describe("Калькуляция", () => {
  it("цена от наценки: 35 сом + 30 % = 45,50", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "35" } });
    expect(screen.getByText(/45,50/)).toBeTruthy();
  });

  it("сотруднику без права «Аналитика» показывает, что включить", () => {
    wrap(<MarketCalculator />, { role: "cashier" });
    expect(screen.getByText(/право «Аналитика»/)).toBeTruthy();
  });

  it("скидка: маржа 30 %, скидка 10 % → в 1,5 раз(а)", () => {
    wrap(<MarketCalculator />);
    fireEvent.click(screen.getByRole("tab", { name: /Скидка и акция/ }));
    expect(screen.getByText("в 1,5 раз(а)")).toBeTruthy();
  });
});
