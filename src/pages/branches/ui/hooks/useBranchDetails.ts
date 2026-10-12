import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { FaBuilding } from "react-icons/fa";
import { getCashFlows, useCash } from "@entities/cash";
import { historySellProduct } from "@entities/sale";
import { fetchEmployeesAsync } from "@entities/employee";
import { useClient, fetchClientsAsync } from "@entities/client";
import { fetchBranchesAsync } from "@entities/branch";
import { useUser } from "@entities/user";
import { isEmbeddedRoute } from "../components/BranchEmbeddedPage";
import { MENU_CONFIG } from "@widgets/sidebar/ui/config/menuConfig";
import { translateMenuLabel } from "@shared/lib/i18n/menuLabelKeys";
import {
  BASE_TABS,
  applyBranchTabsRules,
  applySectorTabsRules,
} from "../branchTabsConfig";
import {
  baseTabIconMap,
  computeAnalyticsData,
  filterByDateRange,
  fetchAllPages,
  filterByBranch,
  filterSalesByBranch,
  getIconByRoute,
  getSectorKey,
  getSectorTabIcon,
  loadSectorRouteData,
} from "../branchDetails.utils";

export function useBranchDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  // Вкладка в URL: «Назад» из истории перемещений и обновление страницы
  // возвращают на ту же вкладку.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") || "";
  const setActiveTab = useCallback(
    (tab: string) =>
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", tab);
          return p;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const {
    list: branches,
    loading: branchesLoading,
    error: branchesError,
  } = useSelector((state: any) => state.branches);
  const { loading: cashLoading } = useCash();
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<any>(null);
  // Список филиалов уже запрашивался: пустой ответ — это «не найден», а не вечная загрузка
  const [branchesFetched, setBranchesFetched] = useState(false);
  const { history: salesHistory } = useSelector((state: any) => state.sale);
  const { list: employees, loading: employeesLoading } = useSelector(
    (state: any) => state.employee
  );
  const { list: clients, loading: clientsLoading } = useClient();
  const { company, sector, tariff } = useUser();

  const [kassaData, setKassaData] = useState<any[]>([]);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any>({});
  const [sectorLoading, setSectorLoading] = useState<any>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Запросы уходят с `branch=id`, сервер уже отфильтровал данные. В ответе
  // товаров и движений кассы поля `branch` может не быть, поэтому строгая
  // проверка `item.branch === id` скрывала всё. Фильтруем на клиенте только
  // если у записей поле филиала есть.
  const filteredCashFlows = useMemo(
    // Только данные этого филиала: подмена на глобальный cash.cashFlows показывала
    // движения других филиалов и падала, если там лежал не массив ({ results: null })
    () => filterByBranch(kassaData, id),
    [kassaData, id],
  );

  const filteredProducts = useMemo(
    () => filterByBranch(warehouseData, id),
    [warehouseData, id],
  );

  const filteredSales = useMemo(() => {
    const sales = salesData.length > 0 ? salesData : salesHistory || [];
    return filterSalesByBranch(sales, id);
  }, [salesData, salesHistory, id]);

  const filteredEmployees = useMemo(
    () => filterByBranch(Array.isArray(employees) ? employees : [], id),
    [employees, id],
  );

  const filteredClients = useMemo(() => {
    if (!clients || !Array.isArray(clients)) return [];
    return filterByBranch(clients, id);
  }, [clients, id]);

  const branch = branches.find((b) => b.id === id);
  // Пока список филиалов не пришёл, это загрузка, а не «не найден».
  const loading =
    branchesLoading ||
    (!branch && !branches.length && !branchesError && !branchesFetched);
  const error = branch
    ? ""
    : branchesError
      ? t("crm.branches.details.states.loadFailed")
      : t("crm.branches.details.states.notFound");
  const currentSector = sector || company?.sector?.name;

  const sectorTabs = useMemo(() => {
    if (!currentSector) return [];
    const sectorKey = getSectorKey(currentSector);
    if (!sectorKey) return [];
    const sectorConfig = MENU_CONFIG.sector[sectorKey] || [];
    return sectorConfig.map((item) => {
      const iconName = getIconByRoute(item.to, item.label);
      return {
        id: item.to.replace("/crm/", "").replace(/\//g, "-"),
        // Подпись из сайдбара (RU) переводим так же, как в сайдбаре.
        label: translateMenuLabel(item.label, t),
        icon: getSectorTabIcon(iconName),
        route: item.to,
      };
    });
  }, [currentSector, t]);

  useEffect(() => {
    if (id && !branches.length) {
      Promise.resolve(dispatch((fetchBranchesAsync as any)())).finally(() =>
        setBranchesFetched(true),
      );
    }
  }, [id, branches.length, dispatch]);

  const fetchKassa = async () => {
    try {
      const result = await dispatch(getCashFlows({ branch: id }));
      if (getCashFlows.fulfilled.match(result)) {
        setKassaData(Array.isArray(result.payload) ? result.payload : []);
      }
    } catch (err: any) {
      console.error("Ошибка загрузки кассы:", err);
    }
  };

  const fetchWarehouse = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchAllPages("/main/products/list/", {
        branch: id,
        page_size: 100,
      });
      setWarehouseData(data);
    } catch (err: any) {
      console.error("Ошибка загрузки склада:", err);
      setWarehouseData([]);
      setProductsError(err);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const result = await dispatch(historySellProduct({ branch: id }));
      if (historySellProduct.fulfilled.match(result)) {
        const payload = result.payload;
        if (Array.isArray(payload)) {
          setSalesData(payload);
        } else if (payload?.results && Array.isArray(payload.results)) {
          setSalesData(payload.results);
        } else {
          setSalesData([]);
        }
      } else if (historySellProduct.rejected.match(result)) {
        console.error("Ошибка загрузки продаж:", result.payload);
        setSalesData([]);
      }
    } catch (err: any) {
      console.error("Ошибка загрузки продаж:", err);
      setSalesData([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [kassaResult, salesResult, warehouseResult] = await Promise.all([
        dispatch(getCashFlows({ branch: id })).catch(() => ({ payload: [] })),
        dispatch(historySellProduct({ branch: id })).catch(() => ({
          payload: [],
        })),
        fetchAllPages("/main/products/list/", { branch: id, page_size: 100 }).catch(
          () => [],
        ),
      ]);

      if (getCashFlows.fulfilled.match(kassaResult)) {
        const kassaRaw = kassaResult.payload || [];
        setKassaData(Array.isArray(kassaRaw) ? kassaRaw : []);
      }

      if (historySellProduct.fulfilled.match(salesResult)) {
        const salesRaw = salesResult.payload || [];
        setSalesData(Array.isArray(salesRaw) ? salesRaw : []);
      }

      setWarehouseData(warehouseResult);
    } catch (err: any) {
      console.error("Ошибка загрузки аналитики:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      await dispatch(fetchEmployeesAsync({ branch: id }));
    } catch (err: any) {
      console.error("Ошибка загрузки сотрудников:", err);
    }
  };

  const fetchClients = async () => {
    try {
      await dispatch(fetchClientsAsync({ branch: id }));
    } catch (err: any) {
      console.error("Ошибка загрузки клиентов:", err);
    }
  };

  const filterByDate = useCallback(
    (data, dateField = "created_at") =>
      filterByDateRange(data, dateFrom, dateTo, dateField),
    [dateFrom, dateTo]
  );

  const analyticsData = useMemo(
    () =>
      computeAnalyticsData(kassaData, salesData, warehouseData, filterByDate),
    [kassaData, salesData, warehouseData, filterByDate]
  );

  const fetchSectorTabData = async (tabId, route) => {
    if (!id) return;

    setSectorLoading((prev) => ({ ...prev, [tabId]: true }));
    try {
      const filtered = await loadSectorRouteData(route, id);
      setSectorData((prev) => ({ ...prev, [tabId]: filtered }));
    } catch (err: any) {
      console.error(`Ошибка загрузки данных для таба ${tabId}:`, err);
      setSectorData((prev) => ({ ...prev, [tabId]: [] }));
    } finally {
      setSectorLoading((prev) => ({ ...prev, [tabId]: false }));
    }
  };

  const baseTabsWithIcons = useMemo(
    () =>
      BASE_TABS.map(({ labelKey, ...tab }) => ({
        ...tab,
        label: t(labelKey),
        icon: baseTabIconMap[tab.icon] || FaBuilding,
      })),
    [t]
  );

  const filteredBaseTabs = useMemo(
    () => {
      const visible = applyBranchTabsRules(
        baseTabsWithIcons,
        currentSector,
        tariff || company?.subscription_plan?.name
      );
      // Перемещения имеют смысл только там, где есть склад.
      return visible.some((tab) => tab.id === "warehouse")
        ? visible
        : visible.filter((tab) => tab.id !== "transfers");
    },
    [baseTabsWithIcons, currentSector, tariff, company?.subscription_plan?.name]
  );

  const filteredSectorTabs = useMemo(
    () =>
      applySectorTabsRules(
        sectorTabs,
        currentSector,
        tariff || company?.subscription_plan?.name
      ),
    [sectorTabs, currentSector, tariff, company?.subscription_plan?.name]
  );

  const tabs = useMemo(
    () => [...filteredBaseTabs, ...filteredSectorTabs],
    [filteredBaseTabs, filteredSectorTabs]
  );

  const activeTab = tabs.some((t) => t.id === requestedTab)
    ? requestedTab
    : tabs[0]?.id || "kassa";

  useEffect(() => {
    if (!id) return;

    const sectorTab = filteredSectorTabs.find((tab) => tab.id === activeTab);
    if (sectorTab) {
      // Встроенные страницы сами грузят данные (с branch через интерсептор).
      if (!isEmbeddedRoute(sectorTab.route)) {
        fetchSectorTabData(activeTab, sectorTab.route);
      }
    } else {
      switch (activeTab) {
        case "kassa":
          fetchKassa();
          break;
        case "warehouse":
          fetchWarehouse();
          break;
        case "sales":
          fetchSales();
          break;
        case "analytics":
          fetchAnalytics();
          break;
        // «Сотрудники» и «Клиенты» — встроенные страницы, грузят сами.
        default:
          break;
      }
    }
     
  }, [activeTab, id, filteredSectorTabs]);

  const clearDateFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  return {
    id,
    activeTab,
    setActiveTab,
    branch,
    loading,
    error,
    tabs,
    filteredBaseTabs,
    filteredSectorTabs,
    isMarketSector: getSectorKey(currentSector) === "market",
    cashLoading,
    filteredCashFlows,
    productsError,
    reloadWarehouse: fetchWarehouse,
    productsLoading,
    filteredProducts,
    filteredSales,
    analyticsData,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearDateFilters,
    employeesLoading,
    filteredEmployees,
    clientsLoading,
    filteredClients,
    sectorData,
    sectorLoading,
  };
}
