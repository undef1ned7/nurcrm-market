import { useEffect, useMemo, useState, useCallback } from "react";
import api from "@shared/api";
import {
  PageShell,
  PageHeader,
  PagePanel,
  FilterBar,
  StatusChip,
  EmptyState,
  LoadingState,
} from "@shared/ui/page-shell";
import "./History.scss";

const fmtMoney = (v: any) =>
  (Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }) +
  " с";

const asArray = (data: any) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const pickDate = (row: any) => row.paid_at || row.created_at || null;

const statusTone = (status) => {
  if (status === "paid") return "success";
  if (status === "canceled") return "danger";
  if (status === "new") return "warning";
  return "default";
};

const statusLabel = (status) => {
  if (status === "paid") return "Оплачено";
  if (status === "canceled") return "Отменено";
  if (status === "new") return "Новый";
  return status || "—";
};

export default function MarketHistory() {
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // фильтры
  const [status, setStatus] = useState(""); // "" = все
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // модалка деталей
  const [openId, setOpenId] = useState<any>(null);

  const load = useCallback(
    async (url = null) => {
      try {
        setErr("");
        setLoading(true);

        let resp;
        if (url) {
          resp = await api.get(url);
        } else {
          const q = new URLSearchParams();
          if (status) q.set("status", status);
          if (start) q.set("start", start);
          if (end) q.set("end", end);
          resp = await api.get(
            `/main/pos/sales/${q.toString() ? `?${q.toString()}` : ""}`
          );
        }

        const data = resp.data || {};
        const list = asArray(data);

        const mapped = list.map((r: any) => ({
          id: r.id,
          status: r.status || "new",
          subtotal: Number(r.subtotal) || 0,
          discount: Number(r.discount_total) || 0,
          tax: Number(r.tax_total) || 0,
          total: Number(r.total) || 0,
          createdAt: pickDate(r),
          user: r.user_display || "—",
        }));

        if (url) {
          setRows((prev: any) => [...prev, ...mapped]);
        } else {
          setRows(mapped);
        }
        setCount(Number(data.count || mapped.length));
        setNextUrl(data.next || null);
      } catch (e: any) {
        console.error(e);
        setErr("Не удалось загрузить историю продаж");
      } finally {
        setLoading(false);
      }
    },
    [status, start, end]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onOpen = (id) => setOpenId(id);
  const onClose = () => setOpenId(null);

  const totalSum = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [rows]
  );

  return (
    <PageShell className="history">
      <PageHeader
        title="История продаж"
        subtitle="Чеки POS: статусы, суммы и позиции"
      />

      <FilterBar className="history__filters">
        <label className="nur-field history__filter">
          <span className="nur-label">Статус</span>
          <select
            className="nur-select"
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
          >
            <option value="">Все</option>
            <option value="new">Новые</option>
            <option value="paid">Оплачено</option>
            <option value="canceled">Отменено</option>
          </select>
        </label>

        <label className="nur-field history__filter">
          <span className="nur-label">С</span>
          <input
            type="date"
            className="nur-input"
            value={start}
            max={end || undefined}
            onChange={(e: any) => setStart(e.target.value)}
          />
        </label>

        <label className="nur-field history__filter">
          <span className="nur-label">По</span>
          <input
            type="date"
            className="nur-input"
            value={end}
            min={start || undefined}
            onChange={(e: any) => setEnd(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={() => load()}
          disabled={loading}
        >
          Обновить
        </button>
      </FilterBar>

      {err && <div className="history__error">{err}</div>}

      <PagePanel flush>
        <div className="nur-table-wrap">
          <table className="nur-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Статус</th>
                <th>Итого</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <LoadingState rows={4} />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r: any) => (
                  <tr key={r.id}>
                    <td className="ellipsis" title={r.createdAt || "—"}>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>{r.user}</td>
                    <td>
                      <StatusChip tone={statusTone(r.status)}>
                        {statusLabel(r.status)}
                      </StatusChip>
                    </td>
                    <td>{fmtMoney(r.total)}</td>
                    <td>
                      <button
                        type="button"
                        className="nur-btn nur-btn--primary nur-btn--sm"
                        onClick={() => onOpen(r.id)}
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="Чеков пока нет"
                      text="Продажи появятся здесь после оформления в кассе."
                    />
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  <strong>Всего чеков:</strong> {count}
                </td>
                <td colSpan={2}>
                  <strong>Сумма по странице:</strong> {fmtMoney(totalSum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </PagePanel>

      {nextUrl && (
        <div className="history__more">
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => load(nextUrl)}
            disabled={loading}
          >
            Загрузить ещё
          </button>
        </div>
      )}

      {openId && <SaleModal id={openId} onClose={onClose} />}
    </PageShell>
  );
}

/* ================== Modal with details ================== */
function SaleModal({ id, onClose }: any) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sale, setSale] = useState<any>(null);

  const fmtMoneyLocal = (v: any) =>
    (Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }) +
    " с";

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const { data } = await api.get(`/main/pos/sales/${id}/`);
      const items = Array.isArray(data.items)
        ? data.items.map((it: any, i: any) => {
            const unit = Number(it.unit_price) || 0;
            const qty = Number(it.quantity) || 0;
            const line = Number(it.line_total ?? unit * qty) || 0;
            return {
              id: it.id || String(i),
              name: it.product_name || it.name_snapshot || "—",
              barcode: it.barcode_snapshot || it.barcode || "",
              qty,
              unit_price: unit,
              line_total: line,
            };
          })
        : [];
      setSale({
        id: data.id,
        createdAt: data.created_at || null,
        user: data.user_display || "—",
        total: Number(data.total) || 0,
        items,
      });
    } catch (e: any) {
      console.error(e);
      setErr("Не удалось загрузить детали продажи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, [id]);

  return (
    <div className="nur-modal-overlay" onClick={onClose}>
      <div
        className="nur-modal nur-modal--xl"
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="nur-modal__header">
          <h2 className="nur-modal__title">
            Продажа #{(id || "").slice(0, 8)}…
          </h2>
          <button
            type="button"
            className="nur-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="nur-modal__body">
          {loading ? (
            <div className="history__skeletonRow">
              <div className="nur-skeleton history__skeleton" />
              <div className="nur-skeleton history__skeleton" />
              <div className="nur-skeleton history__skeleton" />
            </div>
          ) : err ? (
            <div className="history__error">{err}</div>
          ) : sale ? (
            <>
              <div className="history__meta">
                <div>
                  <strong>Создано:</strong>{" "}
                  {sale.createdAt
                    ? new Date(sale.createdAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  <strong>Пользователь:</strong> {sale.user}
                </div>
                <div>
                  <strong>Итого:</strong> {fmtMoneyLocal(sale.total)}
                </div>
              </div>

              <div className="nur-table-wrap history__modalTable">
                <table className="nur-table nur-table--dense">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Штрих-код</th>
                      <th>Кол-во</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.length ? (
                      sale.items.map((it: any) => (
                        <tr key={it.id}>
                          <td className="ellipsis" title={it.name}>
                            {it.name}
                          </td>
                          <td className="ellipsis" title={it.barcode || "—"}>
                            {it.barcode || "—"}
                          </td>
                          <td>{it.qty}</td>
                          <td>{fmtMoneyLocal(it.unit_price)}</td>
                          <td>{fmtMoneyLocal(it.line_total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            title="Позиции отсутствуют"
                            text="В этом чеке нет товарных позиций."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}></td>
                      <td>
                        <strong>Итого</strong>
                      </td>
                      <td>{fmtMoneyLocal(sale.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {sale && !loading && !err && (
          <div className="nur-modal__footer">
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={load}
            >
              Обновить
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
