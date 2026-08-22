import React, { useState, useMemo, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useUser } from "@entities/user";
import { useCash } from "@entities/cash";
import { isStartPlan } from "@shared/lib/subscriptionPlan";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import { ChartJS } from "../analytics.charts";
import {
  translateLowStockStatus,
  normalizeLowStockStatusType,
  barPercentOfMax,
  sortStockList,
} from "../analytics.utils";
import { useAnalyticsFetch } from "./analytics/useAnalyticsFetch";
import { useAnalyticsModals } from "./analytics/useAnalyticsModals";
import { useAnalyticsTabData } from "./analytics/useAnalyticsTabData";
import {
  formatNumber,
  formatAnalyticsQty,
  formatDateForChart,
  formatCurrency,
  formatDateForAPI,
  mapTabToAPI,
} from "./analytics/formatters";

const DEFAULT_FILTERS: any = {
  branch: "",
  include_global: false,
  cashbox: "",
  shift: "",
  cashier: "",
  consultant: "",
  payment_method: "",
  min_total: "",
  max_total: "",
  purchase_date_from: "",
  purchase_date_to: "",
  product: "",
  category: "",
  kind: "",
  low_only: false,
  status: "",
  limit: "",
};

const DEFAULT_CASHBOX_NAME = "Основная касса";

export function useAnalyticsData() {
  const { t } = useTranslation();
  const { mode } = useContext(ThemeModeContext);
  const isDark = mode === "dark";
  const { company, currentUser } = useUser();
  const isStartTariff = isStartPlan(company?.subscription_plan?.name);
  const { list: cashBoxes } = useCash();
  const { list: branches } = useSelector(
    (state: any) => state.branches || { list: [] },
  );

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("market_analytics_tab") || "sales";
    } catch {
      return "sales";
    }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [openProductTable, setOpenProductTable] = useState("topByRevenue");
  const [openFinanceTable, setOpenFinanceTable] = useState("expenseBreakdown");
  const [stockSort, setStockSort] = useState("none");
  const [expandedUserPerformanceId, setExpandedUserPerformanceId] =
    useState(null);

  const [period, setPeriod] = useState(() => {
    try {
      const raw = localStorage.getItem("market_analytics_period");
      if (raw) {
        const p = JSON.parse(raw);
        const from = new Date(p.from);
        const to = new Date(p.to);
        if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
          return { from, to };
        }
      }
    } catch {
      /* ignore */
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });

  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem("market_analytics_filters");
      if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_FILTERS };
  });

  useEffect(() => {
    if (!isDark) return undefined;
    const prevColor = ChartJS.defaults.color;
    const prevBorder = ChartJS.defaults.borderColor;
    ChartJS.defaults.color = "#cbd5e1";
    ChartJS.defaults.borderColor = "rgba(148, 163, 184, 0.25)";
    return () => {
      ChartJS.defaults.color = prevColor;
      ChartJS.defaults.borderColor = prevBorder;
    };
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem("market_analytics_tab", activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "market_analytics_period",
        JSON.stringify({
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }
  }, [period]);

  useEffect(() => {
    try {
      localStorage.setItem("market_analytics_filters", JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const currentDate = new Date();
  const monthName = currentDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const mainCashbox = useMemo(() => {
    if (!Array.isArray(cashBoxes) || cashBoxes.length === 0) return null;
    const getName = (box) => box?.name || box?.department_name || "";
    const norm = (v) =>
      String(v || "")
        .trim()
        .toLowerCase();
    const exact = cashBoxes.find(
      (box) => norm(getName(box)) === norm(DEFAULT_CASHBOX_NAME),
    );
    if (exact) return exact;
    const fuzzy = cashBoxes.find((box) =>
      norm(getName(box)).includes("основн"),
    );
    return fuzzy || cashBoxes[0] || null;
  }, [cashBoxes]);

  const mainCashboxId = mainCashbox?.id ? String(mainCashbox.id) : "";

  const mainCashboxTitle =
    mainCashbox?.name ||
    mainCashbox?.department_name ||
    t("crm.analytics.cashiers.mainCompanyCashbox");

  useEffect(() => {
    if (!mainCashboxId) return;
    setFilters((prev) => {
      const prevId = prev?.cashbox ? String(prev.cashbox) : "";
      if (prevId === mainCashboxId) return prev;
      return { ...prev, cashbox: mainCashboxId };
    });
  }, [mainCashboxId]);

  const {
    loading,
    error,
    analyticsData,
    salaryAnalyticsRows,
    fetchAnalytics,
  } = useAnalyticsFetch({ activeTab, period, filters });

  const modals = useAnalyticsModals({ period, filters });

  const resetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      cashbox: mainCashboxId || "",
    });
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const toggleProductTable = (key) => {
    setOpenProductTable((prev) => (prev === key ? null : key));
  };
  const toggleFinanceTable = (key) => {
    setOpenFinanceTable((prev) => (prev === key ? null : key));
  };

  const openProductAnchorSection = React.useCallback((key) => {
    const anchorId = `products-section-${key}`;
    setOpenProductTable(key);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${anchorId}`);
      window.setTimeout(() => {
        const target = document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 80);
    }
  }, []);

  const tabData = useAnalyticsTabData({
    analyticsData,
    activeTab,
    isStartTariff,
    stockSort,
    salaryAnalyticsRows,
  });

  return {
    normalizeLowStockStatusType,
    translateLowStockStatus,
    DEFAULT_CASHBOX_NAME,
    DEFAULT_FILTERS,
    activeTab,
    setActiveTab,
    analyticsData,
    error,
    loading,
    showFilters,
    setShowFilters,
    expandedUserPerformanceId,
    setExpandedUserPerformanceId,
    fetchAnalytics,
    filters,
    updateFilter,
    resetFilters,
    period,
    setPeriod,
    stockSort,
    setStockSort,
    openProductTable,
    openFinanceTable,
    toggleProductTable,
    toggleFinanceTable,
    openProductAnchorSection,
    isDark,
    isStartTariff,
    monthName,
    branches,
    cashBoxes,
    company,
    currentUser,
    mainCashbox,
    mainCashboxId,
    mainCashboxTitle,
    formatNumber,
    formatAnalyticsQty,
    formatDateForChart,
    formatCurrency,
    formatDateForAPI,
    mapTabToAPI,
    salaryAnalyticsRows,
    ...modals,
    ...tabData,
  };
}

export type AnalyticsVm = ReturnType<typeof useAnalyticsData>;
