import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useParams,
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Search,
  Plus,
  Table2,
  LayoutGrid,
  Trash2,
  Banknote,
  Wallet,
  Landmark,
  Check,
  X,
} from "lucide-react";
import api from "@shared/api";
import "./kassa.scss";
import { useUser } from "@entities/user";
import useResize from "@shared/hooks/useResize";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { isProfileOwnerOrAdmin } from "@shared/lib/tools/saleReturn";
import { isMarketStartRestricted } from "@shared/lib/subscriptionPlan";
import { useAppDispatch } from "@app/store";
import {
  updateCashboxRole,
  isCashboxDeleteEnabled,
  isCashboxDebtRoleEnabled,
  isConsumptionCashbox,
  isDebtCashbox,
  hasActivePosMainCashbox,
  hasActiveDebtCashbox,
  cashboxRoleLabel,
  buildCreateCashboxPayload,
  CASHBOX_ROLE,
  type CreateCashboxKind,
} from "@entities/cash";
import DeleteCashboxModal from "./DeleteCashboxModal/DeleteCashboxModal";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  StatusChip,
} from "@shared/ui/page-shell";
import Reports from "./Reports/Reports";
import {
  fetchCashflowRequestsSetting,
  isCashFlowChangeRequestsEnabled,
  useCashFlowRealtimeEvent,
  useCashflowRequestsEnabled,
} from "@entities/cash";
import FlowChangeRequestModal from "./FlowChangeRequestModal/FlowChangeRequestModal";

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
    if (idSegment === "reports") return <Reports />;
    if (idSegment) return <CashboxDetail id={idSegment} />;
  }
  return <CashboxList />;
};

/* Шапка страницы кассы */
const HeaderTabs = ({ rightAction, subtitle }: any) => {
  const { t } = useTranslation();
  return (
  <PageHeader
    title={t("crm.kassa.pageTitle")}
    subtitle={subtitle || t("crm.kassa.subtitle")}
    actions={rightAction}
  />
  );
};

/* ──────────────────────────────── Список касс */
const VIEW_STORAGE_KEY = "kassa-view-mode";
const getInitialViewMode = () => {
  if (typeof window === "undefined") return "table";
  const saved = localStorage.getItem(VIEW_STORAGE_KEY);
  if (saved === "table" || saved === "cards") return saved;
  return "table";
};

