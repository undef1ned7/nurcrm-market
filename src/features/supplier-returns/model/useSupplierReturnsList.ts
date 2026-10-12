import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useUser } from "@entities/user";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  fetchSupplierReturnDetail,
  fetchSupplierReturns,
  fetchSuppliers,
} from "../api/supplierReturnsApi";
import { supplierLabel } from "../lib/formatReturn";
import { DEFAULT_PAGE_SIZE } from "./constants";
import type { SupplierReturn, SupplierReturnFilters } from "./types";

const parseFilters = (searchParams: URLSearchParams): SupplierReturnFilters => ({
  supplier_id: searchParams.get("supplier_id") || "",
  date_from: searchParams.get("date_from") || "",
  date_to: searchParams.get("date_to") || "",
  reason: searchParams.get("reason") || "",
  search: searchParams.get("search") || "",
});

const parsePage = (searchParams: URLSearchParams) => {
  const page = parseInt(searchParams.get("page") || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const parseLimit = (searchParams: URLSearchParams) => {
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_PAGE_SIZE;
};

const emptyFilters = (): SupplierReturnFilters => ({
  supplier_id: "",
  date_from: "",
  date_to: "",
  reason: "",
  search: "",
});

export function useSupplierReturnsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const alert = useAlert();
  const { company } = useUser();
  const companyId = String(company?.id || company?.uuid || "local");

  const page = useMemo(() => parsePage(searchParams), [searchParams]);
  const limit = useMemo(() => parseLimit(searchParams), [searchParams]);
  const appliedFilters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [filtersDraft, setFiltersDraft] = useState(appliedFilters);
  const [loading, setLoading] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [rows, setRows] = useState<SupplierReturn[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [source, setSource] = useState<"backend" | "composed">("backend");
  const [suppliers, setSuppliers] = useState<unknown[]>([]);
  const [detail, setDetail] = useState<SupplierReturn | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setFiltersDraft(appliedFilters);
  }, [appliedFilters]);

  const replaceParams = useCallback(
    (patch: Record<string, string | number>) => {
      setSearchParams(
        (prev) => {
          const current = {
            tab: prev.get("tab") || "returns",
            page: String(parsePage(prev)),
            limit: String(parseLimit(prev)),
            ...parseFilters(prev),
            ...patch,
          };
          const nextParams = new URLSearchParams();
          nextParams.set("tab", "returns");
          nextParams.set("page", String(current.page || 1));
          nextParams.set("limit", String(current.limit || DEFAULT_PAGE_SIZE));
          ["supplier_id", "date_from", "date_to", "reason", "search"].forEach((key) => {
            const value = String(current[key] || "");
            if (value) nextParams.set(key, value);
          });
          if (prev.toString() === nextParams.toString()) return prev;
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const loadSuppliers = useCallback(async () => {
    try {
      setSuppliersLoading(true);
      const list = await fetchSuppliers();
      setSuppliers(Array.isArray(list) ? list : []);
    } catch (error) {
      setSuppliers([]);
      alert(validateResErrors(error, "Ошибка загрузки поставщиков"), true);
    } finally {
      setSuppliersLoading(false);
    }
  }, [alert]);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await fetchSupplierReturns({
        companyId,
        page,
        limit,
        filters: appliedFilters,
      });
      setRows(payload.list);
      setCount(payload.count);
      setNext(payload.next);
      setPrevious(payload.previous);
      setTotalAmount(payload.totalAmount);
      setSource(payload.source);
    } catch (error) {
      setRows([]);
      setCount(0);
      setNext(null);
      setPrevious(null);
      setTotalAmount(null);
      alert(validateResErrors(error, "Ошибка загрузки возвратов"), true);
    } finally {
      setLoading(false);
    }
  }, [alert, appliedFilters, companyId, limit, page]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const openDetail = async (row: SupplierReturn) => {
    setDetail(row);
    if (row.items.length > 0) return;
    try {
      setDetailLoading(true);
      const full = await fetchSupplierReturnDetail(row.id, companyId);
      if (full) setDetail(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const dateRangeInvalid = Boolean(
    filtersDraft.date_from &&
      filtersDraft.date_to &&
      filtersDraft.date_from > filtersDraft.date_to,
  );

  const hasPendingChanges =
    JSON.stringify(filtersDraft) !== JSON.stringify(appliedFilters);
  const hasAnyFilter = Object.values(appliedFilters).some(Boolean);

  const supplierOptions = useMemo(
    () =>
      (suppliers as Array<Record<string, unknown>>).map((supplier) => ({
        value: String(supplier.id || supplier.uuid || ""),
        label: supplierLabel(supplier),
      })),
    [suppliers],
  );

  const totalPages = count && limit ? Math.max(1, Math.ceil(count / limit)) : 1;

  return {
    navigate,
    loading,
    source,
    rows,
    count,
    totalAmount,
    page,
    limit,
    totalPages,
    hasNextPage: Boolean(next),
    hasPrevPage: Boolean(previous),
    filtersDraft,
    setFiltersDraft,
    appliedFilters,
    hasPendingChanges,
    hasAnyFilter,
    dateRangeInvalid,
    suppliersLoading,
    supplierOptions,
    detail,
    detailLoading,
    openDetail,
    closeDetail: () => {
      setDetail(null);
      setDetailLoading(false);
    },
    loadRows,
    applyFilters: () => {
      if (dateRangeInvalid) {
        alert("Дата «до» не может быть раньше даты «от».", true);
        return;
      }
      replaceParams({ page: 1, ...filtersDraft });
    },
    resetFilters: () => {
      setFiltersDraft(emptyFilters());
      replaceParams({ page: 1, ...emptyFilters() });
    },
    handlePageChange: (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      replaceParams({ page: newPage });
    },
    goCreate: (opts?: { supplierId?: string; receiptId?: string }) => {
      const params = new URLSearchParams();
      if (opts?.supplierId) params.set("supplier_id", opts.supplierId);
      if (opts?.receiptId) params.set("receipt_id", opts.receiptId);
      navigate(
        `/crm/market/procurement/return${params.toString() ? `?${params}` : ""}`,
      );
    },
  };
}

export type SupplierReturnsListVm = ReturnType<typeof useSupplierReturnsList>;
