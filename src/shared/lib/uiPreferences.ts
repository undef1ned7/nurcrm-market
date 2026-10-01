// Синхронизация персональных UI-настроек (сайдбар, тема, кнопка кассы) между
// localStorage (мгновенный локальный кэш, без него — мигание при первой отрисовке)
// и бэком (источник правды, переживает смену устройства/браузера).
//
// Пока бэк не задеплоен — fetch/patch молча проваливаются, приложение работает
// как раньше, только на localStorage. Контракт: docs/backend/settings/ui-preferences-backend.md.
import {
  fetchUiPreferences,
  updateUiPreferences,
  type UiPreferencesDto,
} from "@shared/api/uiPreferences";
import { CASHIER_DESKTOP_BUTTON_STORAGE_KEY } from "@shared/lib/desktopCashierApp";
import { THEME_MODE_STORAGE_KEY, DARK_PALETTE_STORAGE_KEY } from "@shared/theme/themeStorageKeys";

export const SIDEBAR_AUTO_CLOSE_STORAGE_KEY = "sidebarAutoClose";

/** Событие на window: локальный кэш (localStorage) обновился данными с бэка. */
export const UI_PREFERENCES_SYNCED_EVENT = "ui-preferences-synced";

/** Пишет пришедшие с бэка поля в localStorage и уведомляет открытые компоненты. */
function applyUiPreferencesToStorage(prefs: UiPreferencesDto) {
  try {
    if (typeof prefs.sidebar_auto_close === "boolean") {
      localStorage.setItem(
        SIDEBAR_AUTO_CLOSE_STORAGE_KEY,
        String(prefs.sidebar_auto_close),
      );
    }
    if (typeof prefs.cashier_desktop_download === "boolean") {
      localStorage.setItem(
        CASHIER_DESKTOP_BUTTON_STORAGE_KEY,
        String(prefs.cashier_desktop_download),
      );
    }
    if (prefs.theme_mode === "light" || prefs.theme_mode === "dark") {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, prefs.theme_mode);
    }
    if (prefs.theme_dark_palette === "soft" || prefs.theme_dark_palette === "classic") {
      localStorage.setItem(DARK_PALETTE_STORAGE_KEY, prefs.theme_dark_palette);
    }
  } catch {
    return;
  }
  window.dispatchEvent(new Event(UI_PREFERENCES_SYNCED_EVENT));
}

/** Подтягивает настройки с бэка при старте сессии (см. getProfile в userSlice). */
export async function syncUiPreferencesFromBackend() {
  try {
    const prefs = await fetchUiPreferences();
    if (prefs && typeof prefs === "object") {
      applyUiPreferencesToStorage(prefs);
    }
  } catch {
    // Бэк недоступен/не задеплоен — остаёмся на локальном кэше.
  }
}

/** Отправляет изменённую настройку на бэк. Fire-and-forget — UI уже обновлён локально. */
export function pushUiPreferenceUpdate(patch: UiPreferencesDto) {
  updateUiPreferences(patch).catch(() => {
    // Молча игнорируем: значение уже сохранено в localStorage как локальный кэш.
  });
}
