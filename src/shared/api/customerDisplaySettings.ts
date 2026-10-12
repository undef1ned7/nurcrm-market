// API-клиент настроек «Второй экран покупателя» сферы «Магазин».
// Контракт описан в docs/backend/kassa/customer-display-settings-backend.md.
// Настройки — per-company (общие на все кассы магазина), правит owner/admin.
import api from "@shared/api";

export const CUSTOMER_DISPLAY_SETTINGS_URL = "/main/pos/customer-display-settings/";

export interface CustomerDisplaySlideDto {
  imageUrl: string;
  caption?: string;
}

export interface CustomerDisplaySettingsDto {
  enabled?: boolean;
  welcome_text?: string;
  theme?: "dark" | "light";
  slides?: CustomerDisplaySlideDto[];
}

export const fetchCustomerDisplaySettings = async (): Promise<CustomerDisplaySettingsDto> => {
  const { data } = await api.get(CUSTOMER_DISPLAY_SETTINGS_URL);
  return data ?? {};
};

export const updateCustomerDisplaySettings = async (
  patch: CustomerDisplaySettingsDto,
): Promise<CustomerDisplaySettingsDto> => {
  const { data } = await api.patch(CUSTOMER_DISPLAY_SETTINGS_URL, patch);
  return data ?? {};
};
