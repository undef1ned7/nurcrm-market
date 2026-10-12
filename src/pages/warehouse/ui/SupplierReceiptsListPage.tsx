import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Plus, RefreshCw, Undo2, Wand2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { pdf } from "@react-pdf/renderer";
import api from "@shared/api";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import { SupplierReturnsList } from "@features/supplier-returns";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
  StatGrid,
  StatCard,
  SectionTabs,
} from "@shared/ui/page-shell";
import Pagination from "./components/Pagination";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import InvoicePdfDocument from "@pages/documents/ui/components/InvoicePdfDocument";
import {
  buildSupplierLabel,
  downloadBlob,
} from "./supplierReceipt/supplierReceiptUtils";
import "./Warehouse.scss";
import "./SupplierReceiptPage.scss";

const DEFAULT_LIMIT = 20;

const listFrom = (res: any) => res?.data?.results || res?.data || [];

const parseTabFromSearchParams = (searchParams: any) =>
  searchParams.get("tab") === "returns" ? "returns" : "history";

const parseFiltersFromSearchParams = (searchParams: any) => ({
  supplier_id: searchParams.get("supplier_id") || "",
  date_from: searchParams.get("date_from") || "",
  date_to: searchParams.get("date_to") || "",
  search: searchParams.get("search") || "",
});

const parsePageFromSearchParams = (searchParams: any) => {
  const page = parseInt(searchParams.get("page") || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const parseLimitFromSearchParams = (searchParams: any) => {
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
};

const buildProcurementSearchParams = ({
  tab = "history",
  page = 1,
  limit = DEFAULT_LIMIT,
  supplier_id = "",
  date_from = "",
  date_to = "",
  search = "",
}: any) => {
  const params = new URLSearchParams();
  if (tab && tab !== "history") params.set("tab", String(tab));
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (supplier_id) params.set("supplier_id", supplier_id);
  if (date_from) params.set("date_from", date_from);
  if (date_to) params.set("date_to", date_to);
  if (search) params.set("search", search);
  return params;
};

const parseReceiptsListResponse = (res: any) => {
  const data = res?.data;
  const rows = listFrom(res);
  const list = Array.isArray(rows) ? rows : [];
  const meta = data?.meta && typeof data.meta === "object" ? data.meta : {};
  const rawTotal =
    meta.total_amount ?? data?.total_amount ?? meta.procurements_total_amount ?? null;
  const totalAmount =
    rawTotal != null && rawTotal !== "" && Number.isFinite(Number(rawTotal))
      ? Number(rawTotal)
      : null;

  return {
    list,
    count: Number(data?.count) || list.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    totalAmount,
  };
};

const fmtDateTime = (value: any) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString("ru-RU");
  } catch {
    return String(value);
  }
};

const fmtNum = (value: any) =>
  Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const receiptItemLabel = (it: any) => {
  if (!it || typeof it !== "object") return "—";
  const p = it.product;
  if (p && typeof p === "object") {
    return (
      p.product_name ||
      p.name ||
      p.title ||
      p.article ||
      p.barcode ||
      "—"
    );
  }
  return (
    it.product_name ||
    it.name ||
    it.title ||
    it.product_title ||
    (it.product != null ? `Товар #${it.product}` : "—")
  );
};

const calcReceiptTotal = (items: any) =>
  (Array.isArray(items) ? items : []).reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.purchase_price || 0),
    0,
  );

const receiptRowTotal = (row: any) => {
  if (!row || typeof row !== "object") return 0;
  const preset = row.total_amount ?? row.amount ?? row.sum;
  if (preset != null && preset !== "" && Number.isFinite(Number(preset))) {
    return Number(preset);
  }
  return calcReceiptTotal(row.items);
};

const receiptSupplierObject = (receipt: any) =>
  receipt?.supplier && typeof receipt.supplier === "object"
    ? receipt.supplier
    : { full_name: receipt?.supplier_name || receipt?.supplierName || "" };

