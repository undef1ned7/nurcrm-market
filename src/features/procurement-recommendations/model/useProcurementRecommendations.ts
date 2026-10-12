import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProfileBranchId } from "@shared/lib/tools/branchContext";
import { useNavigate } from "react-router";
import api from "@shared/api";
import { useUser } from "@entities/user";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { fetchProcurementRecommendations } from "../api/procurementRecommendationApi";
import { buildRecommendationRows } from "../lib/buildRecommendationRows";
import {
  filterRecommendationRows,
  resolveRecommendationsEmptyKind,
} from "../lib/filterRecommendations";
import {
  buildSupplierLabel,
  listFrom,
} from "../lib/productMappers";
import { toFiniteNumber } from "../lib/recommendationMath";
import { SUPPLIERS_API_PATH } from "./constants";
import { loadRecommendationSettings, saveRecommendationSettings } from "./settingsStorage";
import type {
  ProcurementReceiptDraft,
  ProcurementRecommendationPayload,
  ProcurementRecommendationSettings,
  RecommendationFilter,
} from "./types";

const parseOrderQty = (value: string, isWeight: boolean) => {
  const n = toFiniteNumber(String(value).replace(",", "."), NaN);
  if (!Number.isFinite(n) || n < 0) return 0;
  return isWeight ? n : Math.floor(n);
};

