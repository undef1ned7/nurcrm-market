import { useDispatch } from "react-redux";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  LayoutGrid,
  Table2,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  deleteItemsMake,
  deleteProductAsync,
} from "@entities/product";
import {
  updateCashFlows,
  bulkUpdateCashFlowsStatus,
} from "@entities/cash";
import api from "@shared/api";
import "./Pending.scss";
import { useLocation, useParams } from "react-router-dom";
import { HeaderTabs } from "@shared/ui/legacy-hostel/kassa/kassa";
import { deleteSale } from "@entities/sale";
import { onPayDebtDeal } from "@entities/client";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import Loading from "@shared/ui/Loading/Loading";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
  StatusChip,
} from "@shared/ui/page-shell";

const STORAGE_KEY = "pending_view_mode";
const CASHFLOWS_PAGE_SIZE = 100;

const getInitialViewMode = () => {
  if (typeof window === "undefined") return "table";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "table" || saved === "cards") return saved;
  const isSmall = window.matchMedia("(max-width: 1199px)").matches;
  return isSmall ? "cards" : "table";
};

const Pending = () => {
  const location = useLocation();
  const { id: cashboxId } = useParams(); // UUID кассы из URL
  const dispatch = useDispatch();
  const alert = useAlert();
  const confirm = useConfirm();

  // --- selection state ---
  const [selected, setSelected] = useState(() => new Set());
  const [processing, setProcessing] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const debounceTimerRef = useRef(null);

  // --- список с сервера, пагинация page/page_size ---
  const [cashFlows, setCashFlows] = useState([]);
  const [cashFlowsLoading, setCashFlowsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState(null);

  const loadCashFlows = useCallback(
    async (pageArg) => {
      const pageNum = Math.max(1, pageArg);
      setCashFlowsLoading(true);
      try {
        const params = {
          status: "pending", // заявки, ждущие подтверждения — фильтрует сервер
          page: pageNum,
          page_size: CASHFLOWS_PAGE_SIZE,
        };
        if (cashboxId) params.cashbox = cashboxId;
        const search = (debouncedSearchTerm || "").trim();
        if (search) params.search = search;
        const { data } = await api.get("/construction/cashflows/", { params });
        const flows = Array.isArray(data) ? data : data?.results || [];
        const count = typeof data?.count === "number" ? data.count : null;
        const visibleFlows = flows.filter(
          (p) => p.status === "pending" || p.status === "false",
        );
        if (visibleFlows.length === 0 && pageNum > 1) {
          setPage(pageNum - 1);
          return;
        }
        setCashFlows(flows);
        setTotalCount(count);
        setHasNext(
          Boolean(data?.next) ||
            (count != null && pageNum * CASHFLOWS_PAGE_SIZE < count) ||
            (count == null && flows.length === CASHFLOWS_PAGE_SIZE),
        );
      } catch (e) {
        console.error(e);
        setCashFlows([]);
        setTotalCount(null);
        setHasNext(false);
        alert("Не удалось загрузить запросы", true);
      } finally {
        setCashFlowsLoading(false);
      }
    },
    [cashboxId, debouncedSearchTerm, alert],
  );

  // Загрузка страницы; при смене кассы или поиска возвращаемся на первую.
  // setTimeout(0) — чтобы не звать setState синхронно в эффекте
  // (react-hooks/set-state-in-effect) и не делать лишний запрос со старой страницей.
  const filtersSigRef = useRef("");
  useEffect(() => {
    const sig = `${cashboxId || ""}|${(debouncedSearchTerm || "").trim()}`;
    const timer = setTimeout(() => {
      if (filtersSigRef.current !== sig) {
        filtersSigRef.current = sig;
        if (page !== 1) {
          setPage(1); // эффект перезапустится уже с page=1
          return;
        }
      }
      void loadCashFlows(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [cashboxId, debouncedSearchTerm, page, loadCashFlows]);

  // Сервер уже отдаёт только pending (?status=pending); фильтр оставлен
  // как страховка от старого формата status: "false"
  const filteredPending = useMemo(
    () =>
      (cashFlows || []).filter(
        (p) => p.status === "pending" || p.status === "false",
      ),
    [cashFlows],
  );

  // Вспомогательная функция для маппинга типа
  const mapType = (t) =>
    t === "income" ? "Приход" : t === "expense" ? "Расход" : "—";

  const rowNumber = (idx) => (page - 1) * CASHFLOWS_PAGE_SIZE + idx + 1;

  // чистим выбранные, если список изменился
  useEffect(() => {
    const ids = new Set(filteredPending.map((p) => p.id));
    setSelected((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredPending]);

  // перезагрузка текущей страницы списка
  const refresh = () => loadCashFlows(page);

  const applyRejectSideEffects = (item) => {
    if (item.source_business_operation_id === "Склад") {
      dispatch(deleteProductAsync(item?.source_cashbox_flow_id));
    }

    if (item.source_business_operation_id === "Продажа") {
      dispatch(deleteSale(item?.source_cashbox_flow_id));
    }

    if (item.source_business_operation_id === "Оплата долга") {
      dispatch(onPayDebtDeal({ id: item?.source_cashbox_flow_id }));
    }

    if (item.source_business_operation_id === "Сырье") {
      dispatch(deleteItemsMake(item.source_cashbox_flow_id));
    }

    if (item.source_business_operation_id === "Продажа производство") {
      dispatch(deleteSale(item?.source_cashbox_flow_id));
    }
  };

  const performAccept = async (item) => {
    setActingId(item.id);
    try {
      await dispatch(
        updateCashFlows({
          productId: item.id,
          updatedData: { status: "approved" },
        }),
      ).unwrap();
      await refresh();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      alert("Запрос одобрен");
    } catch (_e) {
      alert("Не удалось одобрить запрос", true);
    } finally {
      setActingId(null);
    }
  };

  const performReject = async (item) => {
    setActingId(item.id);
    try {
      await dispatch(
        updateCashFlows({
          productId: item.id,
          updatedData: { status: "rejected" },
        }),
      ).unwrap();

      applyRejectSideEffects(item);

      await refresh();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      alert("Запрос отклонён");
    } catch (_e) {
      alert("Не удалось отклонить запрос", true);
    } finally {
      setActingId(null);
    }
  };

  const handleAccept = (item) => {
    confirm(`Одобрить запрос «${item.name || "без названия"}»?`, (ok) => {
      if (!ok) return;
      void performAccept(item);
    });
  };

  const handleReject = (item) => {
    confirm(`Отклонить запрос «${item.name || "без названия"}»?`, (ok) => {
      if (!ok) return;
      void performReject(item);
    });
  };

  const isActionLocked = Boolean(actingId) || processing;

  // --- массовые действия ---
  const bulkUpdate = async (ids, statusValue) => {
    if (!ids.length) return;
    setProcessing(true);
    try {
      const items = ids.map((id) => ({
        id,
        status: statusValue,
      }));
      await dispatch(bulkUpdateCashFlowsStatus(items)).unwrap();
      await refresh();
      setSelected(new Set());
      alert("Выбранные запросы одобрены");
    } catch (_e) {
      alert(
        "Не все операции прошли успешно. Проверьте список и повторите.",
        true,
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAccept = () => {
    if (!selected.size) return;
    const count = selected.size;
    confirm(
      `Одобрить ${count} ${count === 1 ? "запрос" : count < 5 ? "запроса" : "запросов"}?`,
      (ok) => {
        if (!ok) return;
        void bulkUpdate(Array.from(selected), "approved");
      },
    );
  };

  const performBulkReject = async () => {
    if (!selected.size) return;
    setProcessing(true);
    try {
      const selectedIds = Array.from(selected);
      const selectedItems = filteredPending.filter((item) =>
        selectedIds.includes(item.id),
      );

      const items = selectedIds.map((id) => ({
        id,
        status: "rejected",
      }));
      await dispatch(bulkUpdateCashFlowsStatus(items)).unwrap();

      for (const item of selectedItems) {
        applyRejectSideEffects(item);
      }

      await refresh();
      setSelected(new Set());
      alert("Выбранные запросы отклонены");
    } catch (_e) {
      alert(
        "Не все операции прошли успешно. Проверьте список и повторите.",
        true,
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = () => {
    if (!selected.size) return;
    const count = selected.size;
    confirm(
      `Отклонить ${count} ${count === 1 ? "запрос" : count < 5 ? "запроса" : "запросов"}?`,
      (ok) => {
        if (!ok) return;
        void performBulkReject();
      },
    );
  };

  // --- чекбоксы ---
  const allIds = useMemo(
    () => filteredPending.map((p) => p.id),
    [filteredPending],
  );
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected =
    allIds.length > 0 && !allSelected && allIds.some((id) => selected.has(id));

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((_prev) => {
      if (allSelected) return new Set(); // снять все
      return new Set(allIds); // выбрать все видимые
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  // Debounce для поиска
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  return (
    <PageShell className="pending-page">
      {location.pathname === "/crm/hostel/kassa/requests" && <HeaderTabs />}

      <PageHeader
        title="Запросы"
        subtitle="Управление запросами на утверждение"
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => loadCashFlows(page)}
            disabled={isActionLocked}
            title="Обновить"
            aria-label="Обновить"
          >
            <RefreshCw
              size={16}
              className={cashFlowsLoading ? "pending-action-spinner" : ""}
            />
            <span className="nur-btn__label">Обновить</span>
          </button>
        }
      />

      <FilterBar className="pending-page__toolbar">
        <div className="pending-search">
          <Search className="pending-search__icon" size={18} />
          <input
            type="text"
            className="nur-input pending-search__input"
            placeholder="Поиск по названию, кассе, сумме..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <StatusChip>
          Всего: {totalCount ?? filteredPending.length} · На странице:{" "}
          {filteredPending.length}
          {selected.size > 0 ? ` · Выбрано: ${selected.size}` : ""}
        </StatusChip>

        <div className="pending-page__view-toggle">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`nur-btn nur-btn--sm ${
              viewMode === "table" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
          >
            <Table2 size={16} />
            Таблица
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`nur-btn nur-btn--sm ${
              viewMode === "cards" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
          >
            <LayoutGrid size={16} />
            Карточки
          </button>
        </div>
      </FilterBar>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="pending-bulk-actions">
          <div className="pending-bulk-actions__content">
            <div className="pending-bulk-actions__info">
              <div className="pending-bulk-actions__badge">
                <span className="pending-bulk-actions__count">
                  {selected.size}
                </span>
                <span className="pending-bulk-actions__text">
                  {selected.size === 1
                    ? "запрос выбран"
                    : selected.size < 5
                      ? "запроса выбрано"
                      : "запросов выбрано"}
                </span>
              </div>
            </div>
            <div className="pending-bulk-actions__buttons">
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() => setSelected(new Set())}
                disabled={isActionLocked}
                title="Снять выбор"
              >
                <X size={16} />
                Сбросить
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--danger nur-btn--sm"
                onClick={handleBulkReject}
                disabled={isActionLocked}
                title="Отказать выбранным"
              >
                {processing ? (
                  <Loader2 size={16} className="pending-action-spinner" />
                ) : (
                  <XCircle size={16} />
                )}
                {processing ? "Обработка..." : "Отказать выбранным"}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--primary nur-btn--sm"
                onClick={handleBulkAccept}
                disabled={isActionLocked}
                title="Одобрить выбранные"
              >
                {processing ? (
                  <Loader2 size={16} className="pending-action-spinner" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {processing ? "Обработка..." : "Одобрить выбранные"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PagePanel flush className="pending-page__content">
        {viewMode === "table" && (
          <div className="nur-table-wrap">
            <table className="nur-table pending-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>№</th>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Касса</th>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowsLoading ? (
                  <tr>
                    <td colSpan={8} className="pending-table__loading">
                      <Loading message="Загрузка запросов..." />
                    </td>
                  </tr>
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title={
                          searchTerm
                            ? "Запросы не найдены"
                            : "Нет запросов в ожидании"
                        }
                        text={
                          searchTerm
                            ? "Измените поисковый запрос."
                            : "Новые запросы появятся здесь."
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((item, idx) => {
                    const rowBusy = actingId === item.id;
                    const rowDisabled = isActionLocked && actingId !== item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`pending-table__row${rowBusy ? " pending-table__row--busy" : ""}`}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleRow(item.id)}
                            disabled={isActionLocked}
                          />
                        </td>
                        <td>{rowNumber(idx)}</td>
                        <td className="pending-table__name">{item.name}</td>
                        <td>{mapType(item.type)}</td>
                        <td>{item.cashbox_name || "—"}</td>
                        <td>
                          {new Date(item.created_at).toLocaleDateString(
                            "ru-RU",
                          )}
                        </td>
                        <td>{item.amount ? `${item.amount} сом` : "—"}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="pending-table__actions">
                            <button
                              type="button"
                              className="nur-btn nur-btn--primary nur-btn--sm"
                              title="Одобрить"
                              onClick={() => handleAccept(item)}
                              disabled={rowDisabled || rowBusy}
                            >
                              {rowBusy ? (
                                <Loader2
                                  size={16}
                                  className="pending-action-spinner"
                                />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              {rowBusy ? "Обработка..." : "Одобрить"}
                            </button>
                            <button
                              type="button"
                              className="nur-btn nur-btn--danger nur-btn--sm"
                              title="Отказать"
                              onClick={() => handleReject(item)}
                              disabled={rowDisabled || rowBusy}
                            >
                              {rowBusy ? (
                                <Loader2
                                  size={16}
                                  className="pending-action-spinner"
                                />
                              ) : (
                                <XCircle size={16} />
                              )}
                              {rowBusy ? "Обработка..." : "Отказать"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "cards" && (
          <div className="pending-cards-wrap">
            <div className="pending-cards-toolbar">
              <label
                className="pending-cards-toolbar__select-all"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                />
                Выбрать все на странице
              </label>
              <StatusChip>Выбрано: {selected.size}</StatusChip>
            </div>

            {cashFlowsLoading ? (
              <div className="pending-table__loading">
                <Loading message="Загрузка запросов..." />
              </div>
            ) : filteredPending.length === 0 ? (
              <EmptyState
                title={
                  searchTerm ? "Запросы не найдены" : "Нет запросов в ожидании"
                }
              />
            ) : (
              <div className="pending-cards">
                {filteredPending.map((item, idx) => {
                  const rowBusy = actingId === item.id;
                  const rowDisabled = isActionLocked && actingId !== item.id;
                  return (
                    <div
                      key={item.id}
                      className={`pending-card${rowBusy ? " pending-card--busy" : ""}`}
                    >
                      <div className="pending-card__top">
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleRow(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isActionLocked}
                        />
                        <div className="pending-card__body">
                          <div className="pending-card__num">#{rowNumber(idx)}</div>
                          <div className="pending-card__name">{item.name}</div>
                          <div className="pending-card__meta">
                            <span>Тип: {mapType(item.type)}</span>
                            <span>Касса: {item.cashbox_name || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pending-card__stats">
                        <div className="pending-card__stat">
                          <span>Дата</span>
                          <strong>
                            {new Date(item.created_at).toLocaleDateString("ru-RU")}
                          </strong>
                        </div>
                        <div className="pending-card__stat">
                          <span>Сумма</span>
                          <strong>
                            {item.amount ? `${item.amount} сом` : "—"}
                          </strong>
                        </div>
                      </div>

                      <div className="pending-card__actions">
                        <button
                          type="button"
                          className="nur-btn nur-btn--primary nur-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(item);
                          }}
                          disabled={rowDisabled || rowBusy}
                        >
                          {rowBusy ? (
                            <Loader2 size={14} className="pending-action-spinner" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {rowBusy ? "Обработка..." : "Одобрить"}
                        </button>
                        <button
                          type="button"
                          className="nur-btn nur-btn--danger nur-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(item);
                          }}
                          disabled={rowDisabled || rowBusy}
                        >
                          {rowBusy ? (
                            <Loader2 size={14} className="pending-action-spinner" />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {rowBusy ? "Обработка..." : "Отказать"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PagePanel>

      {(page > 1 || hasNext) && (
        <div
          className="pending-pagination"
          role="navigation"
          aria-label="Страницы запросов"
        >
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            disabled={page <= 1 || cashFlowsLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span className="pending-pagination__meta">
            Страница {page}
            {totalCount != null ? ` · ${totalCount} запросов` : ""}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            disabled={!hasNext || cashFlowsLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </button>
        </div>
      )}
    </PageShell>
  );
};

export default Pending;
