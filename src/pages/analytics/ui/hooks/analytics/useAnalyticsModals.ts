import React, { useState } from "react";
import api from "@shared/api";
import { saleStatusInfo } from "./formatters";

export function useAnalyticsModals({ period, filters }: any) {
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [txSales, setTxSales] = useState<any[]>([]);

  const openTransactions = React.useCallback(async () => {
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
      if (filters.cashier) params.cashier = filters.cashier;
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
      const filtered = list.filter((s: any) => {
        const t = new Date(s.created_at || s.paid_at || s.date).getTime();
        if (Number.isFinite(t) && (t < fromT || t > toT)) return false;
        if (pm && String(s.payment_method || "") !== String(pm)) return false;
        if (cb && String(s.cashbox || "") !== cb) return false;
        const total = Number(s.total || 0);
        if (minT != null && Number.isFinite(minT) && total < minT) return false;
        if (maxT != null && Number.isFinite(maxT) && total > maxT) return false;
        return true;
      });
      filtered.sort(
        (a: any, b: any) =>
          (new Date(b.created_at || b.paid_at || 0) as any) -
          (new Date(a.created_at || a.paid_at || 0) as any),
      );
      setTxSales(filtered);
    } catch {
      setTxError("Не удалось загрузить продажи");
      setTxSales([]);
    } finally {
      setTxLoading(false);
    }
  }, [period, filters]);

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
