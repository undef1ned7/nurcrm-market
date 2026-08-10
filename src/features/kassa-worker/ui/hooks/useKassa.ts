import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@entities/user";
import { isMarketSectorName } from "@shared/lib/subscriptionPlan";
import { addCashFlows } from "@entities/cash";
import useResize from "@shared/hooks/useResize";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import api from "@shared/api";
import { useAppDispatch } from "@app/store";
import {
  CASHFLOWS_PAGE_SIZE,
  REPORT_PAGE_SIZE,
  REPORT_MAX_PAGES,
  isApprovedFlow,
  dayKeyOf,
  dayLabelOf,
} from "./kassaUtils";

export function useKassa() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const alert = useAlert();
  const cashboxId = id;
  const { company } = useUser();
  const { profile } = useUser();
  // На сфере Магазин операцию может добавить любой сотрудник (сразу approved, без запроса на одобрение)
  const isMarket = isMarketSectorName(company?.sector?.name);
  const canApproveDirectly = profile?.role === "owner" || isMarket;
  const [cashboxDetails, setCashboxDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showPending, setShowPending] = useState(false);

  // НОВОЕ СОСТОЯНИЕ ДЛЯ ФИЛЬТРАЦИИ ПОТОКОВ
  const [activeFlowType, setActiveFlowType] = useState("all"); // 'all', 'income', 'expense', "pending", "reports"
  const [reportType, setReportType] = useState("monthly"); // 'monthly', 'daily'
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  ); // YYYY-MM-DD

  const [showFilter, setShowFilter] = useState(false);
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
      setError("ID кассы не указан в URL.");
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
      const errorMessage = validateResErrors(err, "Ошибка при загрузке данных кассы. ")
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [company?.subscription_plan?.name]);

  useEffect(() => {
    if (cashboxId) {
      fetchCashboxDetails(cashboxId);
    } else {
      setError("ID кассы не указан в URL.");
      setLoading(false);
    }
  }, [cashboxId, fetchCashboxDetails]);

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
        const errorMessage = validateResErrors(err, "Ошибка при загрузке потоков. ");
        alert(errorMessage, true);
        setFlowsList([]);
        setFlowsTotalCount(null);
        setFlowsHasNext(false);
      } finally {
        setFlowsLoading(false);
      }
    },
    [cashboxId, debouncedFilterSearch, activeFlowType, alert],
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
      alert("Пожалуйста, заполните все поля.", true);
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
      const errorMessage = validateResErrors(err, 'Не удалось добавить операцию по кассе. Пожалуйста, проверьте данные и попробуйте еще раз.')
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
      const errorMessage = validateResErrors(err, "Не удалось обновить кассу. Пожалуйста, проверьте данные и попробуйте еще раз.")
      setError(errorMessage);
    }
  };

  // Статус фильтрует сервер (?status=approved); клиентский фильтр — страховка от "true"
  const filteredCashflows = flowsList.filter(isApprovedFlow);

  const handleResetFilters = () => {
    setFilterSearch("");
    setDebouncedFilterSearch("");
    setActiveFlowType("all");
    setFlowsPage(1);
    setShowFilter(false);
  };

  // Загрузка всех страниц для отчётов (с защитой от бесконечного цикла)
  const fetchAllCashflows = async (baseParams) => {
    const allFlows: any[] = [];
    let page = 1;
    let guard = 0;
    let truncated = false;

    while (guard < REPORT_MAX_PAGES) {
      const { data } = await api.get("/construction/cashflows/", {
        params: { ...baseParams, page, page_size: REPORT_PAGE_SIZE },
      });
      const flows = Array.isArray(data) ? data : data?.results || [];
      allFlows.push(...flows);
      guard += 1;

      const hasNext =
        Boolean(data?.next) ||
        (typeof data?.count === "number" &&
          page * REPORT_PAGE_SIZE < data.count) ||
        (typeof data?.count !== "number" && flows.length === REPORT_PAGE_SIZE);

      if (!hasNext) break;
      page += 1;
      if (guard >= REPORT_MAX_PAGES) truncated = true;
    }

    return { flows: allFlows, truncated };
  };

  const fetchMonthlyReport = async () => {
    if (!cashboxId) return;
    setReportLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      // Период и статус фильтрует сервер (date_from/date_to включительно)
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const params: any = {
        cashbox: cashboxId,
        status: "approved",
        date_from: `${selectedMonth}-01`,
        date_to: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`,
      };
      const { flows, truncated } = await fetchAllCashflows(params);
      if (truncated) {
        alert(
          "Загружены не все операции за период (лимит отчёта). Уточните период или обратитесь к администратору.",
          true,
        );
      }

      // Группировка по дням
      const dailyGroups: any = {};
      flows.forEach((flow) => {
        const date = new Date(flow.created_at).toISOString().split("T")[0];
        if (!dailyGroups[date]) {
          dailyGroups[date] = { income: 0, expense: 0, flows: [] as any[] };
        }
        if (flow.type === "income") {
          dailyGroups[date].income += parseFloat(flow.amount) || 0;
        } else {
          dailyGroups[date].expense += parseFloat(flow.amount) || 0;
        }
        dailyGroups[date].flows.push(flow);
      });

      const totalIncome = flows
        .filter((f) => f.type === "income")
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      const totalExpense = flows
        .filter((f) => f.type === "expense")
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

      setReportData({
        type: "monthly",
        month: selectedMonth,
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        dailyGroups,
        flows,
      });
    } catch (err: any) {
      console.error("Failed to fetch monthly report:", err);
      setError(`Не удалось загрузить ежемесячный отчет: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchDailyReport = async () => {
    if (!cashboxId) return;
    setReportLoading(true);
    try {
      // Период и статус фильтрует сервер (date_from/date_to включительно)
      const params: any = {
        cashbox: cashboxId,
        status: "approved",
        date_from: selectedDate,
        date_to: selectedDate,
      };
      const { flows, truncated } = await fetchAllCashflows(params);
      if (truncated) {
        alert(
          "Загружены не все операции за период (лимит отчёта). Уточните период или обратитесь к администратору.",
          true,
        );
      }

      const totalIncome = flows
        .filter((f) => f.type === "income")
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      const totalExpense = flows
        .filter((f) => f.type === "expense")
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

      setReportData({
        type: "daily",
        date: selectedDate,
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        flows,
      });
    } catch (err: any) {
      console.error("Failed to fetch daily report:", err);
      const errorMessage = validateResErrors(err, "Не удалось загрузить дневной отчет. ")
      setError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeFlowType === "reports" && cashboxId) {
      if (reportType === "monthly") {
        fetchMonthlyReport();
      } else {
        fetchDailyReport();
      }
    }
     
  }, [activeFlowType, reportType, selectedMonth, selectedDate, cashboxId]);


  useEffect(() => {
    if (error) {
      alert(validateResErrors(error, 'Не удалось загрузить данные кассы. Пожалуйста, попробуйте еще раз.'), true)
    }
  }, [error, alert])

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
