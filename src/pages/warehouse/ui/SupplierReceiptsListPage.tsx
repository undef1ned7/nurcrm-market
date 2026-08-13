import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Undo2, Wand2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

export default function SupplierReceiptsListPage() {
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
          String(s.full_name || s.name || s.company_name || s.phone || "Без названия").trim() ||
          "Без названия",
      })),
    [suppliers],
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
      const errorMessage = validateResErrors(error, "Ошибка загрузки поставщиков");
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
      const errorMessage = validateResErrors(error, "Ошибка загрузки списка закупок");
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
  ]);

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
      await loadSuppliers();
      const createdId = String(data?.id || "").trim();
      if (createdId) {
        setFiltersDraft((prev: any) => ({ ...prev, supplier_id: createdId }));
      }
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
      alert("Дата 'до' не может быть раньше даты 'от'.", true);
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
        title="Закупки"
        subtitle="История приходов и возвраты поставщикам"
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/market/procurement/recommendations")}
              title="Рекомендуемый заказ"
              aria-label="Рекомендуемый заказ"
            >
              <Wand2 size={16} />
              <span className="nur-btn__label">Рекомендуемый заказ</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => goCreateReturn()}
              title="Возврат поставщику"
              aria-label="Возврат поставщику"
            >
              <Undo2 size={16} />
              <span className="nur-btn__label">Возврат поставщику</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate("/crm/market/procurement/receipt")}
              title="Прием товара"
              aria-label="Прием товара"
            >
              <Plus size={16} />
              <span className="nur-btn__label">Прием товара</span>
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
          { value: "history", label: "История закупок" },
          { value: "returns", label: "Возвраты поставщикам" },
        ]}
      />

      {tab === "history" && !dateRangeInvalid && (
        <StatGrid>
          <StatCard label="Всего закупок" value={listCount} />
          <StatCard
            label="Общая сумма"
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
              <label className="nur-label">Поставщик</label>
              <div className="market-receipt-page__supplier-row">
                <SearchableCombobox
                  value={filtersDraft.supplier_id}
                  onChange={(v: any) =>
                    setFiltersDraft((prev: any) => ({ ...prev, supplier_id: String(v || "") }))
                  }
                  options={[{ value: "", label: "Все поставщики" }, ...supplierOptions]}
                  placeholder={suppliersLoading ? "Загрузка..." : "Все поставщики"}
                  classNamePrefix="searchableCombo"
                />
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm market-receipt-page__supplier-add"
                  onClick={() => setCreateSupplierOpen(true)}
                  title="Добавить поставщика"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="market-receipt-page__field market-receipt-page__field--date">
              <label className="nur-label">Дата от</label>
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
              <label className="nur-label">Дата до</label>
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
              <label className="nur-label">Поиск</label>
              <input
                className="nur-input"
                value={filtersDraft.search}
                onChange={(e: any) =>
                  setFiltersDraft((prev: any) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Поставщик или товар"
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
              Применить
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={handleResetFilters}
              disabled={loading || (!hasAnyFilter && !hasPendingChanges)}
            >
              Сбросить
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={loadReceipts}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Обновить
            </button>
          </div>
          {dateRangeInvalid && (
            <div className="market-receipt-page__empty">
              Проверьте диапазон дат: дата окончания раньше даты начала.
            </div>
          )}

          {loading ? (
            <div className="market-receipt-page__empty">Загрузка...</div>
          ) : receipts.length === 0 ? (
            <EmptyState
              title="Закупки не найдены"
              text="Измените фильтры или создайте новое оприходование."
            />
          ) : (
            <div className="nur-table-wrap market-receipt-page__table-wrap">
              <table className="nur-table nur-table--clickable market-receipt-page__table">
                <thead>
                  <tr>
                    <th>Поставщик</th>
                    <th>Создал</th>
                    <th>Дата</th>
                    <th>Позиций</th>
                    <th>Сумма</th>
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
                            Вернуть
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
              countLabel="закупок"
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
                Позиции прихода
              </h3>
              <button
                type="button"
                className="market-receipt-page__detail-close"
                onClick={closeReceiptDetail}
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>
            <div className="market-receipt-page__detail-meta">
              <span>
                <strong>Поставщик:</strong> {detailReceipt.supplier_name || "—"}
              </span>
              <span>
                <strong>Создал:</strong> {detailReceipt.created_by_name || "—"}
              </span>
              <span>
                <strong>Дата:</strong> {fmtDateTime(detailReceipt.created_at)}
              </span>
            </div>
            {detailLoading ? (
              <p className="market-receipt-page__detail-empty">Загрузка позиций…</p>
            ) : (() => {
              const items = Array.isArray(detailReceipt.items) ? detailReceipt.items : [];
              if (items.length === 0) {
                return (
                  <p className="market-receipt-page__detail-empty">Нет позиций для отображения.</p>
                );
              }
              return (
                <div className="nur-table-wrap market-receipt-page__detail-table-wrap">
                  <table className="nur-table market-receipt-page__detail-table">
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>Наименование</th>
                        <th>Кол-во</th>
                        <th>Цена закупки</th>
                        <th>Сумма</th>
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
                Вернуть поставщику
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={closeReceiptDetail}
              >
                Закрыть
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
            <h3 className="market-receipt-page__modal-title">Новый поставщик</h3>
            <div className="market-receipt-page__field">
              <label className="nur-label">Имя *</label>
              <input
                className="nur-input"
                value={createSupplierName}
                onChange={(e: any) => setCreateSupplierName(e.target.value)}
                placeholder="Название/ФИО"
              />
            </div>
            <div className="market-receipt-page__field">
              <label className="nur-label">Телефон *</label>
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
                Отмена
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={handleCreateSupplier}
                disabled={createSupplierSaving}
              >
                {createSupplierSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
        </ReactPortal>
      )}
    </PageShell>
  );
}
