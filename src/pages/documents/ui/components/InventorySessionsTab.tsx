import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Eye,
  PackageCheck,
  RefreshCw,
  XCircle,
} from "lucide-react";
import api from "@shared/api";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import InventoryModal from "@pages/warehouse/ui/components/InventoryModal";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { fetchProductsAsync } from "@entities/product";
import {
  PagePanel,
  StatusChip,
  EmptyState,
  LoadingState,
} from "@shared/ui/page-shell";
import "@pages/warehouse/ui/Warehouse.scss";
import "./InventorySessionsTab.scss";

const PAGE_SIZE = 20;

const listFrom = (res: any) => res?.data?.results || res?.data || [];

const statusLabel = (status: any) => {
  const s = String(status || "").toLowerCase();
  if (s === "draft") return "Черновик";
  if (s === "applied") return "Проведён";
  if (s === "canceled" || s === "cancelled") return "Отменён";
  return status || "—";
};

const statusTone = (status: any) => {
  const s = String(status || "").toLowerCase();
  if (s === "draft") return "warning";
  if (s === "applied") return "success";
  if (s === "canceled" || s === "cancelled") return "danger";
  return "default";
};

const formatDt = (value: any) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

const InventorySessionsTab = () => {
  const alert = useAlert();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<any>(true);
  const [error, setError] = useState<any>("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState<any>(0);

  const [detailId, setDetailId] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<any>(false);
  const [detailError, setDetailError] = useState<any>("");
  const [applyBusy, setApplyBusy] = useState<any>(false);
  const [cancelBusy, setCancelBusy] = useState<any>(false);
  const [allowNegative, setAllowNegative] = useState<any>(false);

  const [createProducts, setCreateProducts] = useState<any>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/main/inventory/sessions/", {
        params: { page, page_size: PAGE_SIZE },
      });
      const list = listFrom({ data });
      setSessions(Array.isArray(list) ? list : []);
      setCount(Number(data?.count) || list.length || 0);
    } catch (e: any) {
      setSessions([]);
      setError(
        validateResErrors(e, "Не удалось загрузить акты инвентаризации."),
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const products = location.state?.inventoryProducts;
    if (Array.isArray(products) && products.length > 0) {
      setCreateProducts(products);
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const openDetail = async (id: any) => {
    setDetailId(id);
    setDetail(null);
    setDetailError("");
    setAllowNegative(false);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/main/inventory/sessions/${id}/`);
      setDetail(data);
    } catch (e: any) {
      setDetailError(
        validateResErrors(e, "Не удалось загрузить акт."),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError("");
  };

  const handleApply = async () => {
    if (!detailId || !detail) return;
    const ok = await new Promise((resolve) => {
      confirm(
        "Провести инвентаризацию? Остатки товаров будут выровнены по фактическим количествам в акте.",
        (result: any) => resolve(Boolean(result)),
      );
    });
    if (!ok) return;
    setApplyBusy(true);
    try {
      await api.post(`/main/inventory/sessions/${detailId}/apply/`, {
        allow_negative: allowNegative,
      });
      alert("Инвентаризация проведена и остатки товаров обновлены.");
      closeDetail();
      await loadSessions();
      void dispatch((fetchProductsAsync({ page: 1, page_size: 50 }) as any));
    } catch (e: any) {
      alert(
        validateResErrors(e, "Не удалось провести инвентаризацию."),
        true,
      );
    } finally {
      setApplyBusy(false);
    }
  };

  const handleCancelDraft = async () => {
    if (!detailId) return;
    const ok = await new Promise((resolve) => {
      confirm("Отменить черновик акта? Остатки товаров не изменятся.", (r) =>
        resolve(Boolean(r)),
      );
    });
    if (!ok) return;
    setCancelBusy(true);
    try {
      await api.post(`/main/inventory/sessions/${detailId}/cancel/`);
      alert("Черновик инвентаризации отменён.");
      closeDetail();
      await loadSessions();
    } catch (e: any) {
      alert(validateResErrors(e, "Не удалось отменить акт."), true);
    } finally {
      setCancelBusy(false);
    }
  };

  const onCreateModalSaved = async ({ applied }: any) => {
    setCreateProducts(null);
    await loadSessions();
    if (applied) {
      alert("Инвентаризация проведена и остатки товаров обновлены.");
    } else {
      alert("Черновик инвентаризации сохранён.");
    }
    void dispatch((fetchProductsAsync({ page: 1, page_size: 50 }) as any));
  };

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const hasNextPage = page * PAGE_SIZE < count;
  const hasPrevPage = page > 1;

  const itemsCount = (session: any) => {
    if (Array.isArray(session?.lines)) return session.lines.length;
    if (Array.isArray(session?.items)) return session.items.length;
    if (typeof session?.items_count === "number") return session.items_count;
    return "—";
  };

  const renderSessionActions = (row: any) => (
    <div className="documents__actions">
      <button
        type="button"
        className="nur-btn nur-btn--ghost nur-btn--sm documents__action-btn"
        title="Подробнее"
        aria-label="Подробнее"
        onClick={() => void openDetail(row.id)}
      >
        <Eye size={18} />
      </button>
    </div>
  );

  const renderSessionCard = (row: any) => (
    <article key={row.id} className="nur-card-list__item inventory-sessions__card">
      <div className="inventory-sessions__card-head">
        <strong className="inventory-sessions__card-title">
          {formatDt(row.created_at)}
        </strong>
        <StatusChip tone={statusTone(row.status)}>
          {statusLabel(row.status)}
        </StatusChip>
      </div>
      <div className="nur-card-list__row">
        <span className="nur-card-list__label">Примечание</span>
        <span className="nur-card-list__value inventory-sessions__card-note">
          {row.note?.trim() ? row.note : "—"}
        </span>
      </div>
      <div className="nur-card-list__row">
        <span className="nur-card-list__label">Позиций</span>
        <span className="nur-card-list__value">{itemsCount(row)}</span>
      </div>
      <div className="nur-card-list__row">
        <span className="nur-card-list__label">Проведён</span>
        <span className="nur-card-list__value">{formatDt(row.applied_at)}</span>
      </div>
      <div className="inventory-sessions__card-actions">
        {renderSessionActions(row)}
      </div>
    </article>
  );

  const renderSessionsBody = () => {
    if (loading) {
      return <LoadingState rows={4} />;
    }

    if (sessions.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="Актов инвентаризации пока нет"
          text="Создайте акт через склад: отметьте товары и нажмите «Инвентаризация»."
        />
      );
    }

    return sessions.map((row: any) => renderSessionCard(row));
  };

  return (
    <div className="inventory-sessions">
      <div className="inventory-sessions__toolbar">
        <p className="inventory-sessions__hint">
          Новый акт: нажмите «Создать инвентаризацию» вверху страницы, на складе
          отметьте товары и снова «Инвентаризация» — форма откроется здесь.
          Черновики ниже можно провести или отменить.
        </p>
        <div className="inventory-sessions__toolbar-actions">
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => void loadSessions()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Обновить
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="inventory-sessions__banner inventory-sessions__banner--error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <PagePanel flush className="inventory-sessions__panel">
        <div className="nur-table-wrap nur-table-wrap--responsive inventory-sessions__table-wrap">
          <table className="nur-table nur-table--dense">
            <thead>
              <tr>
                <th>Создан</th>
                <th>Примечание</th>
                <th>Статус</th>
                <th>Позиций</th>
                <th>Проведён</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <LoadingState rows={4} />
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<ClipboardList size={22} />}
                      title="Актов инвентаризации пока нет"
                      text="Создайте акт через склад: отметьте товары и нажмите «Инвентаризация»."
                    />
                  </td>
                </tr>
              ) : (
                sessions.map((row: any) => (
                  <tr key={row.id}>
                    <td>{formatDt(row.created_at)}</td>
                    <td>
                      <span
                        className="inventory-sessions__note"
                        title={row.note?.trim() || undefined}
                      >
                        {row.note?.trim() ? row.note : "—"}
                      </span>
                    </td>
                    <td>
                      <StatusChip tone={statusTone(row.status)}>
                        {statusLabel(row.status)}
                      </StatusChip>
                    </td>
                    <td>{itemsCount(row)}</td>
                    <td>{formatDt(row.applied_at)}</td>
                    <td>{renderSessionActions(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="nur-card-list nur-card-list--responsive inventory-sessions__card-list">
          {renderSessionsBody()}
        </div>

        {totalPages > 1 ? (
          <div className="documents__pagination inventory-sessions__pagination">
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => setPage((p: any) => Math.max(1, p - 1))}
              disabled={loading || !hasPrevPage}
            >
              Назад
            </button>
            <span className="documents__pagination-info">
              Страница {page} из {totalPages}
              {count ? ` (${count} актов)` : ""}
            </span>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => setPage((p: any) => p + 1)}
              disabled={loading || !hasNextPage}
            >
              Вперёд
            </button>
          </div>
        ) : null}
      </PagePanel>

      {detailId ? (
        <ReactPortal wrapperId="market-inventory-session-detail">
          <div
            className="warehouse-inventory-overlay"
            onClick={() =>
              !applyBusy && !cancelBusy && !detailLoading && closeDetail()
            }
          >
            <div
              className="warehouse-inventory-modal inventory-sessions__detail-modal"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="warehouse-inventory-modal__header">
                <div className="warehouse-inventory-modal__title-wrap">
                  <div className="warehouse-inventory-modal__icon">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="warehouse-inventory-modal__title">
                      Акт инвентаризации
                    </h3>
                    <p className="warehouse-inventory-modal__subtitle">
                      {detail
                        ? `${statusLabel(detail.status)} · ${formatDt(detail.created_at)}`
                        : "Загрузка…"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="warehouse-inventory-modal__close"
                  onClick={closeDetail}
                  disabled={applyBusy || cancelBusy}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>

              <div className="warehouse-inventory-modal__body">
                {detailLoading ? (
                  <p>Загрузка…</p>
                ) : detailError ? (
                  <p
                    className="inventory-sessions__banner inventory-sessions__banner--error"
                    role="alert"
                  >
                    {detailError}
                  </p>
                ) : detail ? (
                  <>
                    {detail.note ? (
                      <p>
                        <strong>Примечание:</strong> {detail.note}
                      </p>
                    ) : null}
                    <div className="warehouse-inventory-modal__table">
                      <div className="warehouse-inventory-modal__table-head">
                        <span>Товар</span>
                        <span>Было</span>
                        <span>Факт</span>
                        <span>Δ</span>
                      </div>
                      <div className="warehouse-inventory-modal__rows">
                        {(detail.lines || detail.items || []).map((line: any) => {
                          const pname =
                            line.product?.name ||
                            line.product_name ||
                            line.product_title ||
                            line.product_id ||
                            "—";
                          return (
                            <div
                              key={
                                line.id ||
                                `${line.product_id}-${line.quantity_fact}`
                              }
                              className="warehouse-inventory-modal__row"
                            >
                              <div className="warehouse-inventory-modal__product">
                                <div className="warehouse-inventory-modal__product-name">
                                  {pname}
                                </div>
                              </div>
                              <div className="warehouse-inventory-modal__value">
                                {line.quantity_before ?? "—"}
                              </div>
                              <div className="warehouse-inventory-modal__value">
                                {line.quantity_fact ?? "—"}
                              </div>
                              <div className="warehouse-inventory-modal__value">
                                {line.quantity_delta ?? "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {String(detail.status || "").toLowerCase() === "draft" ? (
                      <>
                        <label className="warehouse-inventory-modal__checkbox">
                          <input
                            type="checkbox"
                            checked={allowNegative}
                            onChange={(e: any) =>
                              setAllowNegative(e.target.checked)
                            }
                          />
                          <span>
                            Разрешить отрицательные фактические остатки при
                            проведении
                          </span>
                        </label>
                        <div className="inventory-sessions__detail-actions">
                          <button
                            type="button"
                            className="nur-btn nur-btn--danger"
                            onClick={() => void handleCancelDraft()}
                            disabled={applyBusy || cancelBusy}
                          >
                            <XCircle size={16} />
                            {cancelBusy ? "Отмена…" : "Отменить черновик"}
                          </button>
                          <button
                            type="button"
                            className="nur-btn nur-btn--primary"
                            onClick={() => void handleApply()}
                            disabled={applyBusy || cancelBusy}
                          >
                            <PackageCheck size={16} />
                            {applyBusy ? "Проводим…" : "Провести"}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </ReactPortal>
      ) : null}

      {createProducts?.length ? (
        <ReactPortal wrapperId="market-inventory-create-from-warehouse">
          <InventoryModal
            products={createProducts}
            onClose={() => setCreateProducts(null)}
            onSaved={onCreateModalSaved}
          />
        </ReactPortal>
      ) : null}
    </div>
  );
};

export default React.memo(InventorySessionsTab);
