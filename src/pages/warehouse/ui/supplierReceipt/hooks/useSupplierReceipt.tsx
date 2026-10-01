import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { pdf } from "@react-pdf/renderer";
import { useLocation, useNavigate } from "react-router";
import type { ProcurementReceiptDraft } from "@features/procurement-recommendations";
import api from "@shared/api";
import InvoicePdfDocument from "@pages/documents/ui/components/InvoicePdfDocument";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  postCashflowIfNeeded,
} from "@entities/cash";
import { buildExpenseVariableRouting } from "@shared/lib/tools/cashboxResolution";
import {
  useRecordShiftDrawerOutflow,
  useShiftDrawerFundingTarget,
} from "@entities/shift";
import { useUser } from "@entities/user";
import { createDeal } from "@entities/sale";
import {
  buildProductLabel,
  buildSupplierLabel,
  downloadBlob,
  formatPriceInput,
  getTodayIsoDate,
  listFrom,
  parseNonNegativePrice,
  parsePositiveQty,
  toNum,
} from "../supplierReceiptUtils";

const readProcurementDraft = (state: unknown): ProcurementReceiptDraft | null => {
  const draft = (state as { procurementDraft?: ProcurementReceiptDraft } | null)
    ?.procurementDraft;
  if (!draft || typeof draft !== "object") return null;
  const supplierId = String(draft.supplierId || "").trim();
  if (!supplierId || !Array.isArray(draft.items) || draft.items.length === 0) {
    return null;
  }
  return {
    supplierId,
    items: draft.items
      .map((item) => ({
        productId: String(item?.productId || "").trim(),
        qty: Number(item?.qty) || 0,
        purchasePrice: item?.purchasePrice ?? null,
      }))
      .filter((item) => item.productId && item.qty > 0),
  };
};