const CashboxList = () => {
  const { t } = useTranslation();
  const alert = useAlert();
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const { company, profile } = useUser();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createKind, setCreateKind] = useState<CreateCashboxKind>("plain");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<any[] | null>(null);
  const [assigningDebtId, setAssigningDebtId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const navigate = useNavigate();

  const canDeleteCashboxes =
    isCashboxDeleteEnabled() && isProfileOwnerOrAdmin(profile);
  const canAssignDebtRole =
    isCashboxDebtRoleEnabled() &&
    isProfileOwnerOrAdmin(profile) &&
    !isMarketStartRestricted(company?.subscription_plan?.name, company?.sector?.name);

  const tt = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback }) as string;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDeleteModal = (targets: any[]) => {
    if (!targets.length) return;
    setDeleteTargets(targets);
  };

  const onAssignDebtRole = (row: any) => {
    if (!row?.id || assigningDebtId) return;
    const label = row.department_name || row.name || "";
    const currentRoleLabel = cashboxRoleLabel(row);
    const warning = currentRoleLabel
      ? tt(
          "crm.kassa.assignDebtRole.confirmWithRole",
          "Касса «{{name}}» сейчас используется как «{{role}}». После смены роли на «Для долгов» операции {{role}} перестанут в неё маршрутизироваться, а долги (клиентов и поставщиков) начнут попадать сюда. Продолжить?",
        )
          .replace("{{name}}", label)
          .replace(/\{\{role\}\}/g, currentRoleLabel)
      : tt(
          "crm.kassa.assignDebtRole.confirm",
          "Сделать кассу «{{name}}» кассой для долгов? Долги клиентов и поставщиков начнут попадать сюда.",
        ).replace("{{name}}", label);
    confirm(warning, async (ok: boolean) => {
      if (!ok) return;
      setAssigningDebtId(String(row.id));
      try {
        await dispatch(
          updateCashboxRole({ id: row.id, role: CASHBOX_ROLE.DEBT }),
        ).unwrap();
        alert(
          tt("crm.kassa.assignDebtRole.done", "Роль кассы обновлена: «Для долгов»"),
        );
        load();
      } catch (e: any) {
        alert(
          validateResErrors(
            e,
            tt(
              "crm.kassa.assignDebtRole.error",
              "Не удалось изменить роль кассы. Попробуйте ещё раз.",
            ),
          ),
          true,
        );
      } finally {
        setAssigningDebtId(null);
      }
    });
  };

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
      const errorMessage = validateResErrors(e, t("crm.kassa.loadError"))
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

  const submitCreate = async () => {
    const title = (name || "").trim();
    try {
      await api.post(
        "/construction/cashboxes/",
        buildCreateCashboxPayload(title, createKind),
      );
      setCreateOpen(false);
      setName("");
      setCreateKind("plain");
      load();
    } catch (e: any) {
      const errorMessage = validateResErrors(e, t("crm.kassa.createError"))
      alert(errorMessage, true);
    }
  };

  const onCreate = () => {
    const title = (name || "").trim();
    if (!title) return alert(t("crm.kassa.enterName"));

    // BE присваивает роль по ключевым словам в названии — что не подошло,
    // получает pos_main по умолчанию, независимо от is_consumption. Если у
    // компании pos_main уже есть, вторая такая же касса ломает маршрутизацию
    // checkout / долга без смены (см. docs/backend/kassa/pos-main-duplicate-role-bug.md).
    const looksLikeExpense = /расход|прочих|прочие|переменн|постоянн|долг|карыз/i.test(
      title,
    );
    if (createKind === "plain" && !looksLikeExpense && hasActivePosMainCashbox(rows)) {
      confirm(
        t("crm.kassa.createPosMainWarning", {
          defaultValue:
            "У компании уже есть основная касса. Эта касса без отметки «Прочие расходы»/«Для долгов» и без подсказки в названии, скорее всего, тоже получит роль pos_main и может сломать маршрутизацию продаж/долгов. Создать всё равно?",
        }) as string,
        (ok: boolean) => {
          if (ok) void submitCreate();
        },
      );
      return;
    }

    // Долгов-касса — тоже singleton на компанию (см. cashbox-debt-role-backend.md).
    if (createKind === "debt" && hasActiveDebtCashbox(rows)) {
      confirm(
        tt(
          "crm.kassa.createDebtDuplicateWarning",
          "У компании уже есть касса для долгов. Обычно нужна только одна — иначе долги могут попадать в разные кассы. Создать ещё одну всё равно?",
        ),
        (ok: boolean) => {
          if (ok) void submitCreate();
        },
      );
      return;
    }

    void submitCreate();
  };

  const posMainCount = useMemo(
    () => rows.filter((r: any) => r?.is_active !== false && r?.role === "pos_main").length,
    [rows],
  );

  /** Удалить можно кассы расходов/долгов всегда, а дублирующие pos_main — если их больше одной. */
  const canDeleteRow = (r: any) =>
    canDeleteCashboxes &&
    (isConsumptionCashbox(r) || isDebtCashbox(r) || (r?.role === "pos_main" && posMainCount > 1));

  const selectedRows = filtered.filter((r) => selectedIds.has(String(r.id)));

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
              ? t("crm.kassa.createCashboxShort")
              : t("crm.kassa.createCashbox")}
          </button>
        }
      />

      <FilterBar className="kassa-page__toolbar">
        <div className="kassa-search">
          <Search className="kassa-search__icon" size={18} />
          <input
            type="text"
            className="nur-input kassa-search__input"
            placeholder={t("crm.kassa.searchPlaceholderExtended")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <StatusChip>{t("common.total")}: {filtered.length}</StatusChip>
        {canDeleteCashboxes && selectedRows.length > 0 && (
          <button
            type="button"
            className="nur-btn nur-btn--danger nur-btn--sm"
            onClick={() => openDeleteModal(selectedRows)}
          >
            <Trash2 size={14} />
            {tt("crm.kassa.deleteSelected", "Удалить выбранные")} ({selectedRows.length})
          </button>
        )}
        {!isMobile && (
          <div className="kassa-search__view-toggle">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`nur-btn nur-btn--sm ${
                viewMode === "table" ? "nur-btn--primary" : "nur-btn--secondary"
              }`}
              title={t("common.table")}
            >
              <Table2 size={16} />
              {t("common.table")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`nur-btn nur-btn--sm ${
                viewMode === "cards" ? "nur-btn--primary" : "nur-btn--secondary"
              }`}
              title={t("common.cards")}
            >
              <LayoutGrid size={16} />
              {t("common.cards")}
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
                  {canDeleteCashboxes && <th aria-label={tt("common.select", "Выбрать")} />}
                  <th>#</th>
                  <th>{t("crm.kassa.departmentName")}</th>
                  <th>{tt("crm.kassa.roleLabel", "Роль")}</th>
                  <th>{t("crm.kassa.income")}</th>
                  <th>{t("crm.kassa.expense")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canDeleteCashboxes ? 7 : 6} className="kassa-table__loading">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className="kassa__rowClickable"
                      onClick={() => navigate(`${BASE}/${r.id}`)}
                    >
                      {canDeleteCashboxes && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(String(r.id))}
                            onChange={() => toggleSelected(String(r.id))}
                          />
                        </td>
                      )}
                      <td>{i + 1}</td>
                      <td>
                        <b>{r.department_name || r.name || "—"}</b>
                      </td>
                      <td>
                        {cashboxRoleLabel(r) && (
                          <span className="kassa-role-badge">{cashboxRoleLabel(r)}</span>
                        )}
                        {r?.is_active === false && (
                          <span className="kassa-role-badge kassa-role-badge--archived">
                            {tt("crm.kassa.archived", "в архиве")}
                          </span>
                        )}
                      </td>
                      <td>{money(r.analytics?.income_total || 0)}</td>
                      <td>{money(r.analytics?.expense_total || 0)}</td>
                      <td>
                        <div className="kassa-row-actions">
                          <button
                            className="nur-btn nur-btn--secondary nur-btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${BASE}/${r.id}`);
                            }}
                          >
                            {t("common.open")}
                          </button>
                          {canAssignDebtRole && !isDebtCashbox(r) && (
                            <button
                              className="nur-btn nur-btn--secondary nur-btn--sm"
                              disabled={assigningDebtId === String(r.id)}
                              title={tt(
                                "crm.kassa.assignDebtRole.action",
                                "Назначить кассой для долгов",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignDebtRole(r);
                              }}
                            >
                              <Banknote size={14} />
                              {tt("crm.kassa.forDebts", "Для долгов")}
                            </button>
                          )}
                          {canDeleteRow(r) && (
                            <button
                              className="nur-btn nur-btn--danger nur-btn--sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal([r]);
                              }}
                            >
                              <Trash2 size={14} />
                              {t("common.delete")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canDeleteCashboxes ? 7 : 6} className="kassa-table__empty">
                      {t("common.noData")}
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
              <div className="kassa-cards-empty">{t("common.noData")}</div>
            ) : (
              <div className="kassa-cards">
                {filtered.map((r, i) => (
                  <div
                    key={r.id}
                    className="kassa-card"
                    onClick={() => navigate(`${BASE}/${r.id}`)}
                  >
                    <div className="kassa-card__header">
                      {canDeleteCashboxes && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(r.id))}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelected(String(r.id))}
                        />
                      )}
                      <span className="kassa-card__num">{i + 1}</span>
                      <h3 className="kassa-card__title">
                        {r.department_name || r.name || "—"}
                      </h3>
                    </div>
                    {(cashboxRoleLabel(r) || r?.is_active === false) && (
                      <div className="kassa-card__badges">
                        {cashboxRoleLabel(r) && (
                          <span className="kassa-role-badge">{cashboxRoleLabel(r)}</span>
                        )}
                        {r?.is_active === false && (
                          <span className="kassa-role-badge kassa-role-badge--archived">
                            {tt("crm.kassa.archived", "в архиве")}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="kassa-card__fields">
                      <div className="kassa-card__field">
                        <span className="kassa-card__label">{t("crm.kassa.income")}</span>
                        <span className="kassa-card__value kassa-card__value--income">
                          {money(r.analytics?.income_total || 0)}
                        </span>
                      </div>
                      <div className="kassa-card__field">
                        <span className="kassa-card__label">{t("crm.kassa.expense")}</span>
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
                      {canAssignDebtRole && !isDebtCashbox(r) && (
                        <button
                          type="button"
                          className="nur-btn nur-btn--secondary nur-btn--sm kassa-card__btn"
                          disabled={assigningDebtId === String(r.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignDebtRole(r);
                          }}
                        >
                          <Banknote size={14} />
                          {tt("crm.kassa.forDebts", "Для долгов")}
                        </button>
                      )}
                      {canDeleteRow(r) && (
                        <button
                          type="button"
                          className="nur-btn nur-btn--danger nur-btn--sm kassa-card__btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal([r]);
                          }}
                        >
                          <Trash2 size={14} />
                          {t("common.delete")}
                        </button>
                      )}
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
              aria-label={t("crm.kassa.createModalTitle")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kassa-modal__header">
                <div className="kassa-modal__heading">
                  <span className="kassa-modal__heading-icon kassa-modal__heading-icon--primary">
                    <Wallet size={20} />
                  </span>
                  <div className="kassa-modal__heading-text">
                    <h3 className="kassa-modal__title">
                      {t("crm.kassa.createModalTitle")}
                    </h3>
                    <p className="kassa-modal__subtitle">
                      {tt(
                        "crm.kassa.createModalSubtitle",
                        "Название и назначение кассы можно изменить позже",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  className="kassa-modal__close"
                  onClick={() => setCreateOpen(false)}
                  aria-label={t("common.close")}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="kassa-modal__section">
                <label className="kassa-modal__label" htmlFor="kassa-create-name">
                  {t("crm.kassa.cashboxNameLabel")}
                </label>
                <input
                  id="kassa-create-name"
                  className="nur-input"
                  type="text"
                  placeholder={t("crm.kassa.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="kassa-modal__section">
                <label className="kassa-modal__label">
                  {tt("crm.kassa.createKindLabel", "Назначение кассы")}
                </label>
                <div className="kassa-modal__kind-group" role="radiogroup">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={createKind === "plain"}
                    className={`kassa-modal__kind-card${
                      createKind === "plain" ? " kassa-modal__kind-card--active" : ""
                    }`}
                    onClick={() => setCreateKind("plain")}
                  >
                    <span className="kassa-modal__kind-icon">
                      <Wallet size={16} />
                    </span>
                    <span className="kassa-modal__kind-text">
                      <span className="kassa-modal__kind-title">
                        {tt("crm.kassa.kindPlain", "Обычная касса")}
                      </span>
                      <span className="kassa-modal__kind-hint">
                        {tt(
                          "crm.kassa.kindPlainHint",
                          "Продажи, приём оплат",
                        )}
                      </span>
                    </span>
                    {createKind === "plain" && (
                      <Check size={16} className="kassa-modal__kind-check" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={createKind === "expense"}
                    className={`kassa-modal__kind-card${
                      createKind === "expense" ? " kassa-modal__kind-card--active" : ""
                    }`}
                    onClick={() => setCreateKind("expense")}
                  >
                    <span className="kassa-modal__kind-icon">
                      <Banknote size={16} />
                    </span>
                    <span className="kassa-modal__kind-text">
                      <span className="kassa-modal__kind-title">
                        {t("crm.kassa.otherExpenses")}
                      </span>
                      <span className="kassa-modal__kind-hint">
                        {tt(
                          "crm.kassa.kindExpenseHint",
                          "Закупки, расчёты с поставщиками",
                        )}
                      </span>
                    </span>
                    {createKind === "expense" && (
                      <Check size={16} className="kassa-modal__kind-check" />
                    )}
                  </button>

                  {canAssignDebtRole && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={createKind === "debt"}
                      className={`kassa-modal__kind-card${
                        createKind === "debt" ? " kassa-modal__kind-card--active" : ""
                      }`}
                      onClick={() => setCreateKind("debt")}
                    >
                      <span className="kassa-modal__kind-icon">
                        <Landmark size={16} />
                      </span>
                      <span className="kassa-modal__kind-text">
                        <span className="kassa-modal__kind-title">
                          {tt("crm.kassa.forDebts", "Для долгов")}
                        </span>
                        <span className="kassa-modal__kind-hint">
                          {tt(
                            "crm.kassa.kindDebtHint",
                            "Погашения долгов клиентов",
                          )}
                        </span>
                      </span>
                      {createKind === "debt" && (
                        <Check size={16} className="kassa-modal__kind-check" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="kassa-modal__footer">
                <button
                  className="nur-btn nur-btn--secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="nur-btn nur-btn--primary"
                  onClick={onCreate}
                  disabled={!name.trim()}
                >
                  <Plus size={16} />
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}

      {deleteTargets && (
        <DeleteCashboxModal
          targets={deleteTargets}
          allCashboxes={rows}
          onClose={() => setDeleteTargets(null)}
          onDone={() => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              deleteTargets.forEach((t) => next.delete(String(t.id)));
              return next;
            });
            load();
          }}
        />
      )}
    </PageShell>
  );
};

/* ──────────────────────────────── Детали кассы */
const CashboxDetail = ({ id: idProp }: any) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { id: idFromParams } = useParams();
  const id = idProp ?? idFromParams;
  const [searchParams, setSearchParams] = useSearchParams();
  const [box, setBox] = useState<any>(null);
  const [ops, setOps] = useState<any[]>([]);
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState(tabFromUrl || "all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // Заявка на редактирование/отмену движения: { mode, flow } | null
  const [flowChange, setFlowChange] = useState<any>(null);
  const cashflowRequestsEnabled = useCashflowRequestsEnabled();
  useEffect(() => {
    dispatch(fetchCashflowRequestsSetting() as any);
  }, [dispatch]);
  const canRequestFlowChange =
    isCashFlowChangeRequestsEnabled() && cashflowRequestsEnabled;
  const flowColSpan = canRequestFlowChange ? 5 : 4;

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
          name: x.name || x.title || x.description || x.note || "",
          status: x.status,
          cashbox: x.cashbox || x.cashbox_id || null,
          title:
            x.title ||
            x.name ||
            x.description ||
            x.note ||
            (type === "income" ? t("crm.kassa.income") : t("crm.kassa.expense")),
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
      setErr(t("crm.kassa.detailLoadError"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Другой владелец одобрил edit/cancel-заявку по этой кассе (на другом
  // устройстве/вкладке) — подхватываем свежие суммы без ручного релоада.
  // @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md §11 (R8)
  const cashFlowRealtimeEvent = useCashFlowRealtimeEvent();
  const lastRealtimeVersionRef = useRef(cashFlowRealtimeEvent.version);
  useEffect(() => {
    if (cashFlowRealtimeEvent.version === lastRealtimeVersionRef.current) return;
    lastRealtimeVersionRef.current = cashFlowRealtimeEvent.version;
    if (
      cashFlowRealtimeEvent.cashboxId &&
      id &&
      String(cashFlowRealtimeEvent.cashboxId) !== String(id)
    ) {
      return; // событие по другой кассе
    }
    void load();
  }, [cashFlowRealtimeEvent, id, load]);

  const shown = useMemo(() => {
    if (tab === "income") return ops.filter((o) => o.type === "income");
    if (tab === "expense") return ops.filter((o) => o.type === "expense");
    return ops;
  }, [ops, tab]);

  return (
    <PageShell className="kassa-page">
      <PageHeader
        title={box?.department_name || box?.name || t("crm.kassa.pageTitle")}
        subtitle={t("crm.kassa.operationsSubtitle")}
        actions={
          <nav className="kassa-header__nav-tabs">
            <Link className="nur-btn nur-btn--ghost nur-btn--sm" to={BASE}>
              ← {t("common.back")}
            </Link>
            <Link className="nur-btn nur-btn--secondary nur-btn--sm" to={`${BASE}/pay`}>
              {t("crm.kassa.payment")}
            </Link>
            <Link className="nur-btn nur-btn--secondary nur-btn--sm" to={`${BASE}/reports`}>
              {t("crm.kassa.reports")}
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
            {t("crm.kassa.expense")}
          </button>
          <button
            type="button"
            className={`nur-chip ${tab === "income" ? "nur-chip--primary" : ""}`}
            onClick={() => handleTabChange("income")}
          >
            {t("crm.kassa.income")}
          </button>
          <button
            type="button"
            className={`nur-chip ${tab === "all" ? "nur-chip--primary" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            {t("crm.kassa.all")}
          </button>
        </div>
        <button
          type="button"
          className="nur-btn nur-btn--primary nur-btn--sm"
          onClick={() => alert(t("crm.kassa.addOperationHint"))}
        >
          <Plus size={16} />
          {t("crm.kassa.addOperation")}
        </button>
      </FilterBar>

      <PagePanel flush className="kassa-table-container">
        <div className="nur-table-wrap">
        <table className="nur-table kassa-table">
          <thead>
            <tr>
              <th>{t("crm.kassa.type")}</th>
              <th>{t("common.name")}</th>
              <th>{t("common.amount")}</th>
              <th>{t("crm.kassa.createdAt")}</th>
              {canRequestFlowChange && <th>{t("common.actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={flowColSpan} className="kassa-table__loading">
                  Загрузка…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={flowColSpan} className="kassa__alert kassa__alert--error">
                  {err}
                </td>
              </tr>
            ) : shown.length ? (
              shown.map((o) => (
                <tr key={o.id}>
                  <td>{o.type === "income" ? t("crm.kassa.income") : t("crm.kassa.expense")}</td>
                  <td>{o.title}</td>
                  <td>{money(o.amount)}</td>
                  <td>{when(o.created_at)}</td>
                  {canRequestFlowChange && (
                    <td>
                      <div className="kassa-row-actions">
                        <button
                          type="button"
                          className="nur-btn nur-btn--secondary nur-btn--sm"
                          onClick={() => setFlowChange({ mode: "edit", flow: o })}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className="nur-btn nur-btn--danger nur-btn--sm"
                          onClick={() => setFlowChange({ mode: "cancel", flow: o })}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={flowColSpan} className="kassa-table__empty">
                  {t("crm.kassa.noOperations")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </PagePanel>

      {flowChange && (
        <FlowChangeRequestModal
          mode={flowChange.mode}
          flow={flowChange.flow}
          onClose={() => setFlowChange(null)}
          onSubmitted={() => {
            setFlowChange(null);
            load();
          }}
        />
      )}
    </PageShell>
  );
};

export default CafeKassa;
