import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@entities/user";
import { isMarketSectorName } from "@shared/lib/subscriptionPlan";
import {
  addCashFlows,
  fetchCashflowRequestsSetting,
  isCashFlowChangeRequestsEnabled,
  useCashFlowRealtimeEvent,
  useCashflowRequestsEnabled,
} from "@entities/cash";
import useResize from "@shared/hooks/useResize";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import api from "@shared/api";
import { useAppDispatch } from "@app/store";
import {
  fetchCashboxDailyReport,
  fetchCashboxMonthlyReport,
  shouldWarnReportTruncated,
} from "@entities/cash/lib/cashboxReportsApi";
import type { CashboxReportViewModel } from "@entities/cash/lib/cashboxReports.types";
import {
  CASHFLOWS_PAGE_SIZE,
  isApprovedFlow,
  dayKeyOf,
  dayLabelOf,
} from "./kassaUtils";

export function useKassa() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const alert = useAlert();
  const { t } = useTranslation();
  const cashboxId = id;
  const { company } = useUser();
  const { profile } = useUser();
  // На сфере Магазин операцию может добавить любой сотрудник (сразу approved, без запроса на одобрение)
  const isMarket = isMarketSectorName(company?.sector?.name);
  const cashflowRequestsEnabled = useCashflowRequestsEnabled();
  useEffect(() => {
    dispatch(fetchCashflowRequestsSetting() as any);
  }, [dispatch]);
  // «Запросы» выключены по умолчанию (настройка компании) — тогда approved сразу для всех.
  const canApproveDirectly =
    profile?.role === "owner" || isMarket || !cashflowRequestsEnabled;
  const [cashboxDetails, setCashboxDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showPending, setShowPending] = useState(false);

  // НОВОЕ СОСТОЯНИЕ ДЛЯ ФИЛЬТРАЦИИ ПОТОКОВ
  const [activeFlowType, setActiveFlowType] = useState("all"); // 'all', 'income', 'expense', "pending", "reports"
  const [reportType, setReportType] = useState("monthly"); // 'monthly', 'daily'
  const [reportData, setReportData] = useState<CashboxReportViewModel | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  ); // YYYY-MM-DD

  const [showFilter, setShowFilter] = useState(false);
  // Заявка на редактирование/отмену движения: { mode: "edit" | "cancel", flow } | null
  const [flowChange, setFlowChange] = useState<any>(null);
  const canRequestFlowChange =
    isCashFlowChangeRequestsEnabled() && cashflowRequestsEnabled;
  const [showAddCashboxModal, setShowAddCashboxModal] = useState(false);
  const [selectedCashbox, setSelectedCashbox] = useState<any>(null);
  const [showEditCashboxModal, setShowEditCashboxModal] = useState(false);
  const [newCashbox, setNewCashbox] = useState({
    name: "",
    amount: 0,
    status: canApproveDirectly ? 'approved' : 'pending',
    type: "expense", // Дефолтный тип для новой операции
  });

  const VIEW_STORAGE_KEY = "kassa-worker-det-view-mode";
  const getInitialViewMode = () => {
    if (typeof window === "undefined") return "table";
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "table" || saved === "cards") return saved;
    return "table";
  };
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const { isMobile } = useResize(({ isMobile }: any) => {
    setViewMode(prev => isMobile ? "cards" : prev);
  });


  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedFilterSearch, setDebouncedFilterSearch] = useState("");
  const [flowsList, setFlowsList] = useState<any[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsPage, setFlowsPage] = useState(1);
  const [flowsHasNext, setFlowsHasNext] = useState(false);
  const [flowsTotalCount, setFlowsTotalCount] = useState<any>(null);
  const filtersSigRef = useRef("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterSearch(filterSearch), 400);
    return () => clearTimeout(t);
  }, [filterSearch]);

  const fetchCashboxDetails = useCallback(async (idToFetch) => {
    if (!idToFetch) {
      setError(t("crm.kassa.worker.errNoId"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint =
        company?.subscription_plan?.name === "Старт"
          ? `/construction/cashboxes/${idToFetch}/`
          : `/construction/cashboxes/${idToFetch}/detail/owner/`;
      const { data } = await api.get(endpoint);
      setCashboxDetails(data);
      setSelectedCashbox(data);
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("crm.kassa.worker.errLoadDetails"))
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [company?.subscription_plan?.name, t]);

  useEffect(() => {
    if (cashboxId) {
      fetchCashboxDetails(cashboxId);
    } else {
      setError(t("crm.kassa.worker.errNoId"));
      setLoading(false);
    }
  }, [cashboxId, fetchCashboxDetails, t]);

  const loadCashflowsPage = useCallback(
    async (page) => {
      if (!cashboxId) return;
      if (activeFlowType === "pending" || activeFlowType === "reports") return;
      setFlowsLoading(true);
      try {
        const search = (debouncedFilterSearch || "").trim();
        const params: any = {
        cashbox: cashboxId,
        status: "approved",
          page_size: CASHFLOWS_PAGE_SIZE,
          page: Math.max(1, page),
        };
        if (search) params.search = search;
        if (activeFlowType && activeFlowType !== "all") params.type = activeFlowType;

        const { data } = await api.get("/construction/cashflows/", { params });
        const flows = Array.isArray(data) ? data : data.results || [];
        const pageNum = Math.max(1, page);
        const count = typeof data.count === "number" ? data.count : null;
        const visibleFlows = flows.filter(isApprovedFlow);

        if (visibleFlows.length === 0 && pageNum > 1) {
          setFlowsPage(pageNum - 1);
          return;
        }

        setFlowsList(flows);
        setFlowsTotalCount(count);
        setFlowsHasNext(
          Boolean(data.next) ||
            (count != null && pageNum * CASHFLOWS_PAGE_SIZE < count) ||
            (count == null && flows.length === CASHFLOWS_PAGE_SIZE),
        );
      } catch (err: any) {
        const errorMessage = validateResErrors(err, t("crm.kassa.worker.errLoadFlows"));
        alert(errorMessage, true);
        setFlowsList([]);
        setFlowsTotalCount(null);
        setFlowsHasNext(false);
      } finally {
        setFlowsLoading(false);
      }
    },
    [cashboxId, debouncedFilterSearch, activeFlowType, alert, t],
  );

  useEffect(() => {
    if (!cashboxId) return;
    if (activeFlowType === "pending" || activeFlowType === "reports") return;

    const search = (debouncedFilterSearch || "").trim();
    const sig = `${cashboxId}|${search}|${activeFlowType}`;
    const filtersChanged = filtersSigRef.current !== sig;
    if (filtersChanged) {
      filtersSigRef.current = sig;
      if (flowsPage !== 1) {
        setFlowsPage(1);
        return;
      }
    }
    void loadCashflowsPage(flowsPage);
  }, [cashboxId, debouncedFilterSearch, activeFlowType, flowsPage, loadCashflowsPage]);

  const handleAddCashbox = async () => {
    if (!newCashbox.name || !newCashbox.amount) {
      alert(t("crm.kassa.worker.errFillFields"), true);
      return;
    }
    try {
      await dispatch(
        addCashFlows({
          name: newCashbox.name,
          amount: newCashbox.amount,
          cashbox: cashboxId,
          type: newCashbox.type,
          status: canApproveDirectly ? "approved" : "pending",
        })
      ).unwrap();

      setFlowsPage(1);
      await fetchCashboxDetails(cashboxId);
      await loadCashflowsPage(1);
      setShowAddCashboxModal(false);
      setNewCashbox({ name: "", amount: 0, status: "", type: "expense" });
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("crm.kassa.worker.errAddOp"))
      alert(errorMessage, true)
    }
  };

  const handleEditCashbox = async () => {
    if (!selectedCashbox || !cashboxId) return;

    try {
      const { data: updatedCashbox } = await api.patch(
        `/construction/cashboxes/${cashboxId}/`,
        {
          title: selectedCashbox.title,
          department: selectedCashbox.department,
        }
      );

      setCashboxDetails(updatedCashbox);
      setShowEditCashboxModal(false);
      setSelectedCashbox(updatedCashbox);
      fetchCashboxDetails(cashboxId);
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("crm.kassa.worker.errUpdateCashbox"))
      setError(errorMessage);
    }
  };

  const openFlowChange = useCallback((mode, flow) => {
    if (!flow?.id) return;
    setFlowChange({ mode, flow });
  }, []);
  const closeFlowChange = useCallback(() => setFlowChange(null), []);
  const reloadAfterFlowChange = useCallback(() => {
    void fetchCashboxDetails(cashboxId);
    void loadCashflowsPage(flowsPage);
  }, [fetchCashboxDetails, cashboxId, loadCashflowsPage, flowsPage]);

  // Статус фильтрует сервер (?status=approved); клиентский фильтр — страховка от "true"
  const filteredCashflows = flowsList.filter(isApprovedFlow);

  const handleResetFilters = () => {
    setFilterSearch("");
    setDebouncedFilterSearch("");
    setActiveFlowType("all");
    setFlowsPage(1);
    setShowFilter(false);
  };

  const loadReport = useCallback(async () => {
    if (!cashboxId) return;
    setReportLoading(true);
    setError(null);
    try {
      const report =
        reportType === "monthly"
          ? await fetchCashboxMonthlyReport(cashboxId, selectedMonth)
          : await fetchCashboxDailyReport(cashboxId, selectedDate);

      if (shouldWarnReportTruncated(report)) {
        alert(t("crm.kassa.worker.warnReportTruncated"), true);
      }

      setReportData(report);
    } catch (err: any) {
      console.error("Failed to fetch cashbox report:", err);
      const errorMessage = validateResErrors(
        err,
        reportType === "monthly"
          ? t("crm.kassa.worker.errLoadMonthly")
          : t("crm.kassa.worker.errLoadDaily"),
      );
      setError(errorMessage);
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  }, [
    alert,
    cashboxId,
    reportType,
    selectedDate,
    selectedMonth,
    t,
  ]);

  useEffect(() => {
    if (activeFlowType === "reports" && cashboxId) {
      void loadReport();
    }
  }, [activeFlowType, cashboxId, loadReport]);

  // Другой владелец одобрил edit/cancel-заявку по этой кассе (на другом
  // устройстве/вкладке) — подхватываем свежие суммы без ручного релоада.
  // @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md §11 (R8)
  const cashFlowRealtimeEvent = useCashFlowRealtimeEvent();
  const lastRealtimeVersionRef = useRef(cashFlowRealtimeEvent.version);
  useEffect(() => {
    if (cashFlowRealtimeEvent.version === lastRealtimeVersionRef.current) return;
    lastRealtimeVersionRef.current = cashFlowRealtimeEvent.version;
    if (
      cashFlowRealtimeEvent.cashboxId &&
      cashboxId &&
      String(cashFlowRealtimeEvent.cashboxId) !== String(cashboxId)
    ) {
      return; // событие по другой кассе
    }
    reloadAfterFlowChange();
    if (activeFlowType === "reports" && cashboxId) void loadReport();
  }, [cashFlowRealtimeEvent, cashboxId, activeFlowType, reloadAfterFlowChange, loadReport]);


  useEffect(() => {
    if (error) {
      alert(validateResErrors(error, t("crm.kassa.worker.errLoadDataRetry")), true)
    }
  }, [error, alert, t])

  // if (error) {
  //   return (
  //     <div className="kassa-page">
  //       <div
  //         className="kassa__alert kassa__alert--error"
  //         style={{ padding: 16 }}
  //       >
  //         {error}
  //       </div>
  //     </div>
  //   );
  // }


  // if (!cashboxDetails) {
  //   return (
  //     <div className="kassa-page">
  //       <div className="kassa-table__empty" style={{ padding: 40 }}>
  //         Данные о кассе не доступны.
  //       </div>
  //     </div>
  //   );
  // }


  return {
    id,
    company,
    isMobile,
    dayKeyOf,
    dayLabelOf,
    activeFlowType,
    cashboxDetails,
    fetchCashboxDetails,
    filterSearch,
    setFilterSearch,
    filteredCashflows,
    flowsHasNext,
    flowsLoading,
    flowsPage,
    setFlowsPage,
    flowsTotalCount,
    handleAddCashbox,
    handleEditCashbox,
    handleResetFilters,
    canRequestFlowChange,
    cashflowRequestsEnabled,
    flowChange,
    openFlowChange,
    closeFlowChange,
    reloadAfterFlowChange,
    loading,
    newCashbox,
    setNewCashbox,
    reportData,
    reportLoading,
    reportType,
    setReportType,
    selectedCashbox,
    setSelectedCashbox,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    setActiveFlowType,
    setShowAddCashboxModal,
    setShowEditCashboxModal,
    setShowFilter,
    setShowPending,
    setViewMode,
    showAddCashboxModal,
    showEditCashboxModal,
    showFilter,
    showPending,
    viewMode,
    totalIncome: (reportData as any)?.totalIncome,
    totalExpense: (reportData as any)?.totalExpense,
  };
}
