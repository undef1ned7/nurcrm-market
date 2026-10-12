import api from "@shared/api";
import {
  DEFAULT_EXCHANGE_TERM_SETTINGS,
  normalizeExchangeTermSettings,
  type ExchangeTermSettings,
} from "../lib/exchangeTerm";

const TTL_MS = 5 * 60_000;
let cache: { at: number; value: ExchangeTermSettings } | null = null;

/**
 * Срок обмена и категории «без обмена» из общих настроек кассы NurMarket
 * (`GET /main/app-settings/nurmarket-kassa/`). Нет настроек/ошибка — 14 дней,
 * категорий нет: предупреждение по сроку всё равно показываем.
 */
export async function fetchExchangeTermSettings(): Promise<ExchangeTermSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { data } = await api.get("/main/app-settings/nurmarket-kassa/");
    const value = normalizeExchangeTermSettings(data);
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_EXCHANGE_TERM_SETTINGS;
  }
}

export function resetExchangeTermSettingsCache() {
  cache = null;
}