export function useProcurementRecommendations() {
  const navigate = useNavigate();
  const { profile } = useUser();

  const [suppliers, setSuppliers] = useState<Record<string, unknown>[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const [settings, setSettings] = useState<ProcurementRecommendationSettings>(
    loadRecommendationSettings,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [payload, setPayload] = useState<ProcurementRecommendationPayload | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RecommendationFilter>("all");
  const [orderQtyById, setOrderQtyById] = useState<Record<string, string>>({});
  const [explanationId, setExplanationId] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: String(supplier.id || ""),
        label: buildSupplierLabel(supplier),
      })),
    [suppliers],
  );

  const selectedSupplier = useMemo(
    () =>
      suppliers.find(
        (supplier) => String(supplier.id || "") === selectedSupplierId,
      ) || null,
    [suppliers, selectedSupplierId],
  );

  const loadSuppliers = useCallback(async () => {
    try {
      setSuppliersLoading(true);
      setSuppliersError("");
      const res = await api.get(SUPPLIERS_API_PATH, {
        params: { type: "suppliers", page_size: 500 },
      });
      const rows = listFrom(res).filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object",
      );
      setSuppliers(rows);
    } catch (err) {
      setSuppliersError(
        validateResErrors(err, "Не удалось загрузить поставщиков"),
      );
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!selectedSupplierId) {
      setPayload(null);
      setError("");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const next = await fetchProcurementRecommendations({
        supplierId: selectedSupplierId,
        supplierName: buildSupplierLabel(selectedSupplier),
        settings: settingsRef.current,
        branchId: getProfileBranchId(profile),
      });
      setPayload(next);
    } catch (err) {
      setPayload(null);
      setError(
        validateResErrors(
          err,
          "Не удалось загрузить рекомендации по закупке",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [profile, selectedSupplier, selectedSupplierId]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    setOrderQtyById({});
    setSearch("");
    setFilter("all");
    setExplanationId(null);
  }, [selectedSupplierId]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations, settings.analysisDays]);

  useEffect(() => {
    saveRecommendationSettings(settings);
  }, [settings]);

  const calculatedRows = useMemo(
    () => buildRecommendationRows(payload?.items || [], settings),
    [payload?.items, settings],
  );

  const visibleRows = useMemo(
    () => filterRecommendationRows(calculatedRows, { search, filter }),
    [calculatedRows, filter, search],
  );

  const emptyKind = resolveRecommendationsEmptyKind({
    supplierId: selectedSupplierId,
    loadedCount: calculatedRows.length,
    visibleCount: visibleRows.length,
    filter,
    search,
  });

  const summary = useMemo(() => {
    const recommendedProductsCount = calculatedRows.filter(
      (row) => row.recommendedQty > 0,
    ).length;
    const criticalProductsCount = calculatedRows.filter(
      (row) => row.stockStatus === "critical",
    ).length;
    let estimated = 0;
    let hasPrice = false;
    visibleRows.forEach((row) => {
      const qty = parseOrderQty(
        orderQtyById[row.productId] ?? "",
        row.isWeight,
      );
      if (qty <= 0) return;
      if (row.purchasePrice == null) return;
      hasPrice = true;
      estimated += qty * row.purchasePrice;
    });
    return {
      productsCount: calculatedRows.length,
      recommendedProductsCount,
      criticalProductsCount,
      estimatedTotal: hasPrice ? estimated : null,
    };
  }, [calculatedRows, orderQtyById, visibleRows]);

  const orderedCount = useMemo(
    () =>
      visibleRows.filter(
        (row) =>
          parseOrderQty(orderQtyById[row.productId] ?? "", row.isWeight) > 0,
      ).length,
    [orderQtyById, visibleRows],
  );

  const handleQtyChange = useCallback(
    (productId: string, value: string, isWeight: boolean) => {
      if (value && !/^\d*([.,]\d*)?$/.test(value)) return;
      if (!isWeight && value.includes(".")) {
        const [intPart] = value.replace(",", ".").split(".");
        setOrderQtyById((prev) => ({ ...prev, [productId]: intPart || "" }));
        return;
      }
      setOrderQtyById((prev) => ({ ...prev, [productId]: value }));
    },
    [],
  );

  const fillRecommended = useCallback(() => {
    setOrderQtyById((prev) => {
      const next = { ...prev };
      visibleRows.forEach((row) => {
        next[row.productId] =
          row.recommendedQty > 0 ? String(row.recommendedQty) : "0";
      });
      return next;
    });
  }, [visibleRows]);

  const clearOrderQty = useCallback(() => {
    setOrderQtyById((prev) => {
      const next = { ...prev };
      visibleRows.forEach((row) => {
        next[row.productId] = "0";
      });
      return next;
    });
  }, [visibleRows]);

  const createReceiptDraft = useCallback((): ProcurementReceiptDraft | null => {
    if (!selectedSupplierId) return null;
    const items = calculatedRows
      .map((row) => ({
        productId: row.productId,
        qty: parseOrderQty(orderQtyById[row.productId] ?? "", row.isWeight),
        purchasePrice: row.purchasePrice ?? null,
      }))
      .filter((item) => item.qty > 0);
    if (!items.length) return null;
    return { supplierId: selectedSupplierId, items };
  }, [calculatedRows, orderQtyById, selectedSupplierId]);

  const submitToReceipt = useCallback(() => {
    const draft = createReceiptDraft();
    if (!draft) return;
    navigate("/crm/market/procurement/receipt", {
      state: { procurementDraft: draft },
    });
  }, [createReceiptDraft, navigate]);

  const updateSettings = useCallback(
    (patch: Partial<ProcurementRecommendationSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  return {
    navigate,
    suppliersLoading,
    suppliersError,
    supplierOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedSupplier,
    settings,
    updateSettings,
    settingsOpen,
    setSettingsOpen,
    loading,
    error,
    source: payload?.source ?? null,
    search,
    setSearch,
    filter,
    setFilter,
    visibleRows,
    calculatedRows,
    emptyKind,
    summary,
    orderedCount,
    orderQtyById,
    handleQtyChange,
    fillRecommended,
    clearOrderQty,
    submitToReceipt,
    explanationId,
    setExplanationId,
    loadRecommendations,
    loadSuppliers,
    canSubmit: orderedCount > 0,
  };
}

export type ProcurementRecommendationsVm = ReturnType<
  typeof useProcurementRecommendations
>;
