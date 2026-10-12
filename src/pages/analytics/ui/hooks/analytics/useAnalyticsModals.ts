import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "@shared/api";
import { saleStatusInfo as baseSaleStatusInfo } from "./formatters";

export function useAnalyticsModals({ period, filters }: any) {
  const { t } = useTranslation();
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [txSales, setTxSales] = useState<any[]>([]);

  const saleStatusInfo = useCallback(
    (sale: any) => {
      const info = baseSaleStatusInfo(sale);
      const s = String(sale?.status || "").toLowerCase();
      if (s === "partial" || s === "partially_paid") {
        return { ...info, label: t("crm.analytics.saleStatus.partial") };
      }
      const labels: Record<string, string> = {
        canceled: t("crm.analytics.saleStatus.canceled"),
        debt: t("crm.analytics.saleStatus.debt"),
        paid: t("crm.analytics.saleStatus.paid"),
      };
      return { ...info, label: labels[info.variant] ?? info.label };
    },
    [t],
  );

  const openTransactions = useCallback(async () => {
    setShowTxModal(true);
    setTxLoading(true);
    setTxError("");
    try {
      const toYmd = (d: any) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;

      // Фильтр аналитики уходит на сервер через query-параметры
      const params: any = {
        date_from: toYmd(period.from),
        date_to: toYmd(period.to),
      };
      if (filters.payment_method) params.payment_method = filters.payment_method;
      if (filters.cashbox) params.cashbox = filters.cashbox;
      if (filters.shift) params.shift = filters.shift;
      if (filters.cashier) params.cashier = filters.cashier;
      if (filters.consultant) params.consultant = filters.consultant;
      if (filters.min_total !== "") params.min_total = filters.min_total;
      if (filters.max_total !== "") params.max_total = filters.max_total;

      const res = await api.get("/main/pos/sales/", { params });
      const list = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
          ? res.data
          : [];

      // Клиентский фильтр как fallback (если бэкенд ещё не учитывает params)
      const fromT = period.from.getTime();
      const toT = period.to.getTime();
      const pm = filters.payment_method;
      const cb = filters.cashbox ? String(filters.cashbox) : "";
      const minT = filters.min_total !== "" ? Number(filters.min_total) : null;
      const maxT = filters.max_total !== "" ? Number(filters.max_total) : null;
      // Время чека по контракту analytics.md: paid_at, fallback created_at
      const saleTime = (s: any) =>
        new Date(s.paid_at || s.created_at || s.date || 0).getTime();
      const filtered = list.filter((s: any) => {
        const t = saleTime(s);
        if (Number.isFinite(t) && (t < fromT || t > toT)) return false;
        if (pm && String(s.payment_method || "") !== String(pm)) return false;
        if (cb && String(s.cashbox || "") !== cb) return false;
        const total = Number(s.total || 0);
        if (minT != null && Number.isFinite(minT) && total < minT) return false;
        if (maxT != null && Number.isFinite(maxT) && total > maxT) return false;
        return true;
      });
      filtered.sort((a: any, b: any) => saleTime(b) - saleTime(a));
      setTxSales(filtered);
    } catch {
      setTxError(t("crm.analytics.errors.salesLoadFailed"));
      setTxSales([]);
    } finally {
      setTxLoading(false);
    }
  }, [period, filters, t]);

  return {
    showRevenueModal,
    setShowRevenueModal,
    showTxModal,
    setShowTxModal,
    txLoading,
    txError,
    txSales,
    openTransactions,
    saleStatusInfo,
  };
}
