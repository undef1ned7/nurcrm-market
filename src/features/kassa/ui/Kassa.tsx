import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Search, Plus, Table2, LayoutGrid } from "lucide-react";
import api from "@shared/api";
import "./kassa.scss";
import { useUser } from "@entities/user";
import useResize from "@shared/hooks/useResize";
import { useAlert } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  StatusChip,
} from "@shared/ui/page-shell";

/* Base path */
const BASE = "/crm/kassa";

/* helpers */
const asArray = (d) =>
  Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
const money = (v) =>
  (Number(v) || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0 }) + " c";
const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

/* ───────────────────────────────────────────────── */
/* Рендер по pathname, чтобы контент гарантированно показывался (вложенные Routes могут не матчить в RR v6) */
const CafeKassa = () => {
  const { pathname } = useLocation();
  const normalized = pathname.replace(/\/+$/, "") || BASE;
  const baseNorm = BASE.replace(/\/+$/, "");

  if (normalized !== baseNorm) {
    const afterBase = normalized.slice(baseNorm.length + 1);
    const idSegment = afterBase.split("/")[0];
    if (idSegment) return <CashboxDetail id={idSegment} />;
  }
  return <CashboxList />;
};

/* Шапка страницы кассы */
const HeaderTabs = ({ rightAction, subtitle }: any) => (
  <PageHeader
    title="Касса"
    subtitle={subtitle || "Управление кассами и денежными потоками"}
    actions={rightAction}
  />
);

/* ──────────────────────────────── Список касс */
const VIEW_STORAGE_KEY = "kassa-view-mode";
const getInitialViewMode = () => {
  if (typeof window === "undefined") return "table";
  const saved = localStorage.getItem(VIEW_STORAGE_KEY);
  if (saved === "table" || saved === "cards") return saved;
  return "table";
};

