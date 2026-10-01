// API-клиент персональных UI-настроек пользователя (сайдбар, тема, кнопка кассы).
// Контракт описан в docs/backend/settings/ui-preferences-backend.md.
// Настройки персональные (per-user), не привязаны к компании — у каждого сотрудника свои.
import api from "@shared/api";

export const UI_PREFERENCES_URL = "/users/ui-preferences/";

export type ThemeMode = "light" | "dark";
export type ThemeDarkPalette = "soft" | "classic";

export interface UiPreferencesDto {
  sidebar_auto_close?: boolean;
  cashier_desktop_download?: boolean;
  theme_mode?: ThemeMode;
  theme_dark_palette?: ThemeDarkPalette;
}

export const fetchUiPreferences = async (): Promise<UiPreferencesDto> => {
  const { data } = await api.get(UI_PREFERENCES_URL);
  return data ?? {};
};

export const updateUiPreferences = async (
  patch: UiPreferencesDto,
): Promise<UiPreferencesDto> => {
  const { data } = await api.patch(UI_PREFERENCES_URL, patch);
  return data ?? {};
};
