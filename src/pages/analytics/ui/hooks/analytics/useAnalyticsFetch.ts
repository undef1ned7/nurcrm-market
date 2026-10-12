import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "@shared/api";
import { MARKET_ANALYTICS_TIMEOUT_MS } from "../../analytics.constants";
import { formatDateForAPI, mapTabToAPI } from "./formatters";

export function useAnalyticsFetch({ activeTab, period, filters }: any) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<any>(false);
  const [error, setError] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [salaryAnalyticsRows, setSalaryAnalyticsRows] = useState<any[]>([]);
  // Защита от гонки: ответ предыдущей вкладки/фильтра не перезаписывает новый
  const requestSeqRef = React.useRef(0);

const fetchAnalytics = React.useCallback(
  async (tab = "sales") => {
    const seq = ++requestSeqRef.current;
    const isStale = () => seq !== requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      // Преобразуем внутреннее название вкладки в название для API
      const apiTab = mapTabToAPI(tab);
      const params = {
        tab: apiTab,
        period_start: formatDateForAPI(period.from, true),
        period_end: formatDateForAPI(period.to, true),
      };

      // Добавляем branch и include_global если branch выбран
      if (filters.branch) {
        (params as any).branch = filters.branch;
        if (filters.include_global) {
          (params as any).include_global = "1";
        }
      }

      if (filters.limit) {
        (params as any).limit = filters.limit;
      }

      // Добавляем фильтры в зависимости от вкладки
      if (
        tab === "sales" ||
        tab === "cashiers" ||
        tab === "suppliers" ||
        tab === "purchases"
      ) {
        if (filters.cashbox) (params as any).cashbox = filters.cashbox;
        if (filters.shift) (params as any).shift = filters.shift;
        if (filters.cashier) (params as any).cashier = filters.cashier;
        if (filters.consultant) (params as any).consultant = filters.consultant;
        if (filters.payment_method)
          (params as any).payment_method = filters.payment_method;
        if (filters.min_total) (params as any).min_total = filters.min_total;
        if (filters.max_total) (params as any).max_total = filters.max_total;
        if (tab === "suppliers" || tab === "purchases") {
          if (filters.purchase_date_from) {
            (params as any).purchase_date_from = filters.purchase_date_from;
          }
          if (filters.purchase_date_to) {
            (params as any).purchase_date_to = filters.purchase_date_to;
          }
        }
      }

      if (tab === "warehouse") {
        if (filters.product) (params as any).product = filters.product;
        if (filters.category) (params as any).category = filters.category;
        if (filters.kind) (params as any).kind = filters.kind;
        if (filters.low_only) (params as any).low_only = "1";
      }

      if (tab === "products" && filters.supplier) {
        (params as any).supplier = filters.supplier;
      }

      if (tab === "abc") {
        (params as any).by = filters.abc_by || "product";
        (params as any).metric = filters.abc_metric || "revenue";
      }

      if (tab === "shifts") {
        if (filters.status) (params as any).status = filters.status;
        if (filters.cashbox) (params as any).cashbox = filters.cashbox;
        if (filters.cashier) (params as any).cashier = filters.cashier;
      }

      if (tab === "users" || tab === "finance") {
        if (filters.cashier) (params as any).cashier = filters.cashier;
        if (filters.consultant) (params as any).consultant = filters.consultant;
      }

      const response = await api.get("/main/analytics/market/", {
        params,
        timeout: MARKET_ANALYTICS_TIMEOUT_MS,
      });
      if (isStale()) return;
      setAnalyticsData(response.data);
      if (tab === "finance") {
        try {
          const salaryParams = {
            tab: "salary",
            period_start: formatDateForAPI(period.from, true),
            period_end: formatDateForAPI(period.to, true),
          };
          if (filters.branch) {
            (salaryParams as any).branch = filters.branch;
            if (filters.include_global) (salaryParams as any).include_global = "1";
          }
          if (filters.cashier) (salaryParams as any).cashier = filters.cashier;
          if (filters.consultant) {
            (salaryParams as any).consultant = filters.consultant;
          }
          const salaryResponse = await api.get("/main/analytics/market/", {
            params: salaryParams,
            timeout: MARKET_ANALYTICS_TIMEOUT_MS,
          });
          if (isStale()) return;
          setSalaryAnalyticsRows(
            Array.isArray(salaryResponse?.data?.rows)
              ? salaryResponse.data.rows
              : Array.isArray(salaryResponse?.data?.tables?.rows)
                ? salaryResponse.data.tables.rows
                : [],
          );
        } catch (salaryErr: any) {
          console.error("Ошибка при загрузке salary-аналитики:", salaryErr);
          setSalaryAnalyticsRows([]);
        }
      } else {
        setSalaryAnalyticsRows([]);
      }
    } catch (err: any) {
      if (isStale()) return;
      console.error("Ошибка при загрузке аналитики:", err);
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        (typeof err?.message === "string" &&
          err.message.toLowerCase().includes("timeout"));
      setError(
        err.response?.data?.detail ||
          (isTimeout
            ? t("crm.analytics.errors.timeout")
            : t("crm.analytics.errors.loadFailed")),
      );
      setSalaryAnalyticsRows([]);
    } finally {
      if (!isStale()) setLoading(false);
    }
  },
  [period.from, period.to, filters, t],
);

  useEffect(() => {
    fetchAnalytics(activeTab);
  }, [activeTab, fetchAnalytics]);

  return {
    loading,
    error,
    setError,
    analyticsData,
    setAnalyticsData,
    salaryAnalyticsRows,
    fetchAnalytics,
  };
}
 