const CashboxList = () => {
  const alert = useAlert();
  const { company } = useUser();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const navigate = useNavigate();
  const { isMobile } = useResize(({ isMobile }: any) => {
    if (isMobile) {
      setViewMode('cards')
    } else {
      setViewMode(getInitialViewMode())
    }
  });
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const { data } = await api.get("/construction/cashboxes/");
      setRows(asArray(data));
    } catch (e: any) {
      const errorMessage = validateResErrors(e, "Ошибка при загрузке касс. ")
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.department_name, r.name].some((x) =>
        String(x || "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [rows, q]);

  const onCreate = async () => {
    const title = (name || "").trim();
    if (!title) return alert("Введите название кассы");
    try {
      await api.post("/construction/cashboxes/", {
        name: title,
        is_consumption: checked,
      });
      setCreateOpen(false);
      setName("");
      load();
    } catch (e: any) {
      const errorMessage = validateResErrors(e, "Ошибка при создании кассы. ")
      alert(errorMessage, true);
    }
  };

  return (
    <PageShell className="kassa-page">
      <HeaderTabs
        rightAction={
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            {company?.subscription_plan?.name === "Старт"
              ? "Создать кассу"
              : "Создать кассу для прочих расходов"}
          </button>
        }
      />

      <FilterBar className="kassa-page__toolbar">
        <div className="kassa-search">
          <Search className="kassa-search__icon" size={18} />
          <input
            type="text"
            className="nur-input kassa-search__input"
            placeholder="Поиск по названию или отделу…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <StatusChip>Всего: {filtered.length}</StatusChip>
        {!isMobile && (
          <div className="kassa-search__view-toggle">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`nur-btn nur-btn--sm ${
                viewMode === "table" ? "nur-btn--primary" : "nur-btn--secondary"
              }`}
              title="Таблица"
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
              title="Карточки"
            >
              <LayoutGrid size={16} />
              Карточки
            </button>
          </div>
        )}
      </FilterBar>

      {err && <div className="kassa__alert kassa__alert--error">{err}</div>}

      <PagePanel flush className="kassa-table-container">
        {viewMode === "table" && (
          <div className="nur-table-wrap kassa-table-scroll">
            <table className="nur-table kassa-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Название отдела</th>
                  <th>Приход</th>
                  <th>Расход</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="kassa-table__loading">
                      Загрузка…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className="kassa__rowClickable"
                      onClick={() => navigate(`${BASE}/${r.id}`)}
                    >
                      <td>{i + 1}</td>
                      <td>
                        <b>{r.department_name || r.name || "—"}</b>
                      </td>
                      <td>{money(r.analytics?.income_total || 0)}</td>
                      <td>{money(r.analytics?.expense_total || 0)}</td>
                      <td>
                        <button
                          className="nur-btn nur-btn--secondary nur-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${BASE}/${r.id}`);
                          }}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="kassa-table__empty">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "cards" && (
          <div className="kassa-cards-wrapper">
            {loading ? (
              <div className="kassa-cards-loading">Загрузка…</div>
            ) : filtered.length === 0 ? (
              <div className="kassa-cards-empty">Нет данных</div>
            ) : (
              <div className="kassa-cards">
                {filtered.map((r, i) => (
                  <div
                    key={r.id}
                    className="kassa-card"
                    onClick={() => navigate(`${BASE}/${r.id}`)}
                  >
                    <div className="kassa-card__header">
                      <span className="kassa-card__num">{i + 1}</span>
                      <h3 className="kassa-card__title">
                        {r.department_name || r.name || "—"}
                      </h3>
                    </div>
                    <div className="kassa-card__fields">
                      <div className="kassa-card__field">
                        <span className="kassa-card__label">Приход</span>
                        <span className="kassa-card__value kassa-card__value--income">
                          {money(r.analytics?.income_total || 0)}
                        </span>
                      </div>
                      <div className="kassa-card__field">
                        <span className="kassa-card__label">Расход</span>
                        <span className="kassa-card__value kassa-card__value--expense">
                          {money(r.analytics?.expense_total || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="kassa-card__actions">
                      <button
                        type="button"
                        className="nur-btn nur-btn--secondary nur-btn--sm kassa-card__btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${BASE}/${r.id}`);
                        }}
                      >
                        Открыть
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PagePanel>

      {createOpen && (
        <ReactPortal wrapperId="kassa-create-modal">
          <div
            className="kassa-modal__overlay"
            role="presentation"
            onClick={() => setCreateOpen(false)}
          >
            <div
              className="kassa-modal__card"
              role="dialog"
              aria-modal="true"
              aria-label="Создать кассу"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kassa-modal__header">
                <h3 className="kassa-modal__title">Создать кассу</h3>
                <button
                  className="kassa-modal__close"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
              <div className="kassa-modal__section">
                <label className="nur-label kassa-modal__label">
                  Название кассы *
                </label>
                <input
                  className="nur-input kassa-modal__input"
                  type="text"
                  placeholder="Например: касса №1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="kassa-modal__section" style={{ display: "flex" }}>
                <label className="nur-label kassa-modal__label">
                  Прочие расходы *
                </label>
                <input
                  className="nur-input kassa-modal__input"
                  type="checkbox"
                  placeholder="Например: касса №1"
                  style={{ width: "max-content" }}
                  value={checked as any}
                  onChange={(_e) => setChecked(!checked)}
                  required
                />
              </div>
              <div className="kassa-modal__footer">
                <button className="nur-btn nur-btn--primary" onClick={onCreate}>
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}
    </PageShell>
  );
};

/* ──────────────────────────────── Детали кассы */
const CashboxDetail = ({ id: idProp }: any) => {
  const { id: idFromParams } = useParams();
  const id = idProp ?? idFromParams;
  const [searchParams, setSearchParams] = useSearchParams();
  const [box, setBox] = useState<any>(null);
  const [ops, setOps] = useState<any[]>([]);
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState(tabFromUrl || "all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Синхронизация tab с URL параметром
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && ["income", "expense", "all"].includes(urlTab)) {
      if (urlTab !== tab) {
        setTab(urlTab);
      }
    } else if (!urlTab && tab !== "all") {
      // Если параметр удален из URL, сбрасываем на "all"
      setTab("all");
    }
  }, [searchParams, tab]);

  // Обновление URL при изменении tab
  const handleTabChange = (newTab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams);
    if (newTab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    setSearchParams(params, { replace: true });
  };

  const fromAny = (res) => {
    const d = res?.data ?? res ?? [];
    if (Array.isArray(d?.results)) return d.results;
    if (Array.isArray(d)) return d;
    return [];
  };

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      let detail = null;
      try {
        detail = (await api.get(`/construction/cashboxes/${id}/detail/owner/`))
          .data;
      } catch { }
      if (!detail) {
        try {
          detail = (await api.get(`/construction/cashboxes/${id}/detail/`))
            .data;
        } catch { }
      }
      if (!detail) {
        detail = (await api.get(`/construction/cashboxes/${id}/`)).data;
      }

      setBox(detail);

      let flows =
        fromAny({ data: (detail as any)?.operations }) ||
        fromAny({ data: (detail as any)?.flows }) ||
        fromAny({ data: (detail as any)?.transactions });

      if (!flows.length) {
        try {
          const r1 = await api.get(`/construction/cashflows/`, {
            params: { cashbox: id },
          });
          flows = fromAny(r1);
        } catch { }
      }
      if (!flows.length && (detail as any)?.uuid) {
        try {
          const r2 = await api.get(`/construction/cashflows/`, {
            params: { cashbox: (detail as any).uuid },
          });
          flows = fromAny(r2);
        } catch { }
      }

      const mapped = (flows || []).map((x, i) => {
        const amt = Number(x.amount ?? x.sum ?? x.value ?? x.total ?? 0) || 0;
        let type = String(x.type ?? x.kind ?? x.direction ?? "").toLowerCase();
        if (type !== "income" && type !== "expense")
          type = amt >= 0 ? "income" : "expense";
        return {
          id: x.id || x.uuid || `${i}`,
          type,
          title:
            x.title ||
            x.name ||
            x.description ||
            x.note ||
            (type === "income" ? "Приход" : "Расход"),
          amount: Math.abs(amt),
          created_at:
            x.created_at ||
            x.created ||
            x.date ||
            x.timestamp ||
            x.createdAt ||
            null,
        };
      });

      setOps(mapped);
    } catch (e: any) {
      console.error(e);
      setErr("Не удалось загрузить детали кассы");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    if (tab === "income") return ops.filter((o) => o.type === "income");
    if (tab === "expense") return ops.filter((o) => o.type === "expense");
    return ops;
  }, [ops, tab]);

  return (
    <PageShell className="kassa-page">
      <PageHeader
        title={box?.department_name || box?.name || "Касса"}
        subtitle="Операции по кассе"
        actions={
          <nav className="kassa-header__nav-tabs">
            <Link className="nur-btn nur-btn--ghost nur-btn--sm" to={BASE}>
              ← Назад
            </Link>
            <Link className="nur-btn nur-btn--secondary nur-btn--sm" to={`${BASE}/pay`}>
              Оплата
            </Link>
            <Link className="nur-btn nur-btn--secondary nur-btn--sm" to={`${BASE}/reports`}>
              Отчёты
            </Link>
          </nav>
        }
      />

      <FilterBar className="kassa-page__toolbar">
        <div className="kassa-chip-group">
          <button
            type="button"
            className={`nur-chip ${tab === "expense" ? "nur-chip--primary" : ""}`}
            onClick={() => handleTabChange("expense")}
          >
            Расход
          </button>
          <button
            type="button"
            className={`nur-chip ${tab === "income" ? "nur-chip--primary" : ""}`}
            onClick={() => handleTabChange("income")}
          >
            Приход
          </button>
          <button
            type="button"
            className={`nur-chip ${tab === "all" ? "nur-chip--primary" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            Все
          </button>
        </div>
        <button
          type="button"
          className="nur-btn nur-btn--primary nur-btn--sm"
          onClick={() =>
            alert(
              "Добавление операции делается через API. Здесь доступен только просмотр."
            )
          }
        >
          <Plus size={16} />
          Добавить операцию
        </button>
      </FilterBar>

      <PagePanel flush className="kassa-table-container">
        <div className="nur-table-wrap">
        <table className="nur-table kassa-table">
          <thead>
            <tr>
              <th>Тип</th>
              <th>Наименование</th>
              <th>Сумма</th>
              <th>Дата создания</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="kassa-table__loading">
                  Загрузка…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={4} className="kassa__alert kassa__alert--error">
                  {err}
                </td>
              </tr>
            ) : shown.length ? (
              shown.map((o) => (
                <tr key={o.id}>
                  <td>{o.type === "income" ? "Приход" : "Расход"}</td>
                  <td>{o.title}</td>
                  <td>{money(o.amount)}</td>
                  <td>{when(o.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="kassa-table__empty">
                  Нет операций
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </PagePanel>
    </PageShell>
  );
};

export default CafeKassa;
