import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FaBuilding } from "react-icons/fa";
import { getCashFlows, useCash } from "@entities/cash";
import { fetchProductsAsync, useProducts } from "@entities/product";
import { historySellProduct } from "@entities/sale";
import { fetchEmployeesAsync } from "@entities/employee";
import { useClient, fetchClientsAsync } from "@entities/client";
import { fetchBranchesAsync } from "@entities/branch";
import { useUser } from "@entities/user";
import { MENU_CONFIG } from "@widgets/sidebar/ui/config/menuConfig";
import {
  BASE_TABS,
  applyBranchTabsRules,
  applySectorTabsRules,
} from "../branchTabsConfig";
import {
  baseTabIconMap,
  computeAnalyticsData,
  filterByDateRange,
  filterSalesByBranch,
  getIconByRoute,
  getSectorKey,
  getSectorTabIcon,
  loadSectorRouteData,
} from "../branchDetails.utils";

export function useBranchDetails() {
  const { id } = useParams();
  const dispatch = useDispatch() as any;
  const [activeTab, setActiveTab] = useState("kassa");

  const { list: branches, loading: branchesLoading } = useSelector(
    (state: any) => state.branches
  );
  const { cashFlows, loading: cashLoading } = useCash();
  const { list: products, loading: productsLoading } = useProducts();
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

  const filteredCashFlows = useMemo(() => {
    if (!cashFlows || !Array.isArray(cashFlows)) return [];
    return cashFlows.filter((item) => item.branch === id);
  }, [cashFlows, id]);

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.filter((item) => item.branch === id);
  }, [products, id]);

  const filteredSales = useMemo(() => {
    const sales = salesData.length > 0 ? salesData : salesHistory || [];
    return filterSalesByBranch(sales, id);
  }, [salesData, salesHistory, id]);

  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return employees.filter((item) => {
      const itemBranches = Array.isArray(item.branches)
        ? item.branches
        : item.branch
        ? [item.branch]
        : [];
      return itemBranches.includes(id);
    });
  }, [employees, id]);

  const filteredClients = useMemo(() => {
    if (!clients || !Array.isArray(clients)) return [];
    return clients.filter((item) => !id || item.branch === id);
  }, [clients, id]);

  const branch = branches.find((b) => b.id === id);
  const loading = branchesLoading;
  const error = branch ? "" : "Филиал не найден";
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
        label: item.label,
        icon: getSectorTabIcon(iconName),
        route: item.to,
      };
    });
  }, [currentSector]);

  useEffect(() => {
    if (id && !branches.length) {
      dispatch((fetchBranchesAsync as any)());
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
    try {
      const result = await dispatch(
        fetchProductsAsync({ branch: id })
      ).unwrap();
      if (fetchProductsAsync.fulfilled.match(result)) {
        const data = result.payload?.results || result.payload || [];
        setWarehouseData(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error("Ошибка загрузки склада:", err);
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
        dispatch(fetchProductsAsync({ branch: id })).catch(() => ({
          payload: [],
        })),
      ]);

      if (getCashFlows.fulfilled.match(kassaResult)) {
        const kassaRaw = kassaResult.payload || [];
        setKassaData(Array.isArray(kassaRaw) ? kassaRaw : []);
      }

      if (historySellProduct.fulfilled.match(salesResult)) {
        const salesRaw = salesResult.payload || [];
        setSalesData(Array.isArray(salesRaw) ? salesRaw : []);
      }

      if (fetchProductsAsync.fulfilled.match(warehouseResult)) {
        const warehouseRaw =
          warehouseResult.payload?.results || warehouseResult.payload || [];
        setWarehouseData(Array.isArray(warehouseRaw) ? warehouseRaw : []);
      }
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
      BASE_TABS.map((tab) => ({
        ...tab,
        icon: baseTabIconMap[tab.icon] || FaBuilding,
      })),
    []
  );

  const filteredBaseTabs = useMemo(
    () =>
      applyBranchTabsRules(
        baseTabsWithIcons,
        currentSector,
        tariff || company?.subscription_plan?.name
      ),
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

  useEffect(() => {
    if (!id) return;

    const sectorTab = filteredSectorTabs.find((tab) => tab.id === activeTab);
    if (sectorTab) {
      fetchSectorTabData(activeTab, sectorTab.route);
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
        case "employees":
          fetchEmployees();
          break;
        case "clients":
          fetchClients();
          break;
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
    filteredSectorTabs,
    cashLoading,
    filteredCashFlows,
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
