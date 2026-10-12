import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router";
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
  parseOperationAmount,
} from "./kassaUtils";
import { toDateInputValue } from "@shared/lib/period";

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
  // Местная дата, не UTC: toISOString() в UTC+6 до 06:00 давал вчерашний день (1-го — прошлый месяц).
  const [selectedMonth, setSelectedMonth] = useState(() =>
    toDateInputValue(new Date()).slice(0, 7)
  ); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date())
  ); // YYYY-MM-DD

  const [showFilter, setShowFilter] = useState(false);
  // Заявка на редактирование/отмену движения: { mode: "edit" | "cancel", flow } | null
  const [flowChange, setFlowChange] = useState<any>(null);
  const canRequestFlowChange =
    isCashFlowChangeRequestsEnabled() && cashflowRequestsEnabled;
  const [showAddCashboxModal, setShowAddCashboxModal] = useState(false);
  const [selectedCashbox, setSelectedCashbox] = useState<any>(null);
  const [showEditCashboxModal, setShowEditCashboxModal] = useState(false);
  // Защита от повторной отправки «Добавить»: ref — синхронно, state — для disabled кнопки.
  const [addingOperation, setAddingOperation] = useState(false);
  const addingOperationRef = useRef(false);
  const [newCashbox, setNewCashbox] = useState<any>({
    name: "",
    amount: "", // строка из поля ввода — иначе нельзя набрать «15.5»
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
      let data: any = null;
      // Эндпоинт .../detail/owner/ доступен только владельцу/админу (бэк отдаёт 404
      // сотруднику, у которого нет прав видеть этот срез) — при отказе откатываемся
      // на менее детальные контракты, как и в src/features/kassa/ui/Kassa.tsx.
      if (company?.subscription_plan?.name !== "Старт") {
        try {
          data = (await api.get(`/construction/cashboxes/${idToFetch}/detail/owner/`)).data;
        } catch { /* нет прав владельца — пробуем менее детальный контракт */ }
        if (!data) {
          try {
            data = (await api.get(`/construction/cashboxes/${idToFetch}/detail/`)).data;
          } catch { /* тоже недоступно — берём базовую карточку кассы */ }
        }
      }
      if (!data) {
        data = (await api.get(`/construction/cashboxes/${idToFetch}/`)).data;
      }
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
        // null/объект вместо списка и битые элементы (null) не должны ронять весь список.
        const rawFlows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        const flows = rawFlows.filter((f: any) => f != null && typeof f === "object");
        const pageNum = Math.max(1, page);
        const count = typeof data?.count === "number" ? data.count : null;
        const visibleFlows = flows.filter(isApprovedFlow);

        if (visibleFlows.length === 0 && pageNum > 1) {
          setFlowsPage(pageNum - 1);
          return;
        }

        setFlowsList(flows);
        setFlowsTotalCount(count);
        setFlowsHasNext(
          Boolean(data?.next) ||
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
    if (addingOperationRef.current) return;
    const name = String(newCashbox.name ?? "").trim();
    const amount = parseOperationAmount(newCashbox.amount);
    if (!name || String(newCashbox.amount ?? "").trim() === "") {
      alert(t("crm.kassa.worker.errFillFields"), true);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert(t("crm.kassa.worker.errAmountPositive"), true);
      return;
    }
    addingOperationRef.current = true;
    setAddingOperation(true);
    try {
      await dispatch(
        addCashFlows({
          name,
          amount,
          cashbox: cashboxId,
          type: newCashbox.type,
          status: canApproveDirectly ? "approved" : "pending",
        })
      ).unwrap();

      setFlowsPage(1);
      await fetchCashboxDetails(cashboxId);
      await loadCashflowsPage(1);
      setShowAddCashboxModal(false);
      setNewCashbox({ name: "", amount: "", status: "", type: "expense" });
    } catch (err: any) {
      const errorMessage = validateResErrors(err, t("crm.kassa.worker.errAddOp"))
      alert(errorMessage, true)
    } finally {
      addingOperationRef.current = false;
      setAddingOperation(false);
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
  const filteredCashflows = useMemo(() => flowsList.filter(isApprovedFlow), [flowsList]);

  const handleResetFilters = useCallback(() => {
    setFilterSearch("");
    setDebouncedFilterSearch("");
    setActiveFlowType("all");
    setFlowsPage(1);
    setShowFilter(false);
  }, []);

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
    addingOperation,
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