export function useSupplierReceipt() {
  const dispatch = useDispatch() as any as any;
  const navigate = useNavigate();
  const location = useLocation();
  const alert = useAlert();
  const confirm = useConfirm();
  const { company } = useUser();
  const shiftDrawerFundingTarget = useShiftDrawerFundingTarget();
  const recordShiftDrawerOutflow = useRecordShiftDrawerOutflow();
  const pendingDraftRef = useRef(readProcurementDraft(location.state));
  const appliedDraftRef = useRef(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    () => pendingDraftRef.current?.supplierId || "",
  );
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [createSupplierName, setCreateSupplierName] = useState("");
  const [createSupplierPhone, setCreateSupplierPhone] = useState("");
  const [createSupplierSaving, setCreateSupplierSaving] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [modalProducts, setModalProducts] = useState<any[]>([]);
  const [modalProductsLoading, setModalProductsLoading] = useState(false);
  const [modalProductsPage, setModalProductsPage] = useState(1);
  const [modalProductsCount, setModalProductsCount] = useState(0);
  const [modalProductsHasNext, setModalProductsHasNext] = useState(false);
  const [modalProductsHasPrev, setModalProductsHasPrev] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [productsModalSearch, setProductsModalSearch] = useState("");
  const [qtyByProductId, setQtyByProductId] = useState<any>({});
  const [priceByProductId, setPriceByProductId] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [paymentType, setPaymentType] = useState("full");
  const [prepayment, setPrepayment] = useState("");
  const [debtMonths, setDebtMonths] = useState("1");
  const [firstPaymentDate, setFirstPaymentDate] = useState(getTodayIsoDate);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paidFromShiftDrawer, setPaidFromShiftDrawer] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [completedReceiptSnapshot, setCompletedReceiptSnapshot] = useState<any>(null);

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
      suppliers.find((supplier) => String(supplier.id || "") === selectedSupplierId) ||
      null,
    [suppliers, selectedSupplierId],
  );

  const loadSuppliers = async () => {
    try {
      setSuppliersLoading(true);
      const res = await api.get("/main/clients/", {
        params: { type: "suppliers", page_size: 500 },
      });
      setSuppliers(Array.isArray(listFrom(res)) ? listFrom(res) : []);
    } catch (error: any) {
      const errorMessage = validateResErrors(
        error,
        "Ошибка при загрузке поставщиков",
      );
      alert(errorMessage, true);
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const loadSupplierProducts = useCallback(async (supplierId) => {
    const normalizedSupplierId = String(supplierId || "").trim();
    if (!normalizedSupplierId) {
      setProducts([]);
      return;
    }

    try {
      setProductsLoading(true);
      const res = await api.get(
        `/main/suppliers/${encodeURIComponent(normalizedSupplierId)}/products/`,
      );
      const nextProducts = Array.isArray(listFrom(res)) ? listFrom(res) : [];
      setProducts(nextProducts);
      setPriceByProductId(
        nextProducts.reduce((acc, product) => {
          const productId = String(product?.id || "");
          if (!productId) return acc;
          acc[productId] = formatPriceInput(
            product?.purchase_price ?? product?.price ?? "",
          );
          return acc;
        }, {}),
      );
    } catch (error: any) {
      const errorMessage = validateResErrors(
        error,
        "Ошибка при загрузке товаров поставщика",
      );
      alert(errorMessage, true);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [alert]);

  const loadModalProducts = async (page = 1, searchValue = "") => {
    try {
      setModalProductsLoading(true);
      const params: any = {
        page,
      };
      const normalizedSearch = String(searchValue || "").trim();
      if (normalizedSearch) {
        params.search = normalizedSearch;
      }
      const res = await api.get("/main/products/list/", {
        params,
      });
      const data = res?.data || {};
      const nextProducts = Array.isArray(data?.results) ? data.results : [];
      setModalProducts(nextProducts);
      setModalProductsPage(Number(data?.page || page || 1));
      setModalProductsCount(Number(data?.count || 0));
      setModalProductsHasNext(Boolean(data?.next));
      setModalProductsHasPrev(Boolean(data?.previous));
    } catch (error: any) {
      const errorMessage = validateResErrors(error, "Ошибка при загрузке товаров");
      alert(errorMessage, true);
      setModalProducts([]);
      setModalProductsCount(0);
      setModalProductsHasNext(false);
      setModalProductsHasPrev(false);
    } finally {
      setModalProductsLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    const full_name = String(createSupplierName || "").trim();
    const phone = String(createSupplierPhone || "").trim();
    if (!full_name) {
      alert("Введите имя поставщика.", true);
      return;
    }
    if (!phone) {
      alert("Введите телефон поставщика.", true);
      return;
    }
    try {
      setCreateSupplierSaving(true);
      const { data } = await api.post("/main/clients/", {
        type: "suppliers",
        full_name,
        phone,
      });
      const createdId = String(data?.id || "").trim();
      await loadSuppliers();
      if (createdId) setSelectedSupplierId(createdId);
      setCreateSupplierOpen(false);
      setCreateSupplierName("");
      setCreateSupplierPhone("");
    } catch (error: any) {
      const errorMessage = validateResErrors(error, "Ошибка создания поставщика");
      alert(errorMessage, true);
    } finally {
      setCreateSupplierSaving(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
    // intentionally once on mount to avoid refetch loops from unstable hook refs
     
  }, []);

  useEffect(() => {
    const draft = pendingDraftRef.current;
    const keepDraftQty =
      Boolean(draft) &&
      String(draft?.supplierId || "") === String(selectedSupplierId) &&
      !appliedDraftRef.current;

    if (!keepDraftQty) {
      setQtyByProductId({});
    }
    setPriceByProductId({});
    setPaymentType("full");
    setPrepayment("");
    setPaidFromShiftDrawer(false);
    setDebtMonths("1");
    setFirstPaymentDate(getTodayIsoDate());
    if (!selectedSupplierId) {
      setProducts([]);
      return;
    }
    void loadSupplierProducts(selectedSupplierId);
    // refetch only when supplier actually changes
     
  }, [selectedSupplierId]);

  useEffect(() => {
    const draft = pendingDraftRef.current;
    if (!draft || appliedDraftRef.current) return;
    if (String(draft.supplierId) !== String(selectedSupplierId)) return;
    if (!products.length) return;

    const qty: Record<string, string> = {};
    const price: Record<string, string> = {};
    draft.items.forEach((item) => {
      qty[item.productId] = String(item.qty);
      if (item.purchasePrice != null) {
        price[item.productId] = formatPriceInput(item.purchasePrice);
      }
    });
    setQtyByProductId((prev: any) => ({ ...prev, ...qty }));
    setPriceByProductId((prev: any) => ({ ...prev, ...price }));
    appliedDraftRef.current = true;
    pendingDraftRef.current = null;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, products, selectedSupplierId]);

  useEffect(() => {
    if (!productsModalOpen) return;
    setProductsModalSearch("");
    void loadModalProducts(1, "");
     
  }, [productsModalOpen]);

  const tableProducts = useMemo(() => {
    if (!selectedSupplierId) return [];
    return products;
  }, [products, selectedSupplierId]);

  const receiptItems = useMemo(
    () =>
      Object.entries(qtyByProductId)
        .map(([product, qty]) => {
          const purchasePrice = parseNonNegativePrice(priceByProductId[product]);
          return {
            product,
            qty: parsePositiveQty(qty),
            ...(purchasePrice !== null
              ? { purchase_price: purchasePrice }
              : {}),
          };
        })
        .filter((item: any) => item.qty > 0),
    [priceByProductId, qtyByProductId],
  );

  const totalReceiptQty = useMemo(
    () => receiptItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [receiptItems],
  );

  const receiptItemsForPdf = useMemo(
    () =>
      receiptItems.map((item: any) => {
        const product = products.find(
          (candidate) => String(candidate?.id || "") === String(item.product || ""),
        );
        return {
          productId: item.product,
          name: buildProductLabel(product),
          article: product?.article || product?.barcode || product?.code || "",
          unit: product?.unit || "ШТ",
          qty: Number(item.qty || 0),
          purchase_price: Number(item.purchase_price || 0),
        };
      }),
    [products, receiptItems],
  );

  const totalReceiptAmount = useMemo(
    () =>
      receiptItemsForPdf.reduce(
        (sum, item) =>
          sum + Number(item.qty || 0) * Number(item.purchase_price || 0),
        0,
      ),
    [receiptItemsForPdf],
  );

  const cashExpenseAmount = useMemo(() => {
    if (paymentType === "debt") return 0;
    if (paymentType === "prepayment") return toNum(prepayment);
    return totalReceiptAmount;
  }, [paymentType, prepayment, totalReceiptAmount]);

  const handleQtyChange = useCallback((productId: any, value: any) => {
    const nextValue = String(value ?? "");
    if (nextValue && !/^\d*([.,]\d*)?$/.test(nextValue)) return;
    setQtyByProductId((prev: any) => ({
      ...prev,
      [productId]: nextValue,
    }));
  }, []);

  const handlePriceChange = useCallback((productId: any, value: any) => {
    const nextValue = String(value ?? "");
    if (nextValue && !/^\d*([.,]\d*)?$/.test(nextValue)) return;
    setPriceByProductId((prev: any) => ({
      ...prev,
      [productId]: nextValue,
    }));
  }, []);

  const getSupplierIdFromProduct = useCallback((product: any) => {
    if (!product || typeof product !== "object") return "";
    const rawSupplier =
      product.client ??
      product.client_id ??
      product.supplier ??
      product.supplier_id ??
      product.provider ??
      product.provider_id;
    if (!rawSupplier) return "";
    if (typeof rawSupplier === "object") {
      return String(rawSupplier.id || "").trim();
    }
    return String(rawSupplier).trim();
  }, []);

  const addProductToReceipt = useCallback(
    async (productId: any, productData: any = null) => {
      const normalizedProductId = String(productId || "").trim();
      if (!normalizedProductId) return;
      const supplierId = getSupplierIdFromProduct(productData);
      const selectedId = String(selectedSupplierId || "").trim();
      const productName = buildProductLabel(productData);

      const askConfirm = (message) =>
        new Promise((resolve) => {
          confirm(message, (ok) => resolve(Boolean(ok)));
        });

      const ensureProductInCurrentList = () => {
        if (!productData) return;
        setProducts((prev: any) => {
          const exists = prev.some(
            (item: any) => String(item?.id || "") === normalizedProductId,
          );
          if (exists) return prev;
          return [productData, ...prev];
        });
        setPriceByProductId((prev: any) => ({
          ...prev,
          [normalizedProductId]:
            prev[normalizedProductId] ??
            formatPriceInput(
              productData?.purchase_price ?? productData?.price ?? "",
            ),
        }));
      };

      if (selectedId) {
        const productSupplierId = String(supplierId || "").trim();
        if (!productSupplierId) {
          const shouldBind = await askConfirm(
            `У товара "${productName}" не указан поставщик. Привязать товар к выбранному поставщику?`,
          );
          if (!shouldBind) return;
          try {
            await api.patch(`/main/products/${normalizedProductId}/`, {
              client: selectedId,
            });
            ensureProductInCurrentList();
          } catch (error: any) {
            const errorMessage = validateResErrors(
              error,
              "Не удалось привязать товар к выбранному поставщику",
            );
            alert(errorMessage, true);
            return;
          }
        } else if (productSupplierId !== selectedId) {
          try {
            await api.patch(`/main/products/${normalizedProductId}/`, {
              client: selectedId,
            });
            ensureProductInCurrentList();
          } catch (error: any) {
            const errorMessage = validateResErrors(
              error,
              "Не удалось обновить поставщика у товара",
            );
            alert(errorMessage, true);
            return;
          }
        }
      } else {
        if (!supplierId) {
          alert(
            "У выбранного товара не указан поставщик. Укажите поставщика в карточке товара.",
            true,
          );
          return;
        }
        setSelectedSupplierId(String(supplierId));
        ensureProductInCurrentList();
      }

      setQtyByProductId((prev: any) => ({
        ...prev,
        [normalizedProductId]: prev[normalizedProductId] || "1",
      }));
    },
    [
      alert,
      confirm,
      getSupplierIdFromProduct,
      selectedSupplierId,
      setQtyByProductId,
    ],
  );

  const handleClearQty = useCallback(() => {
    setQtyByProductId({});
  }, []);

  const buildInvoicePdfBlob = useCallback(
    async ({ supplier, items, total }) => {
      const timestamp = new Date();
      const invoiceNumber = `PR-${timestamp.getFullYear()}${String(
        timestamp.getMonth() + 1,
      ).padStart(2, "0")}${String(timestamp.getDate()).padStart(
        2,
        "0",
      )}-${String(timestamp.getHours()).padStart(2, "0")}${String(
        timestamp.getMinutes(),
      ).padStart(2, "0")}`;

      let companyName = "";
      try {
        companyName = localStorage.getItem("company_name") || "";
      } catch {
        /* keep empty */
      }

      return pdf(
        <InvoicePdfDocument
          data={{
            doc_type: "purchase",
            number: invoiceNumber,
            document: {
              type: "purchase_invoice",
              doc_type: "purchase",
              title: "Накладная",
              number: invoiceNumber,
              date: timestamp.toISOString().split("T")[0],
              datetime: timestamp.toISOString(),
              created_at: timestamp.toISOString(),
              discount_percent: 0,
            },
            seller: {
              name: buildSupplierLabel(supplier),
              address: supplier?.address || "",
              phone: supplier?.phone || null,
              email: supplier?.email || null,
            },
            buyer: {
              name: companyName || "Компания",
              full_name: companyName || "Компания",
              address: "",
              phone: null,
              email: null,
            },
            items: items.map((item: any) => ({
              id: item.productId,
              name: item.name,
              article: item.article,
              unit: item.unit,
              qty: String(item.qty),
              unit_price: String(item.purchase_price.toFixed(2)),
              total: String((item.qty * item.purchase_price).toFixed(2)),
              discount_percent: 0,
              price_before_discount: String(item.purchase_price.toFixed(2)),
            })),
            totals: {
              subtotal: String(total.toFixed(2)),
              discount_total: "0.00",
              tax_total: "0.00",
              total: String(total.toFixed(2)),
            },
            warehouse: companyName || "Склад",
          }}
        />,
      ).toBlob();
    },
    [],
  );

  const handleDownloadInvoice = useCallback(
    async (snapshot: any = null) => {
      const supplier = snapshot?.supplier || selectedSupplier;
      const items = snapshot?.items || receiptItemsForPdf;
      const total = snapshot?.total ?? totalReceiptAmount;

      if (!supplier) {
        alert("Нет данных для накладной", true);
        return;
      }

      if (!items.length) {
        alert("Нет позиций для накладной", true);
        return;
      }

      setDownloadingInvoice(true);
      try {
        const blob = await buildInvoicePdfBlob({ supplier, items, total });
        const supplierFilePart = buildSupplierLabel(supplier)
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9а-яё_()-]/gi, "")
          .slice(0, 40);

        downloadBlob(blob, `receipt_invoice_${supplierFilePart || "supplier"}.pdf`);
      } catch (error: any) {
        alert(
          error?.message || "Не удалось скачать накладную. Попробуйте позже.",
          true,
        );
      } finally {
        setDownloadingInvoice(false);
      }
    },
    [
      alert,
      buildInvoicePdfBlob,
      receiptItemsForPdf,
      selectedSupplier,
      totalReceiptAmount,
    ],
  );

  const handleOpenPaymentModal = useCallback(() => {
    if (!selectedSupplierId) {
      alert("Сначала выберите поставщика", true);
      return;
    }

    if (receiptItems.length === 0) {
      alert("Укажите количество хотя бы для одного товара", true);
      return;
    }

    setPaymentModalOpen(true);
  }, [alert, receiptItems.length, selectedSupplierId]);

  const handleCloseSuccessModal = useCallback(() => {
    setSuccessModalOpen(false);
    setCompletedReceiptSnapshot(null);
  }, []);

  const handleConfirmReceipt = useCallback(async () => {
    if (!selectedSupplierId) {
      alert("Сначала выберите поставщика", true);
      return;
    }

    if (receiptItems.length === 0) {
      alert("Укажите количество хотя бы для одного товара", true);
      return;
    }

    if (totalReceiptAmount > 0 && paymentType === "prepayment") {
      const prepaymentValue = toNum(prepayment);
      if (prepaymentValue <= 0) {
        alert("Укажите сумму предоплаты", true);
        return;
      }
      if (prepaymentValue > totalReceiptAmount) {
        alert("Предоплата не может быть больше суммы накладной", true);
        return;
      }
    }

    if (
      totalReceiptAmount > 0 &&
      (paymentType === "debt" || paymentType === "prepayment") &&
      (!debtMonths || Number(debtMonths) <= 0)
    ) {
      alert("Укажите срок долга", true);
      return;
    }

    const supplierLabel = buildSupplierLabel(selectedSupplier);

    let receiptPosted = false;
    try {
      setSubmitting(true);
      const { data: receiptData } = await api.post(
        `/main/suppliers/${encodeURIComponent(selectedSupplierId)}/receipt/`,
        {
          items: receiptItems,
          payment_type:
            paymentType === "debt"
              ? "debt"
              : paymentType === "prepayment"
                ? "prepayment"
                : "cash",
          ...(paymentType === "cash" || paymentType === "prepayment"
            ? buildExpenseVariableRouting()
            : {}),
        },
      );
      receiptPosted = true;

      const receiptId = receiptData?.id ?? receiptData?.uuid ?? null;
      const sideEffectWarnings: any[] = [];

      if (
        totalReceiptAmount > 0 &&
        (paymentType === "debt" || paymentType === "prepayment")
      ) {
        const prepaymentValue = toNum(prepayment);
        const remainingDebt =
          paymentType === "prepayment"
            ? Math.max(0, totalReceiptAmount - prepaymentValue)
            : totalReceiptAmount;

        try {
          if (company?.subscription_plan?.name === "Старт" && remainingDebt > 0) {
            await api.post("/main/debts/", {
              name: supplierLabel,
              phone: selectedSupplier?.phone || "",
              due_date: firstPaymentDate,
              amount: remainingDebt,
            });
          }

          await dispatch(
            createDeal({
              clientId: selectedSupplierId,
              title: `${paymentType === "prepayment" ? "Предоплата" : "Долги"} ${supplierLabel}`,
              statusRu: paymentType === "prepayment" ? "Предоплата" : "Долги",
              amount: totalReceiptAmount,
              prepayment:
                paymentType === "prepayment" ? prepaymentValue : undefined,
              debtMonths: Number(debtMonths || 1),
              first_due_date: firstPaymentDate,
            }),
          ).unwrap();
        } catch (dealError) {
          sideEffectWarnings.push(
            validateResErrors(
              dealError,
              "Товары оприходованы, но не удалось создать запись о долге. ",
            ),
          );
        }
      }

      if (cashExpenseAmount > 0) {
        await postCashflowIfNeeded(
          dispatch,
          {
            type: "expense",
            name: `Закупка: ${supplierLabel}`,
            amount: Number(cashExpenseAmount).toFixed(2),
            ...(receiptId != null && { source_cashbox_flow_id: receiptId }),
            source_business_operation_id: "Закупки",
            status:
              company?.subscription_plan?.name === "Старт"
                ? "approved"
                : "pending",
          },
          { warnOnFailure: true, failureContext: "purchase" },
        );
      }

      if (
        cashExpenseAmount > 0 &&
        paidFromShiftDrawer &&
        shiftDrawerFundingTarget.available &&
        shiftDrawerFundingTarget.cashboxId
      ) {
        const drawerResult = await recordShiftDrawerOutflow({
          cashboxId: shiftDrawerFundingTarget.cashboxId,
          amount: cashExpenseAmount,
          name: `Приход поставщика — оплата из кассы смены: ${supplierLabel}`,
        });
        if (!drawerResult.ok) {
          sideEffectWarnings.push(
            "Товары оприходованы, но списание из кассы смены не записалось — добавьте вручную в «Касса».",
          );
        }
      }

      setCompletedReceiptSnapshot({
        supplier: selectedSupplier,
        items: [...receiptItemsForPdf],
        total: totalReceiptAmount,
        paymentType,
        cashExpenseAmount,
      });
      setPaymentModalOpen(false);
      setQtyByProductId({});
      setSuccessModalOpen(true);
      await loadSupplierProducts(selectedSupplierId);

      if (sideEffectWarnings.length > 0) {
        alert(sideEffectWarnings.join("\n"), true);
      }
    } catch (error: any) {
      const errorMessage = validateResErrors(
        error,
        receiptPosted
          ? "Товары могли быть оприходованы, но завершение операции прервалось"
          : "Ошибка при оприходовании товаров",
      );
      alert(errorMessage, true);
    } finally {
      setSubmitting(false);
    }
  }, [
    alert,
    cashExpenseAmount,
    company?.subscription_plan?.name,
    debtMonths,
    dispatch,
    firstPaymentDate,
    loadSupplierProducts,
    paidFromShiftDrawer,
    paymentType,
    prepayment,
    receiptItems,
    receiptItemsForPdf,
    recordShiftDrawerOutflow,
    selectedSupplier,
    selectedSupplierId,
    shiftDrawerFundingTarget.available,
    shiftDrawerFundingTarget.cashboxId,
    totalReceiptAmount,
  ]);

  const paymentSummaryDebt = useMemo(() => {
    if (paymentType === "debt") return totalReceiptAmount;
    if (paymentType === "prepayment") {
      return Math.max(0, totalReceiptAmount - toNum(prepayment));
    }
    return 0;
  }, [paymentType, prepayment, totalReceiptAmount]);

  return {
    navigate,
    suppliersLoading,
    selectedSupplierId,
    setSelectedSupplierId,
    createSupplierOpen,
    setCreateSupplierOpen,
    createSupplierName,
    setCreateSupplierName,
    createSupplierPhone,
    setCreateSupplierPhone,
    createSupplierSaving,
    createProductOpen,
    setCreateProductOpen,
    products,
    productsLoading,
    modalProducts,
    modalProductsLoading,
    modalProductsPage,
    modalProductsCount,
    modalProductsHasNext,
    modalProductsHasPrev,
    productsModalOpen,
    setProductsModalOpen,
    productsModalSearch,
    setProductsModalSearch,
    qtyByProductId,
    priceByProductId,
    submitting,
    downloadingInvoice,
    paymentType,
    setPaymentType,
    prepayment,
    setPrepayment,
    debtMonths,
    setDebtMonths,
    firstPaymentDate,
    setFirstPaymentDate,
    paymentModalOpen,
    setPaymentModalOpen,
    paidFromShiftDrawer,
    setPaidFromShiftDrawer,
    shiftDrawerFundingTarget,
    successModalOpen,
    completedReceiptSnapshot,
    supplierOptions,
    selectedSupplier,
    loadSupplierProducts,
    loadModalProducts,
    handleCreateSupplier,
    tableProducts,
    receiptItems,
    totalReceiptQty,
    totalReceiptAmount,
    cashExpenseAmount,
    handleQtyChange,
    handlePriceChange,
    addProductToReceipt,
    handleClearQty,
    handleDownloadInvoice,
    handleOpenPaymentModal,
    handleCloseSuccessModal,
    handleConfirmReceipt,
    paymentSummaryDebt,
    alert,
  };
}

export type SupplierReceiptVm = ReturnType<typeof useSupplierReceipt>;
