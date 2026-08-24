import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutGrid, Plus, Search, Table2 } from "lucide-react";
import "./Clients.scss";
import api from "@shared/api";
import { useUser } from "@entities/user";
import Modal from "@shared/ui/Modal/Modal";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { GlossaryText } from "@shared/ui/GlossaryText/GlossaryText";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  StatusChip,
} from "@shared/ui/page-shell";

const HostelClients = lazy(
  () => import("@shared/ui/legacy-hostel/Clients/Clients"),
);

const STORAGE_KEY = "clients_view_mode";

const getInitialViewMode = () => {
  if (typeof window === "undefined") return "table";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "table" || saved === "cards") return saved;
  const isSmall = window.matchMedia("(max-width: 1199px)").matches;
  return isSmall ? "cards" : "table";
};

/* ===== helpers ===== */
const listFrom = (res) => res?.data?.results || res?.data || [];
const todayStr = () => new Date().toISOString().slice(0, 10);
const CARD_BASE = "/crm/clients/"; // абсолютный путь для карточки

function msgFromError(e, fallback) {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    try {
      const k = Object.keys(data)[0];
      const v = Array.isArray(data[k]) ? data[k][0] : data[k];
      return String(v || fallback);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const isInvalidChoiceError = (e) => {
  const status = e?.response?.status;
  if (status && status !== 400) return false;
  const raw = e?.response?.data;
  const text = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : "";
  const l = text.toLowerCase();
  return (
    l.includes("not a valid choice") ||
    l.includes("допустимых вариантов") ||
    l.includes("недопустим") ||
    l.includes("выберите корректное значение") ||
    l.includes("invalid choice")
  );
};

const tabKeyFromType = (t) => {
  if (!t) return null;
  const v = String(t).toLowerCase();
  if (v === "client") return "clients";
  if (v === "suppliers") return "suppliers";
  if (v === "implementers") return "resellers";
  if (v === "contractor") return "resellers";
  return null;
};

const PRIMARY_TYPE_BY_TAB = {
  clients: "client",
  suppliers: "suppliers",
  resellers: "implementers",
  contractor: "contractor",
};

const TYPE_VARIANTS_BY_TAB = {
  clients: ["client"],
  suppliers: ["suppliers"],
  resellers: ["implementers"],
  contractor: ["contractor"],
};

export default function MarketClients({ forcedTab = null, hideTabs = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { company: user } = useUser();
  const sectorName = user?.sector?.name;
  const isConstruction = sectorName === "Строительная компания";

  const TABS = useMemo(() => {
    const base = [
      { key: "clients", label: t("crm.clients.tabs.clients") },
      { key: "debtors", label: t("crm.clients.tabs.debtors") },
    ];
    if (sectorName === "Гостиница") {
      base.splice(1, 0, {
        key: "clientsBooking",
        label: t("crm.clients.tabs.booking"),
      });
    } else {
      base.push({
        key: "resellers",
        label: isConstruction
          ? t("crm.clients.tabs.contractors")
          : t("crm.clients.tabs.resellers"),
      });
    }
    return base;
  }, [sectorName, isConstruction, t]);

  const [activeTab, setActiveTab] = useState(forcedTab || "clients");
  useEffect(() => {
    if (!forcedTab) return;
    if (activeTab !== forcedTab) setActiveTab(forcedTab);
  }, [forcedTab, activeTab]);
  useEffect(() => {
    if (activeTab === "clientsBooking" && sectorName !== "Гостиница") {
      setActiveTab("clients");
    }
  }, [sectorName, activeTab]);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const debounceTimerRef = useRef<any>(null);

  const [acceptedTypeByTab, setAcceptedTypeByTab] = useState({
    ...PRIMARY_TYPE_BY_TAB,
  });

  const tryLoadWithType = async (typeValue) => {
    const res = await api.get("/main/clients/", {
      params: { type: typeValue },
    });
    return listFrom(res);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      // ───── отдельный запрос для ДОЛЖНИКОВ ─────
      if (activeTab === "debtors") {
        const res = await api.get("/main/clients/with-debts/");
        const list = listFrom(res);
        console.log(res);

        setRows(list);
        return;
      }

      const knownType = acceptedTypeByTab[activeTab];
      const variants =
        TYPE_VARIANTS_BY_TAB[activeTab] || [knownType].filter(Boolean);

      let list = [];
      let usedVariant = knownType || variants[0] || null;
      let success = false;

      for (const variant of variants) {
        try {
          list = await tryLoadWithType(variant);
          usedVariant = variant;
          success = true;
          break;
        } catch (e: any) {
          if (isInvalidChoiceError(e)) continue;
          throw e;
        }
      }

      if (!success) {
        const res = await api.get("/main/clients/");
        list = listFrom(res);
        usedVariant = null;
      }

      if (usedVariant) {
        setAcceptedTypeByTab((prev) => ({
          ...prev,
          [activeTab]: usedVariant,
        }));
      }

      setRows(list);
    } catch (e: any) {
      const errorMessage = validateResErrors(
        e,
        t("crm.clients.loadError"),
      );
      setError(errorMessage);
      setRows([]);
    } finally {
      setLoading(false);
    }
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
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  useEffect(() => {
    if (activeTab === "clientsBooking") return;
    load();
  }, [activeTab]);

  const ctxTypeLabel = (typeValue) => {
    const v = String(typeValue || "").toLowerCase();
    if (v === "client") return t("crm.clients.types.client");
    if (v === "suppliers") return t("crm.clients.types.supplier");
    if (v === "implementers")
      return isConstruction
        ? t("crm.clients.types.contractor")
        : t("crm.clients.types.reseller");
    if (v === "debtor" || v === "debtors") return t("crm.clients.types.debtor");
    return "—";
  };

  const filtered = useMemo(() => {
    const base = Array.isArray(rows) ? rows : [];
    const onlyThisTab = base.filter((r) => {
      // Для должников показываем всё, что вернул эндпоинт
      if (activeTab === "debtors") return true;

      const tab = tabKeyFromType(r?.type);
      if (!tab) return activeTab === "clients";
      return tab === activeTab;
    });

    if (!debouncedSearch) return onlyThisTab;
    const s = debouncedSearch.toLowerCase();
    return onlyThisTab.filter(
      (c) =>
        String(c.full_name || c.fio || "")
          .toLowerCase()
          .includes(s) ||
        String(c.phone || "")
          .toLowerCase()
          .includes(s),
    );
  }, [rows, debouncedSearch, activeTab]);

  /* ===== переходы ТОЛЬКО абсолютные ===== */
  const openCard = (row) => navigate(`${CARD_BASE}${row.id}`, { state: row });

  /* ======= CREATE ======= */
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDate, setAddDate] = useState(todayStr());
  const [addStatus, setAddStatus] = useState("");
  const [addLlc, setAddLlc] = useState("");
  const [addInn, setAddInn] = useState("");
  const [addOkpo, setAddOkpo] = useState("");
  const [addScore, setAddScore] = useState("");
  const [addBik, setAddBik] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [showAddExtra, setShowAddExtra] = useState(false);

  const canSaveAdd =
    String(addFullName).trim().length >= 1 &&
    String(addPhone).trim().length >= 1 &&
    !addSaving;

  const resetAddForm = () => {
    setAddFullName("");
    setAddPhone("");
    setAddEmail("");
    setAddDate(todayStr());
    setAddStatus("");
    setAddLlc("");
    setAddInn("");
    setAddOkpo("");
    setAddScore("");
    setAddBik("");
    setAddAddress("");
    setAddErr("");
    setShowAddExtra(false);
  };

  const createRowApi = async ({
    full_name,
    phone,
    email,
    date,
    status,
    llc,
    inn,
    okpo,
    score,
    bik,
    address,
  }: any) => {
    const variants = TYPE_VARIANTS_BY_TAB[activeTab] || [];
    const preferredFirst = acceptedTypeByTab[activeTab]
      ? [
          acceptedTypeByTab[activeTab],
          ...variants.filter((v: any) => v !== acceptedTypeByTab[activeTab]),
        ]
      : variants;

    const tryList = preferredFirst.length
      ? preferredFirst
      : [PRIMARY_TYPE_BY_TAB[activeTab]].filter(Boolean);

    let lastErr: any = null;

    for (const variant of tryList) {
      const payload: any = {
        type: variant,
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
      };
      if (email) payload.email = String(email).trim();
      if (date) payload.date = date;
      if (status) payload.status = String(status).trim();
      if (llc) payload.llc = String(llc).trim();
      if (inn) payload.inn = String(inn).trim();
      if (okpo) payload.okpo = String(okpo).trim();
      if (score) payload.score = String(score).trim();
      if (bik) payload.bik = String(bik).trim();
      if (address) payload.address = String(address).trim();

      try {
        const res = await api.post("/main/clients/", payload);
        setAcceptedTypeByTab((prev) => ({ ...prev, [activeTab]: variant }));
        const data = res?.data || payload;
        if (!data.type) data.type = variant;
        return data;
      } catch (e: any) {
        if (isInvalidChoiceError(e)) {
          lastErr = e;
          continue;
        }
        throw e;
      }
    }

    if (lastErr) throw lastErr;

    const fallbackPayload = {
      full_name: String(full_name || "").trim(),
      phone: String(phone || "").trim(),
      ...(email ? { email: String(email).trim() } : {}),
      ...(date ? { date } : {}),
      ...(status ? { status: String(status).trim() } : {}),
      ...(llc ? { llc: String(llc).trim() } : {}),
      ...(inn ? { inn: String(inn).trim() } : {}),
      ...(okpo ? { okpo: String(okpo).trim() } : {}),
      ...(score ? { score: String(score).trim() } : {}),
      ...(bik ? { bik: String(bik).trim() } : {}),
      ...(address ? { address: String(address).trim() } : {}),
    };
    const res = await api.post("/main/clients/", fallbackPayload);
    return res?.data || fallbackPayload;
  };

  const handleAddSave = async () => {
    if (!canSaveAdd) return;
    try {
      setAddSaving(true);
      setAddErr("");
      const created = await createRowApi({
        full_name: addFullName,
        phone: addPhone,
        email: addEmail,
        date: addDate,
        status: addStatus,
        llc: addLlc,
        inn: addInn,
        okpo: addOkpo,
        score: addScore,
        bik: addBik,
        address: addAddress,
      });
      if (created?.id) navigate(`${CARD_BASE}${created.id}`); // абсолютный путь
      setRows((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setIsAddOpen(false);
      resetAddForm();
    } catch (e: any) {
      console.error(e);
      setAddErr(msgFromError(e, t("crm.clients.addError")));
    } finally {
      setAddSaving(false);
    }
  };

  const handleAddCancel = () => {
    setIsAddOpen(false);
    resetAddForm();
  };

  const resellersTabLabel = isConstruction
    ? t("crm.clients.tabs.contractors")
    : t("crm.clients.tabs.resellers");

  const createEntityTitle =
    activeTab === "clients"
      ? t("crm.clients.newClient").replace(/^\+ /, "")
      : activeTab === "suppliers"
        ? t("crm.clients.newSupplier")
        : isConstruction
          ? t("crm.clients.newContractor")
          : t("crm.clients.newReseller");

  const createEntityHint =
    activeTab === "clients"
      ? t("crm.clients.createHint.client")
      : activeTab === "suppliers"
        ? t("crm.clients.createHint.supplier")
        : isConstruction
          ? t("crm.clients.createHint.contractor")
          : t("crm.clients.createHint.reseller");

  const title =
    activeTab === "clients"
      ? t("crm.clients.pageTitle")
      : activeTab === "suppliers"
        ? t("crm.clients.suppliers")
        : activeTab === "resellers"
          ? resellersTabLabel
          : activeTab === "clientsBooking"
            ? t("crm.clients.tabs.booking")
            : activeTab === "debtors"
              ? t("crm.clients.tabs.debtors")
              : t("crm.clients.pageTitle");

  // ───────────────────────── clientsBooking рендерит HostelClients
  if (!forcedTab && activeTab === "clientsBooking") {
    return (
      <section className="clients" style={{ display: "block" }}>
        <nav className="tabs" aria-label={t("crm.clients.tabs.sections")}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${activeTab === t.key ? "tabActive" : ""}`}
              onClick={() => setActiveTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>

        <header className="header">
          <div>
            <h2 className="title">
              <GlossaryText>{title}</GlossaryText>
            </h2>
            <p className="subtitle">
              <GlossaryText>{t("crm.clients.bookingSubtitle")}</GlossaryText>
            </p>
          </div>
        </header>

        <Suspense fallback={<div className="loading">{t("common.loading")}</div>}>
          <HostelClients />
        </Suspense>
      </section>
    );
  }

  // ───────────────────────── остальные вкладки
  const createLabel =
    activeTab === "clients"
      ? t("crm.clients.newClient").replace(/^\+ /, "")
      : activeTab === "suppliers"
        ? t("crm.clients.newSupplier")
        : isConstruction
          ? t("crm.clients.newContractor")
          : t("crm.clients.newReseller");

  return (
    <PageShell className="clients-page">
      {!hideTabs && (
        <nav className="clients-tabs" aria-label={t("crm.clients.tabs.sections")}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`clients-tabs__tab ${
                activeTab === t.key ? "clients-tabs__tab--active" : ""
              }`}
              onClick={() => setActiveTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <PageHeader
        title={<GlossaryText>{title}</GlossaryText>}
        subtitle={
          <GlossaryText>
            {t("crm.clients.subtitleList", { entity: title.toLowerCase() })}
          </GlossaryText>
        }
        actions={
          activeTab !== "debtors" ? (
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => setIsAddOpen(true)}
              title={createLabel}
              aria-label={createLabel}
            >
              <Plus size={16} />
              <span className="nur-btn__label">{createLabel}</span>
            </button>
          ) : null
        }
      />

      <FilterBar className="clients-page__toolbar">
        <div className="clients-search">
          <Search className="clients-search__icon" size={18} />
          <input
            type="text"
            className="nur-input clients-search__input"
            placeholder={t("crm.clients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <StatusChip>
          {t("crm.clients.total")}: {rows.length} · {t("crm.clients.found")}:{" "}
          {filtered.length}
        </StatusChip>

        <div className="clients-search__view-toggle">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`nur-btn nur-btn--sm ${
              viewMode === "table" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
          >
            <Table2 size={16} />
            {t("crm.clients.table")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`nur-btn nur-btn--sm ${
              viewMode === "cards" ? "nur-btn--primary" : "nur-btn--secondary"
            }`}
          >
            <LayoutGrid size={16} />
            {t("crm.clients.cards")}
          </button>
        </div>
      </FilterBar>

      {error && <div className="clients-error">{error}</div>}

      <PagePanel flush>
        <div className="clients-table-container">
          {viewMode === "table" && (
            <div className="nur-table-wrap">
              <table className="nur-table clients-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>{t("crm.clients.fullName")}</th>
                    <th>{t("crm.clients.phone")}</th>
                    <th>{t("crm.clients.type")}</th>
                    <th>{t("crm.clients.date")}</th>
                    <th>{t("crm.clients.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="clients-table__loading">
                        {t("crm.clients.loading")}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="clients-table__empty">
                        {search ? t("crm.clients.nothingFound") : t("crm.clients.noData")}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, index) => (
                      <tr
                        key={c.id}
                        className="clients-table__row"
                        onClick={() => openCard(c)}
                      >
                        <td data-label="№">{index + 1}</td>
                        <td data-label={t("crm.clients.fullName")} className="clients-table__name">
                          {c.full_name || c.fio || "—"}
                        </td>
                        <td data-label={t("crm.clients.phone")}>{c.phone || "—"}</td>
                        <td data-label={t("crm.clients.type")}>{ctxTypeLabel(c.type)}</td>
                        <td data-label={t("crm.clients.date")}>{c.date || "—"}</td>
                        <td
                          data-label={t("crm.clients.actions")}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`${CARD_BASE}${c.id}`}
                            state={c}
                            className="clients-table__link"
                          >
                            {t("crm.clients.open")}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards View */}
          {viewMode === "cards" && (
            <div className="block">
              {loading ? (
                <div
                  className="clients-table__loading rounded-2xl p-6 text-center"
                  style={{
                    border: "1px solid var(--nur-border)",
                    background: "var(--nur-surface)",
                    color: "var(--nur-muted)",
                  }}
                >
                  Загрузка...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="clients-table__empty rounded-2xl p-6 text-center"
                  style={{
                    border: "1px solid var(--nur-border)",
                    background: "var(--nur-surface)",
                    color: "var(--nur-muted)",
                  }}
                >
                  {debouncedSearch ? t("crm.clients.nothingFound") : t("crm.clients.noData")}
                </div>
              ) : (
                <div className="clients-cards grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((c, index) => (
                    <div
                      key={c.id}
                      className="clients-card"
                      onClick={() => openCard(c)}
                    >
                      <div className="clients-card__field">
                        <span className="clients-card__label">№</span>
                        <span className="clients-card__value">{index + 1}</span>
                      </div>
                      <div className="clients-card__field">
                        <span className="clients-card__label">{t("crm.clients.fullName")}</span>
                        <span className="clients-card__value">
                          {c.full_name || c.fio || "—"}
                        </span>
                      </div>
                      <div className="clients-card__field">
                        <span className="clients-card__label">{t("crm.clients.phone")}</span>
                        <span className="clients-card__value">
                          {c.phone || "—"}
                        </span>
                      </div>
                      <div className="clients-card__field">
                        <span className="clients-card__label">{t("crm.clients.type")}</span>
                        <span className="clients-card__value">
                          {ctxTypeLabel(c.type)}
                        </span>
                      </div>
                      <div className="clients-card__field">
                        <span className="clients-card__label">{t("crm.clients.date")}</span>
                        <span className="clients-card__value">
                          {c.date || "—"}
                        </span>
                      </div>
                      <div className="clients-card__actions">
                        <Link
                          to={`${CARD_BASE}${c.id}`}
                          state={c}
                          onClick={(e) => e.stopPropagation()}
                          className="clients-card__link"
                        >
                          Открыть
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PagePanel>

      <Modal
        open={isAddOpen}
        onClose={handleAddCancel}
        title={createEntityTitle}
        className="clientCreateModal"
        contentClassName="clientCreateModal__content"
        wrapperId="client-create-modal"
      >
        <div className="clientCreateModal__body">
          <p className="clientCreateModal__lead">{createEntityHint}</p>

          {addErr && (
            <div className="clientCreateModal__error" role="alert">
              {addErr}
            </div>
          )}

          <section
            className="clientCreateModal__section"
            aria-labelledby="client-create-main-title"
          >
            <div className="clientCreateModal__sectionHead">
              <h4
                id="client-create-main-title"
                className="clientCreateModal__sectionTitle"
              >
                {t("crm.clients.form.mainInfo")}
              </h4>
              <span className="clientCreateModal__requiredHint">
                {t("crm.clients.form.requiredFields")}
              </span>
            </div>

            <div className="clientCreateModal__grid clientCreateModal__grid--main">
              <label className="clientCreateModal__field clientCreateModal__field--required">
                <span className="clientCreateModal__label">
                  {t("crm.clients.form.fullNameOrCompany")}
                </span>
                <input
                  type="text"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder={t("crm.clients.form.fullNamePlaceholder")}
                  autoFocus
                />
              </label>

              <label className="clientCreateModal__field clientCreateModal__field--required">
                <span className="clientCreateModal__label">{t("crm.clients.phone")}</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+996 700 00-00-00"
                />
                <span className="clientCreateModal__hint">
                  {t("crm.clients.form.phoneHint")}
                </span>
              </label>

              <label className="clientCreateModal__field">
                <span className="clientCreateModal__label">Email</span>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@mail.com"
                />
              </label>

              <label className="clientCreateModal__field">
                <span className="clientCreateModal__label">
                  {t("crm.clients.form.registrationDate")}
                </span>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </label>
            </div>
          </section>

          <button
            type="button"
            className={`clientCreateModal__toggle${showAddExtra ? " clientCreateModal__toggle--open" : ""}`}
            onClick={() => setShowAddExtra((prev) => !prev)}
            aria-expanded={showAddExtra}
            aria-controls="client-create-extra-fields"
          >
            <span>
              {t("crm.clients.form.extraToggle")}
              <small>{t("crm.clients.form.optional")}</small>
            </span>
            <ChevronDown size={18} aria-hidden />
          </button>

          {showAddExtra && (
            <section
              id="client-create-extra-fields"
              className="clientCreateModal__section clientCreateModal__section--extra"
              aria-labelledby="client-create-extra-title"
            >
              <h4
                id="client-create-extra-title"
                className="clientCreateModal__sectionTitle"
              >
                {t("crm.clients.form.extraTitle")}
              </h4>

              <div className="clientCreateModal__grid">
                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">
                    {t("crm.clients.form.llc")}
                  </span>
                  <input
                    type="text"
                    value={addLlc}
                    onChange={(e) => setAddLlc(e.target.value)}
                    placeholder={t("crm.clients.form.llcPlaceholder")}
                  />
                </label>

                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">{t("crm.clients.form.inn")}</span>
                  <input
                    type="text"
                    value={addInn}
                    onChange={(e) => setAddInn(e.target.value)}
                    placeholder="12345678901234"
                  />
                </label>

                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">{t("crm.clients.form.okpo")}</span>
                  <input
                    type="text"
                    value={addOkpo}
                    onChange={(e) => setAddOkpo(e.target.value)}
                    placeholder="12345678"
                  />
                </label>

                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">{t("crm.clients.form.status")}</span>
                  <input
                    type="text"
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    placeholder={t("crm.clients.form.statusPlaceholder")}
                  />
                </label>

                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">
                    {t("crm.clients.form.account")}
                  </span>
                  <input
                    type="text"
                    value={addScore}
                    onChange={(e) => setAddScore(e.target.value)}
                    placeholder="12345678901234567890"
                  />
                </label>

                <label className="clientCreateModal__field">
                  <span className="clientCreateModal__label">{t("crm.clients.form.bik")}</span>
                  <input
                    type="text"
                    value={addBik}
                    onChange={(e) => setAddBik(e.target.value)}
                    placeholder="123456"
                  />
                </label>

                <label className="clientCreateModal__field clientCreateModal__field--wide">
                  <span className="clientCreateModal__label">{t("crm.clients.form.address")}</span>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder={t("crm.clients.form.addressPlaceholder")}
                  />
                </label>
              </div>
            </section>
          )}

          <div className="clientCreateModal__actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={handleAddCancel}
              disabled={addSaving}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={handleAddSave}
              disabled={!canSaveAdd}
              title={!canSaveAdd ? t("crm.clients.form.fillNamePhone") : ""}
            >
              {addSaving ? t("common.saving") : t("common.create")}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
