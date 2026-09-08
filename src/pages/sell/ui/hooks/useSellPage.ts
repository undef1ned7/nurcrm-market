import { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDebounce } from "@shared/hooks/useDebounce";
import api from "@shared/api";
import { fetchClientsAsync } from "@entities/client";
import {
  historySellObjects,
  historySellProduct,
  startSale,
} from "@entities/sale";
import { useSale } from "@entities/sale";
import { useClient } from "@entities/client";
import { useUser } from "@entities/user";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import {
  hasMarketReturnPermission,
  isMarketSectorName,
  isProfileOwnerOrAdmin,
  isReturnableSaleStatus,
} from "@shared/lib/tools/saleReturn";
import { PAGE_SIZE } from "../sell.constants";

export function useSellPage() {
  const navigate = useNavigate();
  const alert = useAlert();
  const confirmDialog = useConfirm();
  const askConfirm = useCallback(
    (message) =>
      new Promise((resolve) => {
        confirmDialog(message, (ok) => resolve(Boolean(ok)));
      }),
    [confirmDialog],
  );
  const dispatch = useDispatch() as any;
  const [searchParams, setSearchParams] = useSearchParams();
  const { company, profile, userId } = useUser();
  const { list: clientsRaw } = useClient();
  const {
    history,
    start,
    historyObjects,
    historyCount,
    historyTotalAmount,
    historyNext,
    historyPrevious,
    historyObjectsCount,
    historyObjectsTotalAmount,
    historyObjectsNext,
    historyObjectsPrevious,
    loading,
  } = useSale();

  // Получаем текущую страницу из URL
  const currentPage = useMemo(
    () => parseInt(searchParams.get("page") || "1", 10),
    [searchParams],
  );
  const currentUserId = String(profile?.id || userId || "").trim();
  const isOwnerOrAdmin = isProfileOwnerOrAdmin(profile);
  const canMarketEmployeeReturn = hasMarketReturnPermission(profile);
  const userParam = String(searchParams.get("user") || "").trim();

  const [showDetailSell, setShowDetailSell] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSellMainStart, setShowSellMainStart] = useState(false);
  const [showAddCashboxModal, setShowAddCashboxModal] = useState(false);
  const [showBuilding, setShowBuilding] = useState(false);
  const [sellId, setSellId] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [itemId, setItemId] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [historyView, setHistoryView] = useState("table"); // table | cards (по умолчанию таблица)
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [clientFilter, setClientFilter] = useState(
    searchParams.get("client") || "",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "",
  );
  const clients = useMemo(
    () =>
      Array.isArray(clientsRaw?.results)
        ? clientsRaw.results
        : Array.isArray(clientsRaw)
          ? clientsRaw
          : [],
    [clientsRaw],
  );

  // выбор строк
  const [selectedIds, setSelectedIds] = useState(new Set());
  // оптимистическое скрытие после возврата (чтобы карточка исчезала сразу)
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const isSelected = (id) => selectedIds.has(id);
  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllOnPage = (items) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const all = items.length > 0 && items.every((i) => next.has(i.id));
      items.forEach((i) => (all ? next.delete(i.id) : next.add(i.id)));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());

  const hideSaleId = (id) => {
    const sid = String(id || "");
    if (!sid) return;
    setHiddenIds((prev) => new Set(prev).add(sid));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(sid);
      return next;
    });
  };

  // если данные перезагрузились — чистим "скрытые" id, которых уже нет в выдаче
  useEffect(() => {
    const all = new Set([
      ...(Array.isArray(history) ? history.map((x) => String(x.id)) : []),
      ...(Array.isArray(historyObjects)
        ? historyObjects.map((x) => String(x.id))
        : []),
    ]);
    setHiddenIds((prev) => {
      if (!prev || prev.size === 0) return prev;
      const next = new Set();
      for (const id of prev) {
        if (all.has(String(id))) next.add(String(id));
      }
      return next;
    });
  }, [history, historyObjects]);

  // смена страницы/поиска — можно безопасно сбросить локальные скрытия
  useEffect(() => {
    setHiddenIds(new Set());
  }, [currentPage]);

  const {
    isBuildingCompany,
    isMarketCompany,
    isStartPlanCompany,
    filterField,
    count,
    listTotalAmount,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useMemo(() => {
    const sectorName = company?.sector?.name?.trim().toLowerCase() ?? "";
    const isBuildingCompany = sectorName === "строительная компания";
    const isMarketCompany = isMarketSectorName(sectorName);
    const planName = company?.subscription_plan?.name?.trim().toLowerCase() ?? "";
    const isStartPlanCompany = planName === "старт";
    const hidden = hiddenIds;
    const filterSell = (Array.isArray(history) ? history : []).filter(
      (item) => !hidden.has(String(item?.id ?? "")),
    );
    const filterObjects = (
      Array.isArray(historyObjects) ? historyObjects : []
    ).filter((item) => !hidden.has(String(item?.id ?? "")));
    const filterField = isBuildingCompany ? filterObjects : filterSell;
    const count = isBuildingCompany ? historyObjectsCount : historyCount;
    const listTotalAmount = isBuildingCompany
      ? historyObjectsTotalAmount
      : historyTotalAmount;
    const next = isBuildingCompany ? historyObjectsNext : historyNext;
    const previous = isBuildingCompany
      ? historyObjectsPrevious
      : historyPrevious;
    const totalPages = count && PAGE_SIZE ? Math.ceil(count / PAGE_SIZE) : 1;
    return {
      sectorName,
      isBuildingCompany,
      isMarketCompany,
      isStartPlanCompany,
      filterSell,
      filterField,
      count,
      listTotalAmount,
      next,
      previous,
      totalPages,
      hasNextPage: !!next,
      hasPrevPage: !!previous,
    };
  }, [
    company,
    history,
    historyObjects,
    hiddenIds,
    historyObjectsCount,
    historyObjectsTotalAmount,
    historyObjectsNext,
    historyObjectsPrevious,
    historyPrevious,
    historyCount,
    historyTotalAmount,
    historyNext,
  ]);

  useEffect(() => {
    if (!isMarketCompany || isOwnerOrAdmin || !currentUserId || userParam) return;
    const params = new URLSearchParams(searchParams);
    params.set("user", currentUserId);
    params.delete("page");
    setSearchParams(params, { replace: true });
  }, [
    currentUserId,
    isMarketCompany,
    isOwnerOrAdmin,
    searchParams,
    setSearchParams,
    userParam,
  ]);

  const effectiveUserParam =
    userParam || (isMarketCompany && !isOwnerOrAdmin ? currentUserId : "");

  const historyBaseParams = useMemo(
    () => ({
      ...(effectiveUserParam ? { user: effectiveUserParam } : {}),
      ...(isMarketCompany && dateFrom ? { date_from: dateFrom } : {}),
      ...(isMarketCompany && dateTo ? { date_to: dateTo } : {}),
      ...(isMarketCompany && clientFilter ? { client: clientFilter } : {}),
      ...(isMarketCompany && statusFilter ? { status: statusFilter } : {}),
    }),
    [effectiveUserParam, isMarketCompany, dateFrom, dateTo, clientFilter, statusFilter],
  );
  // Синхронизация URL с состоянием страницы

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }
    const newSearchString = params.toString();
    const currentSearchString = searchParams.toString();
    if (newSearchString !== currentSearchString) {
      setSearchParams(params, { replace: true });
    }
  }, [currentPage, searchParams, setSearchParams]);

  // Обработчик смены страницы
  const handlePageChange = (newPage) => {
    if (newPage < 1 || (totalPages && newPage > totalPages)) return;
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    setSearchParams(params, { replace: true });
    // Плавно прокручиваем страницу вверх при смене страницы
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // поиск по истории (дебаунс)
  const debouncedSearch = useDebounce((v) => {
    const requestParams = { ...historyBaseParams, search: v, page: 1, limit: PAGE_SIZE };
    dispatch(historySellProduct(requestParams));
    if (isBuildingCompany) {
      dispatch(historySellObjects(requestParams));
    }
    // Сбрасываем на первую страницу при поиске
    const urlParams = new URLSearchParams(searchParams);
    urlParams.delete("page");
    setSearchParams(urlParams, { replace: true });
  }, 600);
  const onChange = (e) => debouncedSearch(e.target.value);

  useEffect(() => {
    if (showSellMainStart) return;
    const params = { ...historyBaseParams, search: "", page: currentPage, limit: PAGE_SIZE };
    dispatch(
      historySellProduct(params),
    );
    if (isBuildingCompany) {
      dispatch(historySellObjects(params));
    }
  }, [
    dispatch,
    showSellMainStart,
    currentPage,
    historyBaseParams,
    isBuildingCompany,
  ]);

  useEffect(() => {
    if (!isMarketCompany) return;
    dispatch(fetchClientsAsync(undefined as any));
  }, [dispatch, isMarketCompany]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (dateFrom) params.set("date_from", dateFrom);
    else params.delete("date_from");
    if (dateTo) params.set("date_to", dateTo);
    else params.delete("date_to");
    if (clientFilter) params.set("client", clientFilter);
    else params.delete("client");
    if (statusFilter) params.set("status", statusFilter);
    else params.delete("status");
    if (currentPage > 1) params.delete("page");
    setSearchParams(params, { replace: true });
     
  }, [dateFrom, dateTo, clientFilter, statusFilter]);

  // Плавно прокручиваем страницу вверх при изменении страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (showSellModal) dispatch(startSale({ discount_total: 0 }));
    if (showSellMainStart) dispatch(startSale({ discount_total: 0 }));
  }, [showSellModal, showSellMainStart, dispatch]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setShowSellModal(false);
        setShowSellMainStart(false);
        setShowDetailSell(false);
        setShowBuilding(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const handleOpenRefund = (sale, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setItemId(sale);
    setShowRefundModal(true);
  };

  const canReturnSale = (sale) => {
    if (!isMarketCompany) return false;
    if (!canMarketEmployeeReturn) return false;
    return isReturnableSaleStatus(sale?.status);
  };

  const bulkDeleteSales = async (ids, { cancelPaidMessage, successMessage, reloadPage }) => {
    const doRequest = async (allowPaid) => {
      try {
        const res = await api.post(
          "/main/sales/bulk-delete/",
          { ids, allow_paid: allowPaid },
          { validateStatus: () => true },
        );
        return {
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          json: async () => res.data,
        };
      } catch (err: any) {
        return {
          ok: false,
          status: err?.response?.status || 0,
          json: async () => err?.response?.data || {},
        };
      }
    };

    let res = await doRequest(false);

    if (!res.ok && res.status === 400) {
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // оставляем data = null
      }

      const paidIds = Array.isArray(data?.paid_ids) ? data.paid_ids : [];
      if (paidIds.length > 0) {
        const msg =
          data?.detail ||
          "Среди выбранных продаж есть оплаченные. Удалить их тоже?";
        const confirmPaid = await askConfirm(
          `${msg}\n\nОплаченные продажи:\n${paidIds.join("\n")}`,
        );
        if (!confirmPaid) {
          alert(cancelPaidMessage);
          return false;
        }
        res = await doRequest(true);
      } else {
        throw new Error(data?.detail || "Запрос отклонён (400)");
      }
    }

    if (!res.ok) {
      const text = await (res as any).text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    clearSelection();
    alert(successMessage);
    dispatch(
      historySellProduct({
        ...historyBaseParams,
        search: "",
        page: reloadPage,
        limit: PAGE_SIZE,
      }),
    );
    if (isBuildingCompany) {
      dispatch(
        historySellObjects({
          ...historyBaseParams,
          search: "",
          page: reloadPage,
          limit: PAGE_SIZE,
        }),
      );
    }
    return true;
  };

  // массовое удаление выбранных
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await askConfirm(`Удалить выбранные ${selectedIds.size} запись(и)?`);
    if (!ok) return;

    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      await bulkDeleteSales(ids, {
        cancelPaidMessage: "Удаление отменено. Оплаченные продажи не были удалены.",
        successMessage: "Выбранные записи удалены",
        reloadPage: currentPage,
      });
    } catch (e: any) {
      alert("Не удалось удалить: " + e.message, true);
    } finally {
      setBulkDeleting(false);
    }
  };

  const allOnPageSelected =
    filterField.length > 0 && filterField.every((i) => selectedIds.has(i.id));


  return {
    navigate,
    loading,
    start,
    clients,
    isBuildingCompany,
    isMarketCompany,
    isStartPlanCompany,
    filterField,
    count,
    listTotalAmount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    currentPage,
    handlePageChange,
    onChange,
    historyView,
    setHistoryView,
    selectedIds,
    isSelected,
    toggleRow,
    toggleSelectAllOnPage,
    clearSelection,
    allOnPageSelected,
    handleBulkDelete,
    bulkDeleting,
    showFiltersModal,
    setShowFiltersModal,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    showAddCashboxModal,
    setShowAddCashboxModal,
    showSellModal,
    setShowSellModal,
    showSellMainStart,
    setShowSellMainStart,
    showBuilding,
    setShowBuilding,
    showDetailSell,
    setShowDetailSell,
    sellId,
    setSellId,
    showRefundModal,
    setShowRefundModal,
    itemId,
    setItemId,
    handleOpenRefund,
    hideSaleId,
    canReturnSale,
    historyBaseParams,
    dispatch,
  };
}

export type SellPageVm = ReturnType<typeof useSellPage>;
