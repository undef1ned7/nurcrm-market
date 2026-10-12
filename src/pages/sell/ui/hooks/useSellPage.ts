import { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router";

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
import { useMarketSphere, useUser } from "@entities/user";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import {
  hasMarketReturnPermission,
  isMarketSectorName,
  isProfileOwnerOrAdmin,
  isReturnableSaleStatus,
} from "@shared/lib/tools/saleReturn";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { PAGE_SIZE } from "../sell.constants";

/**
 * Сколько строк истории рисовать за раз. Обычно сервер отдаёт PAGE_SIZE (100),
 * но если он проигнорирует limit и пришлёт тысячи продаж, таблица из 5000 строк
 * перекладывается секундами на каждое обновление страницы.
 */
const RENDER_STEP = 200;

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
    historyError,
    historyObjectsError,
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
  // Если возврат открыт кнопкой из модалки «Детали продажи» — после закрытия
  // (крестик/«Отмена») нужно вернуться в неё же, а не просто закрыть всё.
  const [refundReturnToDetailId, setRefundReturnToDetailId] = useState<
    string | null
  >(null);
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
  // Текст поиска — часть параметров списка: иначе пагинация, перезагрузка
  // после возврата/удаления и любые фильтры сбрасывали поиск.
  const [search, setSearch] = useState("");
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
  const [visibleCount, setVisibleCount] = useState(RENDER_STEP);
  useEffect(() => setVisibleCount(RENDER_STEP), [history, historyObjects]);
  const showMoreRows = useCallback(
    () => setVisibleCount((n) => n + RENDER_STEP),
    [],
  );
  // оптимистическое скрытие после возврата (чтобы карточка исчезала сразу)
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const isSelected = (id) => selectedIds.has(id);
  // Обработчики строк стабильны (useCallback) — строки истории мемоизированы,
  // и галочка в одной строке не перерисовывает остальные.
  const toggleRow = useCallback(
    (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),
    [],
  );
  const openSaleDetail = useCallback((id) => {
    setSellId(id);
    setShowDetailSell(true);
  }, []);
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
    listError,
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
    const listError = isBuildingCompany ? historyObjectsError : historyError;
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
      listError,
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
    historyError,
    historyObjectsError,
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
      ...(search ? { search } : {}),
      ...(effectiveUserParam ? { user: effectiveUserParam } : {}),
      ...(isMarketCompany && dateFrom ? { date_from: dateFrom } : {}),
      ...(isMarketCompany && dateTo ? { date_to: dateTo } : {}),
      ...(isMarketCompany && clientFilter ? { client: clientFilter } : {}),
      ...(isMarketCompany && statusFilter ? { status: statusFilter } : {}),
    }),
    [search, effectiveUserParam, isMarketCompany, dateFrom, dateTo, clientFilter, statusFilter],
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

  // поиск по истории (дебаунс): новый текст попадает в historyBaseParams,
  // запрос делает общий эффект загрузки — с первой страницы.
  const debouncedSearch = useDebounce((v) => {
    setSearch(String(v ?? "").trim());
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("page")) {
      urlParams.delete("page");
      setSearchParams(urlParams, { replace: true });
    }
  }, 600);
  const onChange = (e) => debouncedSearch(e.target.value);

  const loadHistory = useCallback(
    (page) => {
      const params = { ...historyBaseParams, page, limit: PAGE_SIZE };
      dispatch(historySellProduct(params));
      if (isBuildingCompany) {
        dispatch(historySellObjects(params));
      }
    },
    [dispatch, historyBaseParams, isBuildingCompany],
  );
  const reloadHistory = useCallback(
    () => loadHistory(currentPage),
    [loadHistory, currentPage],
  );

  useEffect(() => {
    if (showSellMainStart) return;
    loadHistory(currentPage);
  }, [loadHistory, showSellMainStart, currentPage]);

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

  const handleOpenRefund = useCallback((sale, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setItemId(sale);
    setShowRefundModal(true);
  }, []);

  // Кнопка «Возврат» внутри модалки «Детали продажи»: закрываем детали,
  // открываем возврат и запоминаем, куда вернуться при отмене/крестике.
  const handleOpenRefundFromDetail = (sale) => {
    setRefundReturnToDetailId(sale?.id || sellId || null);
    setShowDetailSell(false);
    setItemId(sale);
    setShowRefundModal(true);
  };

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    setItemId(null);
    if (refundReturnToDetailId) {
      const restoreId = refundReturnToDetailId;
      setRefundReturnToDetailId(null);
      setSellId(restoreId);
      setShowDetailSell(true);
    }
  };

  // «Одежда»: обмен по чеку (ТЗ, п. 4.5) — там же, где «Возврат»
  const { features: sphereFeatures } = useMarketSphere();
  const [exchangeTarget, setExchangeTarget] = useState<any>(null);
  const handleOpenExchange = useCallback((sale, event?) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setShowDetailSell(false);
    setShowRefundModal(false);
    setItemId(null);
    setRefundReturnToDetailId(null);
    setExchangeTarget(sale);
  }, []);
  const handleCloseExchange = useCallback(() => setExchangeTarget(null), []);

  const canReturnSale = useCallback(
    (sale) => {
      if (!isMarketCompany) return false;
      if (!canMarketEmployeeReturn) return false;
      return isReturnableSaleStatus(sale?.status);
    },
    [isMarketCompany, canMarketEmployeeReturn],
  );
  const canExchangeSale = useCallback(
    (sale) => sphereFeatures.exchange && canReturnSale(sale),
    [sphereFeatures.exchange, canReturnSale],
  );


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
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // тело ответа не JSON — останется общий текст
      }
      throw new Error(
        validateResErrors(
          { response: { status: res.status, data } },
          res.status >= 500
            ? `Ошибка сервера (${res.status}). Попробуйте ещё раз.`
            : `Запрос отклонён (${res.status || "нет связи"})`,
        ),
      );
    }

    clearSelection();
    alert(successMessage);
    loadHistory(reloadPage);
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

  // Рисуем и «выбираем все» только видимые строки: удалить то,
  // чего пользователь не видел, нельзя.
  const shownField = useMemo(
    () => filterField.slice(0, visibleCount),
    [filterField, visibleCount],
  );
  const allOnPageSelected =
    shownField.length > 0 && shownField.every((i) => selectedIds.has(i.id));


  return {
    navigate,
    loading,
    start,
    clients,
    isBuildingCompany,
    isMarketCompany,
    isStartPlanCompany,
    filterField,
    shownField,
    showMoreRows,
    renderStep: RENDER_STEP,
    count,
    listError,
    reloadHistory,
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
    openSaleDetail,
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
    handleOpenRefundFromDetail,
    handleCloseRefundModal,
    setRefundReturnToDetailId,
    hideSaleId,
    canReturnSale,
    canExchangeSale,
    exchangeTarget,
    handleOpenExchange,
    handleCloseExchange,
    showExchange: sphereFeatures.exchange,
    historyBaseParams,
    dispatch,
  };
}

export type SellPageVm = ReturnType<typeof useSellPage>;
