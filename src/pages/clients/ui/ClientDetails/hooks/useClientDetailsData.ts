import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext, useParams } from "react-router-dom";

import api from "@shared/api";
import { productSearchHaystackLower } from "@shared/lib/tools/productBarcode";

import {
  listFrom,
  msgFromError,
  normalizeDealFromApi,
} from "../clientDetails.helpers";
import type {
  AlertState,
  ClientRecord,
  ClientsOutletContext,
  DealRecord,
  DatePreset,
  DetailsView,
  PosSaleRecord,
  SupplierProduct,
  SupplierPurchase,
  SupplierPurchasesSummary,
} from "../clientDetails.types";
import { computeDatePreset, getDealDateISO, inRange } from "../clientDetails.utils";

export function useClientDetailsData() {
  const { id } = useParams();
  const { state } = useLocation();
  const { clients = [], setClients = () => {} } =
    (useOutletContext() as ClientsOutletContext | null) || {};

  const initialClient = useMemo(() => {
    return (
      clients.find((c) => String(c.id) === String(id)) ||
      (state && String((state as ClientRecord)?.id) === String(id)
        ? (state as ClientRecord)
        : null)
    );
  }, [clients, state, id]);

  const [client, setClient] = useState<ClientRecord | null>(initialClient);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealRecord | null>(null);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(
    null,
  );
  const [detailsView, setDetailsView] = useState<DetailsView>(null);

  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsErr, setDealsErr] = useState("");
  const [clientErr, setClientErr] = useState("");
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>(
    [],
  );
  const [supplierProductsLoading, setSupplierProductsLoading] = useState(false);
  const [supplierProductsErr, setSupplierProductsErr] = useState("");
  const [supplierProductSearch, setSupplierProductSearch] = useState("");

  const [supplierPurchases, setSupplierPurchases] = useState<
    SupplierPurchase[]
  >([]);
  const [supplierPurchasesLoading, setSupplierPurchasesLoading] =
    useState(false);
  const [supplierPurchasesErr, setSupplierPurchasesErr] = useState("");
  const [supplierPurchasesSummary, setSupplierPurchasesSummary] =
    useState<SupplierPurchasesSummary | null>(null);
  const [supplierPurchasesApiMissing, setSupplierPurchasesApiMissing] =
    useState(false);

  const [clientSales, setClientSales] = useState<PosSaleRecord[]>([]);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  const [clientSalesErr, setClientSalesErr] = useState("");

  const [alert, setAlert] = useState<AlertState>({
    open: false,
    type: "error",
    message: "",
  });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  useEffect(() => {
    const fetchClient = async () => {
      if (client || !id) return;
      try {
        setClientErr("");
        const res = await api.get(`/main/clients/${id}/`);
        const loaded = (res?.data || null) as ClientRecord | null;
        if (loaded) {
          setClient(loaded);
          setClients((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            const exists = arr.some((c) => String(c.id) === String(id));
            return exists
              ? arr.map((c) => (String(c.id) === String(id) ? loaded : c))
              : [loaded, ...arr];
          });
        }
      } catch (e) {
        console.error(e);
        setClientErr("Не удалось загрузить клиента");
      }
    };
    void fetchClient();
  }, [client, id, setClients]);

  const loadDeals = async (clientId: string | number) => {
    setDealsLoading(true);
    setDealsErr("");
    try {
      const res = await api.get(`/main/clients/${clientId}/deals/`);
      const list = listFrom(res).map(normalizeDealFromApi) as DealRecord[];
      setDeals(list);
    } catch (e) {
      console.error(e);
      setDealsErr(msgFromError(e, "Не удалось загрузить сделки"));
    } finally {
      setDealsLoading(false);
    }
  };

  const loadSupplierProducts = useCallback(async (supplierId: unknown) => {
    const normalizedSupplierId = String(supplierId || "").trim();
    if (!normalizedSupplierId) {
      setSupplierProducts([]);
      return;
    }

    try {
      setSupplierProductsLoading(true);
      setSupplierProductsErr("");
      const res = await api.get(
        `/main/suppliers/${encodeURIComponent(normalizedSupplierId)}/products/`,
      );
      const nextProducts = Array.isArray(listFrom(res))
        ? (listFrom(res) as SupplierProduct[])
        : [];
      setSupplierProducts(nextProducts);
    } catch (e) {
      console.error(e);
      setSupplierProducts([]);
      setSupplierProductsErr(
        msgFromError(e, "Не удалось загрузить товары поставщика"),
      );
    } finally {
      setSupplierProductsLoading(false);
    }
  }, []);

  const loadSupplierPurchases = useCallback(async (supplierId: unknown) => {
    const normalizedSupplierId = String(supplierId || "").trim();
    if (!normalizedSupplierId) {
      setSupplierPurchases([]);
      setSupplierPurchasesSummary(null);
      return;
    }

    try {
      setSupplierPurchasesLoading(true);
      setSupplierPurchasesErr("");
      const res = await api.get(
        `/main/suppliers/${encodeURIComponent(normalizedSupplierId)}/purchases/`,
      );
      const data = res?.data as
        | { results?: SupplierPurchase[]; summary?: SupplierPurchasesSummary }
        | SupplierPurchase[]
        | undefined;
      const list = Array.isArray((data as { results?: SupplierPurchase[] })?.results)
        ? ((data as { results: SupplierPurchase[] }).results)
        : Array.isArray(data)
          ? data
          : [];
      setSupplierPurchases(list);
      setSupplierPurchasesSummary(
        (data as { summary?: SupplierPurchasesSummary })?.summary || null,
      );
      setSupplierPurchasesApiMissing(false);
    } catch (e: unknown) {
      setSupplierPurchases([]);
      setSupplierPurchasesSummary(null);
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setSupplierPurchasesApiMissing(true);
      } else {
        console.error(e);
        setSupplierPurchasesErr(
          msgFromError(e, "Не удалось загрузить историю закупок"),
        );
      }
    } finally {
      setSupplierPurchasesLoading(false);
    }
  }, []);

  const loadClientSales = useCallback(async (clientId: unknown) => {
    const cid = String(clientId || "").trim();
    if (!cid) {
      setClientSales([]);
      return;
    }
    setClientSalesLoading(true);
    setClientSalesErr("");
    try {
      const res = await api.get("/main/pos/sales/", {
        params: { client: cid, page: 1, limit: 100 },
      });
      const data = res.data as
        | { results?: PosSaleRecord[] }
        | PosSaleRecord[]
        | undefined;
      const list = Array.isArray((data as { results?: PosSaleRecord[] })?.results)
        ? ((data as { results: PosSaleRecord[] }).results)
        : Array.isArray(data)
          ? data
          : [];
      const own = list.filter((s) => {
        const c = s?.client;
        const sid =
          c && typeof c === "object"
            ? ((c as { id?: unknown; uuid?: unknown }).id ??
              (c as { uuid?: unknown }).uuid ??
              "")
            : (c ?? "");
        return String(sid) === cid;
      });
      own.sort(
        (a, b) =>
          new Date(b.created_at || b.paid_at || 0).getTime() -
          new Date(a.created_at || a.paid_at || 0).getTime(),
      );
      setClientSales(own);
    } catch (e) {
      console.error(e);
      setClientSales([]);
      setClientSalesErr(msgFromError(e, "Не удалось загрузить историю продаж"));
    } finally {
      setClientSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (client?.id) void loadDeals(client.id);
  }, [client?.id]);

  useEffect(() => {
    if (client?.id) void loadClientSales(client.id);
  }, [client?.id, loadClientSales]);

  useEffect(() => {
    const isSupplier = String(client?.type || "").toLowerCase() === "suppliers";
    setSupplierProductSearch("");
    if (!isSupplier || !client?.id) {
      setSupplierProducts([]);
      setSupplierProductsErr("");
      setSupplierProductsLoading(false);
      setSupplierPurchases([]);
      setSupplierPurchasesErr("");
      setSupplierPurchasesLoading(false);
      return;
    }
    void loadSupplierProducts(client.id);
    void loadSupplierPurchases(client.id);
  }, [client?.id, client?.type, loadSupplierProducts, loadSupplierPurchases]);

  const persistClient = (next: ClientRecord | null | undefined) => {
    if (!next) return;
    setClient(next);
    setClients((prev) =>
      Array.isArray(prev)
        ? prev.map((c) => (c.id === next.id ? next : c))
        : prev,
    );
  };

  const openDealForm = (deal: DealRecord | null = null) => {
    setEditingDeal(deal);
    setIsDealFormOpen(true);
  };

  const openClientForm = () => {
    setIsClientFormOpen(true);
  };

  const filteredDeals = useMemo(() => {
    if (!dateFrom && !dateTo) return deals;
    return deals.filter((d) => inRange(getDealDateISO(d), dateFrom, dateTo));
  }, [deals, dateFrom, dateTo]);

  const filteredClientSales = useMemo(() => {
    if (!dateFrom && !dateTo) return clientSales;
    return clientSales.filter((s) =>
      inRange(
        String(s?.created_at || s?.paid_at || "").slice(0, 10),
        dateFrom,
        dateTo,
      ),
    );
  }, [clientSales, dateFrom, dateTo]);

  const applyPreset = (preset: DatePreset) => {
    const next = computeDatePreset(preset);
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
  };

  const dataTransmission = (dealId: string | number) => {
    setSelectedRowId(dealId);
    setShowDebtModal(true);
  };

  const filteredSupplierProducts = useMemo(() => {
    const query = String(supplierProductSearch || "")
      .trim()
      .toLowerCase();
    if (!query) return supplierProducts;
    return supplierProducts.filter((product) => {
      const haystack = productSearchHaystackLower(product);
      return haystack.includes(query);
    });
  }, [supplierProductSearch, supplierProducts]);

  const supplierProductsCountLabel = useMemo(
    () => filteredSupplierProducts.length,
    [filteredSupplierProducts.length],
  );

  const supplierPurchasesTotals = useMemo(() => {
    if (supplierPurchasesSummary) {
      return {
        amount: Number(supplierPurchasesSummary.total_amount || 0),
        count: Number(supplierPurchasesSummary.total_count || 0),
      };
    }
    return supplierPurchases.reduce<{ amount: number; count: number }>(
      (acc, row) => {
        acc.amount += Number(row?.amount ?? row?.total ?? 0);
        acc.count += 1;
        return acc;
      },
      { amount: 0, count: 0 },
    );
  }, [supplierPurchases, supplierPurchasesSummary]);

  const handleClientUpdated = (updatedClient: ClientRecord) => {
    persistClient(updatedClient);
  };

  const handleClientDeleted = (
    clientId: string | number,
    navigate: (to: string, opts?: { replace?: boolean }) => void,
  ) => {
    setClients((prev) =>
      Array.isArray(prev) ? prev.filter((c) => c.id !== clientId) : prev,
    );
    navigate("/crm/clients", { replace: true });
  };

  const handleDealSaved = (deal: DealRecord) => {
    setDeals((prev) => {
      const exists = prev.some((d) => d.id === deal.id);
      return exists
        ? prev.map((d) => (d.id === deal.id ? deal : d))
        : [deal, ...prev];
    });
  };

  const handleDealDeleted = (dealId: string | number) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
  };

  const handleDealError = (message: string) => {
    setAlert({ open: true, type: "error", message });
  };

  return {
    id,
    client,
    setClient,
    clients,
    setClients,
    isDealFormOpen,
    setIsDealFormOpen,
    isClientFormOpen,
    setIsClientFormOpen,
    editingDeal,
    setEditingDeal,
    showDebtModal,
    setShowDebtModal,
    showReconciliation,
    setShowReconciliation,
    selectedRowId,
    detailsView,
    setDetailsView,
    deals,
    dealsLoading,
    dealsErr,
    clientErr,
    supplierProducts,
    supplierProductsLoading,
    supplierProductsErr,
    supplierProductSearch,
    setSupplierProductSearch,
    supplierPurchases,
    supplierPurchasesLoading,
    supplierPurchasesErr,
    supplierPurchasesApiMissing,
    clientSalesLoading,
    clientSalesErr,
    alert,
    setAlert,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    loadDeals,
    loadSupplierProducts,
    loadSupplierPurchases,
    openDealForm,
    openClientForm,
    filteredDeals,
    filteredClientSales,
    applyPreset,
    dataTransmission,
    filteredSupplierProducts,
    supplierProductsCountLabel,
    supplierPurchasesTotals,
    handleClientUpdated,
    handleClientDeleted,
    handleDealSaved,
    handleDealDeleted,
    handleDealError,
  };
}