/** Данные для InvoicePdfDocument по уже сохранённому приходу из истории закупок. */
const buildReceiptInvoiceData = (receipt: any) => {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const total = receiptRowTotal(receipt);
  const createdAt = receipt?.created_at ? new Date(receipt.created_at) : new Date();
  const number = String(
    receipt?.number ?? receipt?.receipt_number ?? receipt?.id ?? receipt?.uuid ?? "",
  );
  const supplier = receiptSupplierObject(receipt);

  let companyName = "";
  try {
    companyName = localStorage.getItem("company_name") || "";
  } catch {
    /* keep empty */
  }

  return {
    doc_type: "purchase",
    number,
    document: {
      type: "purchase_invoice",
      doc_type: "purchase",
      title: "Накладная",
      number,
      date: createdAt.toISOString().split("T")[0],
      datetime: createdAt.toISOString(),
      created_at: createdAt.toISOString(),
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
    items: items.map((it: any) => {
      const qty = Number(it.qty || 0);
      const price = Number(it.purchase_price || 0);
      const product = it.product && typeof it.product === "object" ? it.product : null;
      return {
        id: product?.id ?? it.product ?? "",
        name: receiptItemLabel(it),
        article: product?.article || it.article || "",
        unit: product?.unit || it.unit || "шт",
        qty: String(qty),
        unit_price: String(price.toFixed(2)),
        total: String((qty * price).toFixed(2)),
        discount_percent: 0,
        price_before_discount: String(price.toFixed(2)),
      };
    }),
    totals: {
      subtotal: String(total.toFixed(2)),
      discount_total: "0.00",
      tax_total: "0.00",
      total: String(total.toFixed(2)),
    },
    warehouse: companyName || "Склад",
  };
};

export default function SupplierReceiptsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const alert = useAlert();

  const tab = useMemo(() => parseTabFromSearchParams(searchParams), [searchParams]);
  const page = useMemo(() => parsePageFromSearchParams(searchParams), [searchParams]);
  const limit = useMemo(() => parseLimitFromSearchParams(searchParams), [searchParams]);
  const appliedFilters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const goCreateReturn = (opts?: { supplierId?: string; receiptId?: string }) => {
    const params = new URLSearchParams();
    if (opts?.supplierId) params.set("supplier_id", opts.supplierId);
    if (opts?.receiptId) params.set("receipt_id", opts.receiptId);
    navigate(
      `/crm/market/procurement/return${params.toString() ? `?${params}` : ""}`,
    );
  };

  const [loading, setLoading] = useState<any>(false);
  const [suppliersLoading, setSuppliersLoading] = useState<any>(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState<any>(false);
  const [createSupplierName, setCreateSupplierName] = useState<any>("");
  const [createSupplierPhone, setCreateSupplierPhone] = useState<any>("");
  const [createSupplierSaving, setCreateSupplierSaving] = useState<any>(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [listCount, setListCount] = useState<any>(0);
  const [listNext, setListNext] = useState<any>(null);
  const [listPrevious, setListPrevious] = useState<any>(null);
  const [totalAmount, setTotalAmount] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [detailReceipt, setDetailReceipt] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<any>(false);

  const openReceiptDetail = async (row: any) => {
    if (!row) return;
    const rowId = row.id ?? row.uuid;
    setDetailLoading(false);
    setDetailReceipt(row);
    const existing = Array.isArray(row.items) ? row.items : [];
    if (existing.length > 0 || rowId == null || rowId === "") return;
    try {
      setDetailLoading(true);
      const { data } = await api.get(
        `/main/suppliers/receipts/${encodeURIComponent(String(rowId))}/`,
      );
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.lines)
          ? data.lines
          : [];
      setDetailReceipt((prev: any) =>
        prev && String(prev.id ?? prev.uuid) === String(rowId)
          ? { ...prev, ...data, items }
          : prev,
      );
    } catch {
      /* оставляем строку из списка; в модалке будет текст про отсутствие позиций */
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReceiptDetail = () => {
    setDetailReceipt(null);
    setDetailLoading(false);
  };

  const [downloadingInvoice, setDownloadingInvoice] = useState<any>(false);

  const handleDownloadReceiptInvoice = async () => {
    if (!detailReceipt) return;
    const items = Array.isArray(detailReceipt.items) ? detailReceipt.items : [];
    if (!items.length) {
      alert(t("crm.procurement.noItemsForInvoice"), true);
      return;
    }

    setDownloadingInvoice(true);
    try {
      const data = buildReceiptInvoiceData(detailReceipt);
      const blob = await pdf(<InvoicePdfDocument data={data} />).toBlob();
      const supplierPart = buildSupplierLabel(receiptSupplierObject(detailReceipt))
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9а-яё_()-]/gi, "")
        .slice(0, 40);
      const idPart = String(detailReceipt.id ?? detailReceipt.uuid ?? "").slice(0, 8);
      downloadBlob(
        blob,
        `receipt_invoice_${supplierPart || "supplier"}${idPart ? `_${idPart}` : ""}.pdf`,
      );
    } catch (error: any) {
      alert(validateResErrors(error, t("crm.procurement.invoiceGenerateError")), true);
    } finally {
      setDownloadingInvoice(false);
    }
  };
  const emptyFilters = useMemo(
    () => ({
      supplier_id: "",
      date_from: "",
      date_to: "",
      search: "",
    }),
    [],
  );
  const [filtersDraft, setFiltersDraft] = useState(() =>
    parseFiltersFromSearchParams(searchParams),
  );

  const replaceListSearchParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev: any) => {
          const current = {
            tab: parseTabFromSearchParams(prev),
            page: parsePageFromSearchParams(prev),
            limit: parseLimitFromSearchParams(prev),
            ...parseFiltersFromSearchParams(prev),
            ...patch,
          };
          const next = buildProcurementSearchParams(current);
          if (prev.toString() === next.toString()) return prev;
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setFiltersDraft(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const hasPendingChanges = useMemo(
    () => JSON.stringify(filtersDraft) !== JSON.stringify(appliedFilters),
    [filtersDraft, appliedFilters],
  );
  const hasAnyFilter = useMemo(
    () =>
      Boolean(
        appliedFilters.supplier_id ||
          appliedFilters.date_from ||
          appliedFilters.date_to ||
          appliedFilters.search,
      ),
    [appliedFilters],
  );
  const dateRangeInvalid = useMemo(() => {
    if (!filtersDraft.date_from || !filtersDraft.date_to) return false;
    return filtersDraft.date_from > filtersDraft.date_to;
  }, [filtersDraft.date_from, filtersDraft.date_to]);

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((s: any) => ({
        value: String(s.id || ""),
        label:
          String(
            s.full_name ||
              s.name ||
              s.company_name ||
              s.phone ||
              t("crm.procurement.noName"),
          ).trim() || t("crm.procurement.noName"),
      })),
    [suppliers, t],
  );

  const loadSuppliers = async () => {
    try {
      setSuppliersLoading(true);
      const res = await api.get("/main/clients/", {
        params: { type: "suppliers", page_size: 500 },
      });
      const rows = listFrom(res);
      setSuppliers(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      setSuppliers([]);
      const errorMessage = validateResErrors(
        error,
        t("crm.procurement.loadSuppliersError"),
      );
      alert(errorMessage, true);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
      };
      if (appliedFilters.supplier_id) (params as any).supplier_id = appliedFilters.supplier_id;
      if (appliedFilters.date_from) (params as any).date_from = appliedFilters.date_from;
      if (appliedFilters.date_to) (params as any).date_to = appliedFilters.date_to;
      if (appliedFilters.search) (params as any).search = appliedFilters.search;

      const res = await api.get("/main/suppliers/receipts/", { params });
      const { list, count, next, previous, totalAmount: metaTotal } =
        parseReceiptsListResponse(res);
      setReceipts(list);
      setListCount(count);
      setListNext(next);
      setListPrevious(previous);
      setTotalAmount(metaTotal);
    } catch (error: any) {
      setReceipts([]);
      setListCount(0);
      setListNext(null);
      setListPrevious(null);
      setTotalAmount(null);
      const errorMessage = validateResErrors(
        error,
        t("crm.procurement.loadListError"),
      );
      alert(errorMessage, true);
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilters.date_from,
    appliedFilters.date_to,
    appliedFilters.search,
    appliedFilters.supplier_id,
    alert,
    limit,
    page,
    t,
  ]);

  const handleCreateSupplier = async () => {
    const full_name = String(createSupplierName || "").trim();
    const phone = String(createSupplierPhone || "").trim();
    if (!full_name) {
      alert(t("crm.procurement.enterSupplierName"), true);
      return;
    }
    if (!phone) {
      alert(t("crm.procurement.enterSupplierPhone"), true);
      return;
    }
    try {
      setCreateSupplierSaving(true);
      const { data } = await api.post("/main/clients/", {
        type: "suppliers",
        full_name,
        phone,
      });
      await loadSuppliers();
      const createdId = String(data?.id || "").trim();
      if (createdId) {
        setFiltersDraft((prev: any) => ({ ...prev, supplier_id: createdId }));
      }
      setCreateSupplierOpen(false);
      setCreateSupplierName("");
      setCreateSupplierPhone("");
    } catch (error: any) {
      const errorMessage = validateResErrors(
        error,
        t("crm.procurement.createSupplierError"),
      );
      alert(errorMessage, true);
    } finally {
      setCreateSupplierSaving(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
     
  }, []);

  useEffect(() => {
    if (tab !== "history") {
      setDetailReceipt(null);
      setDetailLoading(false);
      return;
    }
    void loadReceipts();
  }, [loadReceipts, tab]);

  const totalPages = useMemo(
    () => (listCount && limit ? Math.max(1, Math.ceil(listCount / limit)) : 1),
    [listCount, limit],
  );

  const handlePageChange = (newPage: any) => {
    if (newPage < 1 || (totalPages && newPage > totalPages)) return;
    replaceListSearchParams({ page: newPage });
  };

  const handleApplyFilters = () => {
    if (dateRangeInvalid) {
      alert(t("crm.procurement.dateRangeError"), true);
      return;
    }
    replaceListSearchParams({
      page: 1,
      supplier_id: filtersDraft.supplier_id,
      date_from: filtersDraft.date_from,
      date_to: filtersDraft.date_to,
      search: filtersDraft.search,
    });
  };

  const handleResetFilters = () => {
    setFiltersDraft(emptyFilters);
    replaceListSearchParams({
      page: 1,
      supplier_id: "",
      date_from: "",
      date_to: "",
      search: "",
    });
  };

  return (
    <PageShell className="warehouse-page market-receipt-page">
      <PageHeader
        title={t("crm.procurement.pageTitle")}
        subtitle={t("crm.procurement.subtitle")}
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/market/procurement/recommendations")}
              title={t("crm.procurement.recommendedOrder")}
              aria-label={t("crm.procurement.recommendedOrder")}
            >
              <Wand2 size={16} />
              <span className="nur-btn__label">{t("crm.procurement.recommendedOrder")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => goCreateReturn()}
              title={t("crm.procurement.supplierReturn")}
              aria-label={t("crm.procurement.supplierReturn")}
            >
              <Undo2 size={16} />
              <span className="nur-btn__label">{t("crm.procurement.supplierReturn")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate("/crm/market/procurement/receipt")}
              title={t("crm.procurement.receiveGoods")}
              aria-label={t("crm.procurement.receiveGoods")}
            >
              <Plus size={16} />
              <span className="nur-btn__label">{t("crm.procurement.receiveGoods")}</span>
            </button>
          </>
        }
      />

      <SectionTabs
        value={tab}
        onChange={(nextTab: string) =>
          replaceListSearchParams({ tab: nextTab, page: 1 })
        }
        items={[
          { value: "history", label: t("crm.procurement.historyTab") },
          { value: "returns", label: t("crm.procurement.returnsTab") },
        ]}
      />

      {tab === "history" && !dateRangeInvalid && (
        <StatGrid>
          <StatCard label={t("crm.procurement.totalPurchases")} value={listCount} />
          <StatCard
            label={t("crm.procurement.totalAmount")}
            value={totalAmount != null ? fmtNum(totalAmount) : "—"}
          />
        </StatGrid>
      )}

      <DataContainer>
        <PagePanel className="market-receipt-page__card">
          {tab === "returns" ? <SupplierReturnsList /> : null}
          {tab === "history" ? (
            <>
          <FilterBar className="market-receipt-page__toolbar">
            <div className="market-receipt-page__field">
              <label className="nur-label">{t("crm.procurement.selectSupplier")}</label>
              <div className="market-receipt-page__supplier-row">
                <SearchableCombobox
                  value={filtersDraft.supplier_id}
                  onChange={(v: any) =>
                    setFiltersDraft((prev: any) => ({ ...prev, supplier_id: String(v || "") }))
                  }
                  options={[{ value: "", label: t("crm.procurement.allSuppliers") }, ...supplierOptions]}
                  placeholder={suppliersLoading ? t("common.loading") : t("crm.procurement.allSuppliers")}
                  classNamePrefix="searchableCombo"
                />
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm market-receipt-page__supplier-add"
                  onClick={() => setCreateSupplierOpen(true)}
                  title={t("crm.procurement.addSupplier")}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="market-receipt-page__field market-receipt-page__field--date">
              <label className="nur-label">{t("crm.procurement.dateFrom")}</label>
              <input
                className="nur-input"
                type="date"
                value={filtersDraft.date_from}
                onChange={(e: any) =>
                  setFiltersDraft((prev: any) => ({ ...prev, date_from: e.target.value }))
                }
              />
            </div>
            <div className="market-receipt-page__field market-receipt-page__field--date">
              <label className="nur-label">{t("crm.procurement.dateTo")}</label>
              <input
                className="nur-input"
                type="date"
                value={filtersDraft.date_to}
                onChange={(e: any) =>
                  setFiltersDraft((prev: any) => ({ ...prev, date_to: e.target.value }))
                }
              />
            </div>
            <div className="market-receipt-page__field">
              <label className="nur-label">{t("crm.procurement.search")}</label>
              <input
                className="nur-input"
                value={filtersDraft.search}
                onChange={(e: any) =>
                  setFiltersDraft((prev: any) => ({ ...prev, search: e.target.value }))
                }
                placeholder={t("crm.procurement.searchSupplierProduct")}
              />
            </div>
          </FilterBar>

          <div className="market-receipt-page__actions">
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={handleApplyFilters}
              disabled={loading || !hasPendingChanges || dateRangeInvalid}
            >
              {t("crm.procurement.apply")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={handleResetFilters}
              disabled={loading || (!hasAnyFilter && !hasPendingChanges)}
            >
              {t("crm.procurement.reset")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={loadReceipts}
              disabled={loading}
            >
              <RefreshCw size={16} />
              {t("crm.procurement.refresh")}
            </button>
          </div>
          {dateRangeInvalid && (
            <div className="market-receipt-page__empty">
              {t("crm.procurement.dateRangeInvalid")}
            </div>
          )}

          {loading ? (
            <div className="market-receipt-page__empty">{t("common.loading")}</div>
          ) : receipts.length === 0 ? (
            <EmptyState
              title={t("crm.procurement.purchasesNotFound")}
              text={t("crm.procurement.purchasesNotFoundHint")}
            />
          ) : (
            <div className="nur-table-wrap market-receipt-page__table-wrap">
              <table className="nur-table nur-table--clickable market-receipt-page__table">
                <thead>
                  <tr>
                    <th>{t("crm.procurement.colSupplier")}</th>
                    <th>{t("crm.procurement.colCreatedBy")}</th>
                    <th>{t("crm.procurement.colDate")}</th>
                    <th>{t("crm.procurement.colItems")}</th>
                    <th>{t("crm.procurement.colAmount")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((row: any, rowIdx: any) => {
                    const rowKey = row.id ?? row.uuid ?? `receipt-row-${rowIdx}`;
                    const items = Array.isArray(row.items) ? row.items : [];
                    const itemsCount = Number(row.items_count ?? row.itemsCount ?? items.length) || items.length;
                    const total = receiptRowTotal(row);
                    const receiptId = String(row.id ?? row.uuid ?? "");
                    const supplierId = String(row.supplier_id ?? row.supplierId ?? "");
                    return (
                      <tr
                        key={rowKey}
                        className="market-receipt-page__table-row--clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => void openReceiptDetail(row)}
                        onKeyDown={(e: any) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void openReceiptDetail(row);
                          }
                        }}
                      >
                        <td>{row.supplier_name || "—"}</td>
                        <td>{row.created_by_name || "—"}</td>
                        <td>{fmtDateTime(row.created_at)}</td>
                        <td>{itemsCount}</td>
                        <td>{fmtNum(total)}</td>
                        <td>
                          <button
                            type="button"
                            className="nur-btn nur-btn--ghost nur-btn--sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              goCreateReturn({
                                supplierId,
                                receiptId,
                              });
                            }}
                          >
                            {t("crm.procurement.returnBtn")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !dateRangeInvalid && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              count={listCount}
              countLabel={t("crm.procurement.purchasesCount")}
              loading={loading}
              hasNextPage={Boolean(listNext)}
              hasPrevPage={Boolean(listPrevious)}
              onPageChange={handlePageChange}
            />
          )}
            </>
          ) : null}
        </PagePanel>
      </DataContainer>
      {detailReceipt && (
        <ReactPortal wrapperId="receipts-list-detail-modal">
        <div
          className="market-receipt-page__modal-overlay"
          onClick={closeReceiptDetail}
          role="presentation"
        >
          <div
            className="market-receipt-page__modal-card market-receipt-page__modal-card--detail"
            onClick={(e: any) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-detail-title"
          >
            <div className="market-receipt-page__detail-head">
              <h3 id="receipt-detail-title" className="market-receipt-page__modal-title">
                {t("crm.procurement.detailTitle")}
              </h3>
              <button
                type="button"
                className="market-receipt-page__detail-close"
                onClick={closeReceiptDetail}
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="market-receipt-page__detail-meta">
              <span>
                <strong>{t("crm.procurement.detailSupplier")}</strong>{" "}
                {detailReceipt.supplier_name || "—"}
              </span>
              <span>
                <strong>{t("crm.procurement.detailCreatedBy")}</strong>{" "}
                {detailReceipt.created_by_name || "—"}
              </span>
              <span>
                <strong>{t("crm.procurement.detailDate")}</strong>{" "}
                {fmtDateTime(detailReceipt.created_at)}
              </span>
            </div>
            {detailLoading ? (
              <p className="market-receipt-page__detail-empty">
                {t("crm.procurement.detailLoadingItems")}
              </p>
            ) : (() => {
              const items = Array.isArray(detailReceipt.items) ? detailReceipt.items : [];
              if (items.length === 0) {
                return (
                  <p className="market-receipt-page__detail-empty">
                    {t("crm.procurement.detailNoItems")}
                  </p>
                );
              }
              return (
                <div className="nur-table-wrap market-receipt-page__detail-table-wrap">
                  <table className="nur-table market-receipt-page__detail-table">
                    <thead>
                      <tr>
                        <th>{t("crm.procurement.colNo")}</th>
                        <th>{t("crm.procurement.colName")}</th>
                        <th>{t("crm.procurement.colQty")}</th>
                        <th>{t("crm.procurement.colPurchasePrice")}</th>
                        <th>{t("crm.procurement.colAmount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it: any, idx: any) => {
                        const qty = Number(it.qty || 0);
                        const price = Number(it.purchase_price || 0);
                        const line = qty * price;
                        return (
                            <tr key={`${detailReceipt.id ?? detailReceipt.uuid}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{receiptItemLabel(it)}</td>
                            <td>{fmtNum(qty)}</td>
                            <td>{fmtNum(price)}</td>
                            <td>{fmtNum(line)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <div className="market-receipt-page__actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={handleDownloadReceiptInvoice}
                disabled={
                  downloadingInvoice ||
                  detailLoading ||
                  !Array.isArray(detailReceipt.items) ||
                  detailReceipt.items.length === 0
                }
              >
                <Download size={16} />
                {downloadingInvoice
                  ? t("crm.procurement.generatingInvoice")
                  : t("crm.procurement.downloadInvoice")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={() => {
                  const receiptId = String(detailReceipt.id ?? detailReceipt.uuid ?? "");
                  const supplierId = String(
                    detailReceipt.supplier_id ?? detailReceipt.supplierId ?? "",
                  );
                  closeReceiptDetail();
                  goCreateReturn({ supplierId, receiptId });
                }}
              >
                <Undo2 size={16} />
                {t("crm.procurement.returnToSupplier")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={closeReceiptDetail}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
        </ReactPortal>
      )}
      {createSupplierOpen && (
        <ReactPortal wrapperId="receipts-list-supplier-modal">
        <div className="market-receipt-page__modal-overlay" onClick={() => setCreateSupplierOpen(false)}>
          <div className="market-receipt-page__modal-card" onClick={(e: any) => e.stopPropagation()}>
            <h3 className="market-receipt-page__modal-title">
              {t("crm.procurement.newSupplier")}
            </h3>
            <div className="market-receipt-page__field">
              <label className="nur-label">{t("crm.procurement.nameRequired")}</label>
              <input
                className="nur-input"
                value={createSupplierName}
                onChange={(e: any) => setCreateSupplierName(e.target.value)}
                placeholder={t("crm.procurement.supplierNamePlaceholder")}
              />
            </div>
            <div className="market-receipt-page__field">
              <label className="nur-label">{t("crm.procurement.phoneRequired")}</label>
              <input
                className="nur-input"
                value={createSupplierPhone}
                onChange={(e: any) => setCreateSupplierPhone(e.target.value)}
                placeholder="+996..."
              />
            </div>
            <div className="market-receipt-page__actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={() => setCreateSupplierOpen(false)}
                disabled={createSupplierSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={handleCreateSupplier}
                disabled={createSupplierSaving}
              >
                {createSupplierSaving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
        </ReactPortal>
      )}
    </PageShell>
  );
}
