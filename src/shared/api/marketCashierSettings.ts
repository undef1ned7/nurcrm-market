// API-клиент настроек кассы сферы «Магазин».
// Контракт описан в docs/backend/kassa/cashier-settings.md.
// Настройки задаёт владелец/админ компании, кассир получает их только на чтение.
import api from "@shared/api";

type DebtScheduleVersion = "v1" | "v2";

function parseDebtScheduleVersion(raw: unknown): DebtScheduleVersion {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "v1" || value === "1") return "v1";
  if (value === "v2" || value === "2") return "v2";
  return "v2";
}

export const MARKET_CASHIER_SETTINGS_URL = "/main/pos/cashier-settings/";
export const MARKET_CASHIER_VERIFY_DELETE_CODE_URL = `${MARKET_CASHIER_SETTINGS_URL}verify-delete-code/`;

/** Приводит процент из ответа к числу; null — лимита нет. */
const parsePercent = (raw: any) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(100, num);
};

/**
 * Нормализует ответ бэка в форму, удобную фронту.
 * `deleteCode` приходит только владельцу/админу — кассиру бэк отдаёт лишь флаг.
 */
export const normalizeMarketCashierSettings = (data: any) => {
  const code = String(data?.delete_item_code ?? "").trim();
  const required =
    data?.delete_item_code_required ?? data?.delete_item_code_set ?? Boolean(code);

  return {
    deleteCodeRequired: Boolean(required),
    deleteCode: code || "",
    maxDiscountPercent: parsePercent(data?.max_discount_percent),
    debtScheduleVersion: parseDebtScheduleVersion(
      data?.debt_schedule_version ?? data?.deferred_schedule_version,
    ),
    // Заявки на подтверждение (ручные приходы/расходы не-владельца, правка/
    // отмена одобренного движения). Нет поля на бэке = выключено (default).
    // @see docs/backend/kassa/cashflow-requests-toggle-backend.md
    cashflowRequestsEnabled: Boolean(data?.cashflow_requests_enabled),
  };
};

/** Значения по умолчанию: код не нужен, ограничения скидки нет, отсрочка v2, заявки выключены. */
export const DEFAULT_MARKET_CASHIER_SETTINGS: {
  deleteCodeRequired: boolean;
  deleteCode: string;
  maxDiscountPercent: number | null;
  debtScheduleVersion: DebtScheduleVersion;
  cashflowRequestsEnabled: boolean;
} = {
  deleteCodeRequired: false,
  deleteCode: "",
  maxDiscountPercent: null,
  debtScheduleVersion: "v2",
  cashflowRequestsEnabled: false,
};

/** GET — текущие настройки кассы компании. */
export const fetchMarketCashierSettings = async () => {
  const { data } = await api.get(MARKET_CASHIER_SETTINGS_URL);
  return data;
};

/**
 * PATCH — сохранение настроек (только владелец/админ).
 * `delete_item_code: ""` (или null) отключает запрос кода при удалении,
 * `max_discount_percent: null` снимает ограничение скидки.
 */
export const updateMarketCashierSettings = async (payload: any) => {
  const { data } = await api.patch(MARKET_CASHIER_SETTINGS_URL, payload);
  return data;
};

/** POST — проверка кода удаления на сервере. Возвращает true/false. */
export const verifyMarketCashierDeleteCode = async (code: any) => {
  const { data } = await api.post(MARKET_CASHIER_VERIFY_DELETE_CODE_URL, {
    code: String(code ?? "").trim(),
  });
  return Boolean(data?.valid ?? data?.is_valid ?? false);
};
