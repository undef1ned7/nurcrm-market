import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MARKET_CASHIER_SETTINGS,
  fetchMarketCashierSettings,
  normalizeMarketCashierSettings,
  verifyMarketCashierDeleteCode,
} from "@shared/api/marketCashierSettings";
import { parseDebtScheduleVersion } from "@entities/sale";
import { useUser } from "@entities/user";

/**
 * Настройки кассы «Магазина»: код на удаление позиции из корзины и
 * максимальный процент скидки для сотрудников.
 *
 * Пока эндпоинт настроек недоступен (бэк ещё не выкатил — 404/403), хук
 * деградирует мягко: код удаления берётся из legacy-поля
 * `company.cashier_password`, а ограничение скидки считается отсутствующим.
 */
export function useMarketCashierSettings({ enabled = true }: any = {}) {
  const { company }: any = useUser();
  const legacyCode = String(company?.cashier_password ?? "").trim();

  const [settings, setSettings] = useState<any>(DEFAULT_MARKET_CASHIER_SETTINGS);
  const [loading, setLoading] = useState(Boolean(enabled));
  // true — настройки пришли с бэка, false — работаем на legacy/дефолтах
  const [remoteAvailable, setRemoteAvailable] = useState(false);
  const remoteAvailableRef = useRef(false);
  const localCodeRef = useRef("");

  const loadRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchMarketCashierSettings();
        if (cancelled) return;
        const next = normalizeMarketCashierSettings(data);
        setSettings(next);
        setRemoteAvailable(true);
        remoteAvailableRef.current = true;
        localCodeRef.current = next.deleteCode;
      } catch (_e) {
        if (cancelled) return;
        // Эндпоинта ещё нет или нет прав — не ломаем кассу.
        setSettings(DEFAULT_MARKET_CASHIER_SETTINGS);
        setRemoteAvailable(false);
        remoteAvailableRef.current = false;
        localCodeRef.current = "";
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRef.current = run;
    run();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const refresh = useCallback(() => loadRef.current?.(), []);

  const effective = useMemo(() => {
    if (remoteAvailable) return settings;
    return {
      ...DEFAULT_MARKET_CASHIER_SETTINGS,
      deleteCodeRequired: Boolean(legacyCode),
      deleteCode: legacyCode,
      debtScheduleVersion: parseDebtScheduleVersion(
        company?.debt_schedule_version,
      ),
    };
  }, [remoteAvailable, settings, legacyCode, company?.debt_schedule_version]);

  useEffect(() => {
    if (!remoteAvailable) localCodeRef.current = legacyCode;
  }, [remoteAvailable, legacyCode]);

  /** Проверка кода: сначала на сервере, при недоступности — локально. */
  const verifyDeleteCode = useCallback(async (rawCode: any) => {
    const code = String(rawCode ?? "").trim();
    if (!code) return false;

    if (remoteAvailableRef.current) {
      try {
        return await verifyMarketCashierDeleteCode(code);
      } catch (error) {
        // Эндпоинт проверки недоступен — падаем на локальное сравнение,
        // если код известен фронту (владелец/админ), иначе отказ.
        if (!localCodeRef.current) throw error;
      }
    }

    return Boolean(localCodeRef.current) && code === localCodeRef.current;
  }, []);

  return {
    /** Нужен ли код при удалении позиции из корзины. */
    deleteCodeRequired: effective.deleteCodeRequired,
    /** Максимальная скидка в % (null — без ограничения). */
    maxDiscountPercent: effective.maxDiscountPercent,
    /** v1 — классическая отсрочка, v2 — график дни/месяцы. */
    debtScheduleVersion: effective.debtScheduleVersion,
    loading,
    remoteAvailable,
    verifyDeleteCode,
    refresh,
  };
}

export default useMarketCashierSettings;
