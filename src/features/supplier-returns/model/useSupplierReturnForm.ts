import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCashBoxes, useCash } from "@entities/cash";
import { useUser } from "@entities/user";
import { useAppDispatch } from "@app/store";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { loadLocalReturns } from "../api/localStore";
import {
  createSupplierReturn,
  fetchReceiptDetail,
  fetchSupplierProducts,
  fetchSupplierReturns,
  fetchSuppliers,
} from "../api/supplierReturnsApi";
import { buildReturnableProducts } from "../lib/buildReturnableProducts";
import { profileDisplayName, supplierLabel } from "../lib/formatReturn";
import {
  isQtyAllowed,
  sumReturnItems,
  toFiniteNumber,
  validateReturnQty,
} from "../lib/returnMath";
import type {
  CompensationType,
  ReturnableProduct,
  ReturnReason,
  SupplierReturn,
} from "./types";

const parseQtyInput = (value: string, isWeight: boolean) => {
  const normalized = String(value || "").replace(",", ".").trim();
  if (!normalized) return 0;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return 0;
  if (!isWeight && !Number.isInteger(num)) return num;
  return num;
};

export function useSupplierReturnForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const alert = useAlert();
  const dispatch = useAppDispatch();
  const { company, profile } = useUser();
  const { list: cashBoxes } = useCash();
  const companyId = String(company?.id || company?.uuid || "local");

  const presetSupplierId = searchParams.get("supplier_id") || "";
  const presetReceiptId = searchParams.get("receipt_id") || "";

  const [suppliers, setSuppliers] = useState<unknown[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(presetSupplierId);
  const [productsLoading, setProductsLoading] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<unknown[]>([]);
  const [receipt, setReceipt] = useState<unknown>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [existingReturns, setExistingReturns] = useState<SupplierReturn[]>([]);
  const [qtyByProductId, setQtyByProductId] = useState<Record<string, string>>({});
  const [priceByProductId, setPriceByProductId] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<ReturnReason>("defect");
  const [comment, setComment] = useState("");
  const [compensation, setCompensation] = useState<CompensationType>("cash");
  const [cashboxId, setCashboxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [source, setSource] = useState<"backend" | "composed">("backend");

  const selectedSupplier = useMemo(
    () =>
      (suppliers as Array<Record<string, unknown>>).find(
        (supplier) => String(supplier.id || supplier.uuid || "") === selectedSupplierId,
      ) || null,
    [selectedSupplierId, suppliers],
  );

  const supplierOptions = useMemo(
    () =>
      (suppliers as Array<Record<string, unknown>>).map((supplier) => ({
        value: String(supplier.id || supplier.uuid || ""),
        label: supplierLabel(supplier),
      })),
    [suppliers],
  );

  useEffect(() => {
    void dispatch(getCashBoxes({} as never) as never);
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setSuppliersLoading(true);
        const list = await fetchSuppliers();
        if (!cancelled) setSuppliers(Array.isArray(list) ? list : []);
      } catch (error) {
        if (!cancelled) {
          setSuppliers([]);
          alert(validateResErrors(error, "Ошибка загрузки поставщиков"), true);
        }
      } finally {
        if (!cancelled) setSuppliersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [alert]);

  const loadCatalog = useCallback(
    async (supplierId: string) => {
      if (!supplierId) {
        setCatalogProducts([]);
        return;
      }
      try {
        setProductsLoading(true);
        const list = await fetchSupplierProducts(supplierId);
        setCatalogProducts(Array.isArray(list) ? list : []);
      } catch (error) {
        setCatalogProducts([]);
        alert(validateResErrors(error, "Ошибка загрузки товаров поставщика"), true);
      } finally {
        setProductsLoading(false);
      }
    },
    [alert],
  );

  useEffect(() => {
    void loadCatalog(selectedSupplierId);
    setQtyByProductId({});
  }, [loadCatalog, selectedSupplierId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!presetReceiptId) {
        setReceipt(null);
        return;
      }
      try {
        setReceiptLoading(true);
        const data = await fetchReceiptDetail(presetReceiptId);
        if (!cancelled) {
          setReceipt(data);
          const receiptSupplier = String(
            (data as { supplier_id?: unknown; supplier?: { id?: unknown } })?.supplier_id ||
              (data as { supplier?: { id?: unknown } })?.supplier?.id ||
              "",
          );
          if (receiptSupplier && !selectedSupplierId) {
            setSelectedSupplierId(receiptSupplier);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setReceipt(null);
          alert(validateResErrors(error, "Не удалось загрузить приход"), true);
        }
      } finally {
        if (!cancelled) setReceiptLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [alert, presetReceiptId, selectedSupplierId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedSupplierId) {
        setExistingReturns([]);
        return;
      }
      try {
        const payload = await fetchSupplierReturns({
          companyId,
          page: 1,
          limit: 200,
          filters: {
            supplier_id: selectedSupplierId,
            date_from: "",
            date_to: "",
            reason: "",
            search: "",
          },
        });
        if (!cancelled) {
          setExistingReturns(payload.list);
          setSource(payload.source);
        }
      } catch {
        if (!cancelled) {
          setExistingReturns(loadLocalReturns(companyId));
          setSource("composed");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, selectedSupplierId]);

  const returnableProducts = useMemo(
    () =>
      buildReturnableProducts({
        products: catalogProducts,
        receipt,
        existingReturns,
        receiptId: presetReceiptId || null,
      }),
    [catalogProducts, existingReturns, presetReceiptId, receipt],
  );

  useEffect(() => {
    setPriceByProductId((prev) => {
      const next = { ...prev };
      returnableProducts.forEach((product) => {
        if (next[product.productId] == null) {
          next[product.productId] =
            product.purchasePrice > 0 ? String(product.purchasePrice) : "";
        }
      });
      return next;
    });
  }, [returnableProducts]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return returnableProducts;
    return returnableProducts.filter((product) => {
      const haystack = [
        product.productName,
        product.barcode,
        product.article,
        product.code,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [returnableProducts, search]);

  const selectedItems = useMemo(
    () =>
      returnableProducts
        .map((product) => {
          const qty = parseQtyInput(qtyByProductId[product.productId] || "", product.isWeight);
          if (!qty) return null;
          const purchasePrice = toFiniteNumber(priceByProductId[product.productId], product.purchasePrice);
          return {
            product,
            qty,
            purchasePrice,
          };
        })
        .filter(Boolean) as Array<{
        product: ReturnableProduct;
        qty: number;
        purchasePrice: number;
      }>,
    [priceByProductId, qtyByProductId, returnableProducts],
  );

  const totalAmount = sumReturnItems(
    selectedItems.map((item) => ({
      qty: item.qty,
      purchasePrice: item.purchasePrice,
    })),
  );

  const validationError = useMemo(() => {
    if (!selectedSupplierId) return "Выберите поставщика";
    if (selectedItems.length === 0) return "Укажите количество хотя бы для одной позиции";
    for (const item of selectedItems) {
      const qtyError = validateReturnQty({
        qty: item.qty,
        maxQty: item.product.returnableQty,
        isWeight: item.product.isWeight,
        unit: item.product.unit,
      });
      if (qtyError) return `${item.product.productName}: ${qtyError}`;
      if (item.purchasePrice < 0) return `${item.product.productName}: цена не может быть отрицательной`;
      if (!isQtyAllowed(item.qty, item.product.isWeight)) {
        return `${item.product.productName}: некорректное количество`;
      }
    }
    if (reason === "other" && !comment.trim()) {
      return "Для причины «Другое» укажите комментарий";
    }
    return "";
  }, [
    cashBoxes,
    cashboxId,
    comment,
    compensation,
    reason,
    selectedItems,
    selectedSupplierId,
    totalAmount,
  ]);

  const handleQtyChange = (productId: string, value: string, isWeight: boolean) => {
    const pattern = isWeight ? /^\d*([.,]\d*)?$/ : /^\d*$/;
    if (value && !pattern.test(value)) return;
    setQtyByProductId((prev) => ({ ...prev, [productId]: value }));
  };

  const handlePriceChange = (productId: string, value: string) => {
    if (value && !/^\d*([.,]\d*)?$/.test(value)) return;
    setPriceByProductId((prev) => ({ ...prev, [productId]: value }));
  };

  const fillMax = (product: ReturnableProduct) => {
    const qty = product.returnableQty;
    if (qty <= 0) return;
    setQtyByProductId((prev) => ({
      ...prev,
      [product.productId]: product.isWeight ? String(qty) : String(Math.floor(qty)),
    }));
  };

  const submit = async () => {
    if (validationError) {
      alert(validationError, true);
      return;
    }
    try {
      setSubmitting(true);
      const result = await createSupplierReturn({
        companyId,
        companyPlanName: company?.subscription_plan?.name,
        dispatch: dispatch as never,
        payload: {
          supplierId: selectedSupplierId,
          supplierName: supplierLabel(selectedSupplier),
          receiptId: presetReceiptId || null,
          reason,
          comment: comment.trim(),
          compensation,
          cashboxId,
          createdByName: profileDisplayName(profile),
          items: selectedItems.map((item) => ({
            productId: item.product.productId,
            productName: item.product.productName,
            unit: item.product.unit,
            isWeight: item.product.isWeight,
            qty: item.qty,
            purchasePrice: item.purchasePrice,
            receiptItemId: item.product.receiptItemId,
            currentStock: item.product.currentStock,
          })),
        },
      });
      setSource(result.source);
      const composedNote =
        result.source === "composed"
          ? " Документ сохранён на этом устройстве до появления API возвратов."
          : "";
      alert(`Возврат поставщику оформлен.${composedNote}`, () => {
        navigate("/crm/market/procurement?tab=returns");
      });
    } catch (error) {
      alert(validateResErrors(error, "Не удалось оформить возврат"), true);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    navigate,
    suppliersLoading,
    supplierOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedSupplier,
    productsLoading,
    receiptLoading,
    receiptId: presetReceiptId,
    receipt,
    visibleProducts,
    search,
    setSearch,
    qtyByProductId,
    priceByProductId,
    handleQtyChange,
    handlePriceChange,
    fillMax,
    reason,
    setReason,
    comment,
    setComment,
    compensation,
    setCompensation,
    cashBoxes: Array.isArray(cashBoxes) ? cashBoxes : [],
    cashboxId,
    setCashboxId,
    selectedCount: selectedItems.length,
    totalAmount,
    validationError,
    submitting,
    source,
    submit,
    canSubmit: !validationError && !submitting,
  };
}

export type SupplierReturnFormVm = ReturnType<typeof useSupplierReturnForm>;
