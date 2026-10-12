import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaCalendarAlt,
  FaExchangeAlt,
} from "react-icons/fa";
import {
  fetchBranchesAsync,
  createBranchAsync,
  updateBranchAsync,
  deleteBranchAsync,
  toggleBranchActiveAsync,
  fetchBranchUsage,
  describeBranchUsage,
} from "@entities/branch";
import { clearErrors } from "@entities/branch";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import "./Branch.scss";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useConfirm } from "@shared/hooks/useDialog";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
  StatusChip,
} from "@shared/ui/page-shell";

// Список популярных часовых поясов
const TIMEZONES = [
  { value: "Asia/Bishkek", labelKey: "crm.branches.list.timezones.asiaBishkek" },
  { value: "Asia/Almaty", labelKey: "crm.branches.list.timezones.asiaAlmaty" },
  { value: "Asia/Tashkent", labelKey: "crm.branches.list.timezones.asiaTashkent" },
  { value: "Europe/Moscow", labelKey: "crm.branches.list.timezones.europeMoscow" },
  { value: "Asia/Dubai", labelKey: "crm.branches.list.timezones.asiaDubai" },
  { value: "UTC", labelKey: "crm.branches.list.timezones.utc" },
];

const Branch = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();
  const {
    list: branches,
    loading,
    error,
    creating,
    updating,
    deleting,
    toggling,
    createError,
    updateError,
    deleteError,
    toggleError,
  } = useSelector((state: any) => state.branches);

  const confirm = useConfirm();

  // Поиск
  const [query, setQuery] = useState("");

  // Модалка формы
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [formError, setFormError] = useState("");

  // Модалка детального просмотра
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBranch, _setSelectedBranch] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    timezone: "Asia/Bishkek",
    is_active: true,
  });

  // AlertModal состояние
  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  // Предыдущие состояния для отслеживания изменений
  const [prevCreating, setPrevCreating] = useState(false);
  const [prevUpdating, setPrevUpdating] = useState(false);
  const [prevDeleting, setPrevDeleting] = useState(false);
  const [prevToggling, setPrevToggling] = useState(false);
  const [prevCreateError, setPrevCreateError] = useState<any>(null);
  const [prevUpdateError, setPrevUpdateError] = useState<any>(null);
  const [prevDeleteError, setPrevDeleteError] = useState<any>(null);
  const [prevToggleError, setPrevToggleError] = useState<any>(null);

  // Загрузка филиалов
  useEffect(() => {
    dispatch(fetchBranchesAsync(undefined as any));
  }, [dispatch]);

  // Отслеживание успешного создания
  useEffect(() => {
    if (prevCreating && !creating && !createError) {
      setAlertModal({
        open: true,
        type: "success",
        title: t("crm.branches.list.alerts.successTitle"),
        message: t("crm.branches.list.alerts.created"),
      });
      // Закрываем форму после успешного создания
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        timezone: "Asia/Bishkek",
        is_active: true,
      });
      setFormError("");
      dispatch(clearErrors());
    }
    setPrevCreating(creating);
  }, [creating, createError, prevCreating, dispatch]);

  // Отслеживание успешного обновления
  useEffect(() => {
    if (prevUpdating && !updating && !updateError) {
      setAlertModal({
        open: true,
        type: "success",
        title: t("crm.branches.list.alerts.successTitle"),
        message: t("crm.branches.list.alerts.updated"),
      });
      // Закрываем форму после успешного обновления
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        timezone: "Asia/Bishkek",
        is_active: true,
      });
      setFormError("");
      dispatch(clearErrors());
    }
    setPrevUpdating(updating);
  }, [updating, updateError, prevUpdating, dispatch]);

  // Отслеживание успешного удаления
  useEffect(() => {
    if (prevDeleting && !deleting && !deleteError) {
      setAlertModal({
        open: true,
        type: "success",
        title: t("crm.branches.list.alerts.successTitle"),
        message: t("crm.branches.list.alerts.deleted"),
      });
    }
    setPrevDeleting(deleting);
  }, [deleting, deleteError, prevDeleting]);

  // Отслеживание успешного переключения статуса
  useEffect(() => {
    if (prevToggling && !toggling && !toggleError) {
      setAlertModal({
        open: true,
        type: "success",
        title: t("crm.branches.list.alerts.successTitle"),
        message: t("crm.branches.list.alerts.toggled"),
      });
    }
    setPrevToggling(toggling);
  }, [toggling, toggleError, prevToggling]);

  // Отслеживание ошибок создания
  useEffect(() => {
    if (createError && createError !== prevCreateError) {
      const errorMessage = validateResErrors(createError, t("crm.branches.list.alerts.createError"))
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: errorMessage,
      });
    }
    setPrevCreateError(createError);
  }, [createError, prevCreateError]);

  // Отслеживание ошибок обновления
  useEffect(() => {
    if (updateError && updateError !== prevUpdateError) {
      const errorMessage = validateResErrors(updateError, t("crm.branches.list.alerts.updateError"))
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: errorMessage,
      });
    }
    setPrevUpdateError(updateError);
  }, [updateError, prevUpdateError]);

  // Отслеживание ошибок удаления
  useEffect(() => {
    if (deleteError && deleteError !== prevDeleteError) {
      const errorMessage = validateResErrors(deleteError, t("crm.branches.list.alerts.deleteError"))
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: errorMessage,
      });
    }
    setPrevDeleteError(deleteError);
  }, [deleteError, prevDeleteError]);

  // Отслеживание ошибок переключения статуса
  useEffect(() => {
    if (toggleError && toggleError !== prevToggleError) {
      const errorMessage = validateResErrors(toggleError, t("crm.branches.list.alerts.toggleError"))
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: errorMessage,
      });
    }
    setPrevToggleError(toggleError);
  }, [toggleError, prevToggleError]);

  // Поиск
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    // String(): сервер может прислать телефон/код числом — .toLowerCase у числа ронял страницу
    const low = (v: any) => String(v ?? "").toLowerCase();
    return branches.filter((b) => {
      if (!b) return false;
      const name = low(b.name);
      const code = low(b.code);
      const address = low(b.address);
      const phone = low(b.phone);
      const email = low(b.email);
      return (
        name.includes(q) ||
        code.includes(q) ||
        address.includes(q) ||
        phone.includes(q) ||
        email.includes(q)
      );
    });
  }, [branches, query]);

  // CRUD операции
  const openCreate = () => {
    // Проверка на максимальное количество филиалов
    if (branches.length >= 3) {
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: t("crm.branches.list.alerts.maxBranches"),
      });
      return;
    }
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      timezone: "Asia/Bishkek",
      is_active: true,
    });
    setModalOpen(true);
  };


  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      timezone: branch.timezone || "Asia/Bishkek",
      is_active: branch.is_active !== undefined ? branch.is_active : true,
    });
    setModalOpen(true);
  };

  // Escape закрывает форму (кроме момента сохранения и когда поверх открыто окно сообщения)
  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || creating || updating) return;
      if (document.querySelector('[role="dialog"]')) return;
      closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const closeModal = () => {
    setModalOpen(false);
    setForm({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      timezone: "Asia/Bishkek",
      is_active: true,
    });
    setFormError("");
    dispatch(clearErrors());
  };

  const saveBranch = async (e) => {
    e.preventDefault();
    if (creating || updating) return;

    // Валидация code (slug pattern)
    const codeValue = (form.code || "").trim();
    if (codeValue && !/^[-a-zA-Z0-9_]+$/.test(codeValue)) {
      setFormError(
        t("crm.branches.list.validation.codeInvalid")
      );
      return;
    }

    const payload = {
      name: (form.name || "").trim(),
      code: codeValue || null,
      address: (form.address || "").trim() || null,
      phone: (form.phone || "").trim() || null,
      email: (form.email || "").trim() || null,
      timezone: (form.timezone || "").trim(),
      is_active: form.is_active,
    };

    if (!payload.name || payload.name.length < 1) {
      setFormError(t("crm.branches.list.validation.nameRequired"));
      return;
    }

    if (payload.name.length > 128) {
      setFormError(t("crm.branches.list.validation.nameTooLong"));
      return;
    }

    if (!payload.timezone || payload.timezone.length < 1) {
      setFormError(t("crm.branches.list.validation.timezoneRequired"));
      return;
    }

    setFormError("");
    dispatch(clearErrors());

    try {
      if (editingId == null) {
        // Создание
        await dispatch(createBranchAsync(payload));
        // AlertModal и закрытие формы произойдут автоматически через useEffect
      } else {
        // Обновление
        await dispatch(
          updateBranchAsync({ branchId: editingId, updatedData: payload })
        );
        // AlertModal и закрытие формы произойдут автоматически через useEffect
      }
    } catch (err: any) {
      console.error("Ошибка сохранения филиала:", err);
      const errorMessage = validateResErrors(err, t("crm.branches.list.alerts.saveError"))
      setFormError(errorMessage);
    }
  };

  // Филиалы, у которых сейчас меняется статус: кнопка заблокирована, повторные клики
  // игнорируются (раньше тройной клик отправлял три PATCH)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());
  const togglingRef = useRef<Set<string>>(new Set());

  const toggleActive = async (branch) => {
    const key = String(branch.id);
    if (togglingRef.current.has(key)) return;
    togglingRef.current.add(key);
    setTogglingIds(new Set(togglingRef.current));
    try {
      await dispatch(
        toggleBranchActiveAsync({
          branchId: branch.id,
          isActive: !branch.is_active,
        })
      ).unwrap();
    } catch (err: any) {
      console.error("Ошибка изменения статуса филиала:", err);
      const errorMessage = validateResErrors(err, t("crm.branches.list.alerts.toggleError"))
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.errorTitle"),
        message: errorMessage,
      });
    } finally {
      togglingRef.current.delete(key);
      setTogglingIds(new Set(togglingRef.current));
    }
  };

  const showError = (err: any, fallback: string) => {
    setAlertModal({
      open: true,
      type: "error",
      title: t("crm.branches.list.alerts.errorTitle"),
      message: validateResErrors(err, fallback),
    });
  };

  const handleDelete = async (id) => {
    const usage = await fetchBranchUsage(String(id));
    if (usage.openShifts) {
      setAlertModal({
        open: true,
        type: "error",
        title: t("crm.branches.list.alerts.deleteBlockedTitle"),
        message: t("crm.branches.list.alerts.openShifts", { openShifts: usage.openShifts }),
      });
      return;
    }
    const used = describeBranchUsage(usage);
    confirm(
      used
        ? t("crm.branches.list.confirm.deleteWithUsage", { used })
        : t("crm.branches.list.confirm.delete"),
      async (ok) => {
        if (!ok) return;
        try {
          // unwrap: без него rejected-экшен не бросает, и ошибка бэка терялась
          await dispatch(deleteBranchAsync(id)).unwrap();
        } catch (err: any) {
          console.error("Ошибка удаления филиала:", err);
          showError(err, t("crm.branches.list.alerts.deleteError"));
        }
      },
    );
  };

  return (
    <PageShell className="branch">
      <PageHeader
        title={t("crm.branches.list.header.title")}
        subtitle={t("crm.branches.list.header.subtitle")}
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/branch/transfers")}
              title={t("crm.branches.list.header.transfersTitle")}
            >
              <FaExchangeAlt />
              <span className="nur-btn__label">{t("crm.branches.list.header.transfers")}</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={openCreate}
              title={t("crm.branches.list.header.newBranch")}
              aria-label={t("crm.branches.list.header.newBranch")}
            >
              <FaPlus />
              <span className="nur-btn__label">{t("crm.branches.list.header.newBranch")}</span>
            </button>
          </>
        }
      />

      <FilterBar className="branch__toolbar">
        <div className="branch__search">
          <FaSearch className="branch__search-icon" />
          <input
            className="nur-input branch__search-input"
            placeholder={t("crm.branches.list.search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </FilterBar>

      {error && !loading && (
        <div className="branch__alert branch__alert--error" role="alert">
          {validateResErrors(error, t("crm.branches.list.alerts.loadError"))}
        </div>
      )}

      <PagePanel className="branch__list" flush>
        {loading && (
          <div className="branch__alert branch__alert--info">{t("crm.branches.list.loading")}</div>
        )}

        {!loading &&
          filtered.map((branch) => (
            <article key={branch.id} className="branch__card">
              <div className="branch__card-left">
                <div className="branch__avatar">
                  <FaBuilding />
                </div>
                <div className="branch__content">
                  <div className="branch__name-row">
                    <h3 className="branch__name">
                      {branch.name || t("crm.branches.list.card.noName")}
                    </h3>
                    <StatusChip tone={branch.is_active ? "success" : "default"}>
                      {branch.is_active ? (
                        <>
                          <FaCheckCircle /> {t("crm.branches.list.status.active")}
                        </>
                      ) : (
                        <>
                          <FaTimesCircle /> {t("crm.branches.list.status.inactive")}
                        </>
                      )}
                    </StatusChip>
                  </div>
                  <div className="branch__meta">
                    {branch.address && (
                      <span className="branch__muted">
                        <FaMapMarkerAlt />
                        &nbsp;{branch.address}
                      </span>
                    )}
                    {branch.phone && (
                      <span className="branch__muted">
                        <FaPhone />
                        &nbsp;{branch.phone}
                      </span>
                    )}
                    {branch.email && (
                      <span className="branch__muted">
                        <FaEnvelope />
                        &nbsp;{branch.email}
                      </span>
                    )}
                    {branch.timezone && (
                      <span className="branch__muted">
                        <FaClock />
                        &nbsp;{branch.timezone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="branch__rowActions">
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm"
                  onClick={() => navigate(`/crm/branch/${branch.id}`)}
                  title={t("crm.branches.list.card.viewTitle")}
                >
                  <FaEye /> {t("crm.branches.list.card.view")}
                </button>
                <button
                  type="button"
                  className={`nur-btn nur-btn--sm ${
                    branch.is_active ? "nur-btn--ghost" : "nur-btn--primary"
                  }`}
                  onClick={() => toggleActive(branch)}
                  disabled={togglingIds.has(String(branch.id))}
                  title={branch.is_active ? t("crm.branches.list.card.deactivate") : t("crm.branches.list.card.activate")}
                >
                  {branch.is_active ? (
                    <>
                      <FaTimesCircle /> {t("crm.branches.list.card.deactivate")}
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> {t("crm.branches.list.card.activate")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm"
                  onClick={() => openEdit(branch)}
                >
                  <FaEdit /> {t("crm.branches.list.card.edit")}
                </button>
                <button
                  type="button"
                  className="nur-btn nur-btn--danger nur-btn--sm"
                  onClick={() => handleDelete(branch.id)}
                >
                  <FaTrash /> {t("crm.branches.list.card.delete")}
                </button>
              </div>
            </article>
          ))}

        {/* При ошибке загрузки не показываем «Филиалы не найдены» — это не пустой список */}
        {!loading && !error && !filtered.length && branches.length === 0 && (
          <EmptyState
            title={t("crm.branches.list.empty.title")}
            text={t("crm.branches.list.empty.text")}
            action={
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={openCreate}
              >
                <FaPlus /> {t("crm.branches.list.header.newBranch")}
              </button>
            }
          />
        )}

        {!loading && !filtered.length && branches.length > 0 && (
          <EmptyState
            title={t("crm.branches.list.nothingFound.title")}
            text={t("crm.branches.list.nothingFound.text", { query })}
          />
        )}
      </PagePanel>

      {/* Модалка: создать/редактировать */}
      {modalOpen && (
        <ReactPortal wrapperId="branch-edit-modal">
          <div
            className="branch__modal-overlay"
            onClick={() => !(creating || updating) && closeModal()}
          >
            <div className="branch__modal" onClick={(e) => e.stopPropagation()}>
              <div className="branch__modal-header">
                <h3 className="branch__modal-title">
                  {editingId == null ? t("crm.branches.list.header.newBranch") : t("crm.branches.list.form.editTitle")}
                </h3>
                <button
                  className="branch__icon-btn"
                  onClick={closeModal}
                  disabled={creating || updating}
                >
                  <FaTimes />
                </button>
              </div>

              <form className="branch__form" onSubmit={saveBranch}>
                {(formError || createError || updateError) && (
                  // Общий разбор ошибок: ошибки полей DRF — текстом (раньше «[object Object]»),
                  // HTML-страница 502 — запасным текстом (раньше сырой HTML)
                  <div className="branch__alert branch__alert--error" role="alert">
                    {formError ||
                      validateResErrors(
                        createError || updateError,
                        createError
                          ? t("crm.branches.list.alerts.createError")
                          : t("crm.branches.list.alerts.updateError"),
                      )}
                  </div>
                )}

                <div className="branch__form-grid">
                  <div className="branch__field branch__field--full">
                    <label className="nur-label">
                      {t("crm.branches.list.form.nameLabel")}{" "}
                      <span className="branch__required">*</span>
                    </label>
                    <input
                      className="nur-input"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      minLength={1}
                      maxLength={128}
                      placeholder={t("crm.branches.list.form.namePlaceholder")}
                    />
                  </div>

                  <div className="branch__field">
                    <label className="nur-label">{t("crm.branches.list.form.codeLabel")}</label>
                    <input
                      className="nur-input"
                      value={form.code}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, code: e.target.value }))
                      }
                      maxLength={64}
                      pattern="^[-a-zA-Z0-9_]+$"
                      placeholder="spb, moscow, online"
                    />
                    <small className="branch__hint">
                      {t("crm.branches.list.form.codeHint")}
                    </small>
                  </div>

                  <div className="branch__field">
                    <label className="nur-label">
                      {t("crm.branches.list.form.timezoneLabel")} <span className="branch__required">*</span>
                    </label>
                    <select
                      className="nur-select"
                      value={form.timezone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, timezone: e.target.value }))
                      }
                      required
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {t(tz.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="branch__field branch__field--full">
                    <label className="nur-label">{t("crm.branches.list.form.addressLabel")}</label>
                    <input
                      className="nur-input"
                      value={form.address}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      maxLength={255}
                      placeholder={t("crm.branches.list.form.addressPlaceholder")}
                    />
                  </div>

                  <div className="branch__field">
                    <label className="nur-label">{t("crm.branches.list.form.phoneLabel")}</label>
                    <input
                      className="nur-input"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      maxLength={32}
                      placeholder="+996 XXX XXX XXX"
                    />
                  </div>

                  <div className="branch__field">
                    <label className="nur-label">{t("crm.branches.list.form.emailLabel")}</label>
                    <input
                      className="nur-input"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      maxLength={254}
                      placeholder="branch@example.com"
                    />
                  </div>

                  <div className="branch__field branch__field--full">
                    <label className="nur-label branch__label--checkbox">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            is_active: e.target.checked,
                          }))
                        }
                        className="branch__checkbox"
                      />
                      <span>{t("crm.branches.list.form.activeLabel")}</span>
                    </label>
                  </div>
                </div>

                <div className="branch__form-actions">
                  <button
                    type="button"
                    className="nur-btn nur-btn--ghost"
                    onClick={closeModal}
                    disabled={creating || updating}
                  >
                    {t("crm.branches.list.form.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="nur-btn nur-btn--primary"
                    disabled={creating || updating}
                  >
                    {creating || updating
                      ? t("crm.branches.list.form.saving")
                      : editingId == null
                        ? t("crm.branches.list.form.create")
                        : t("crm.branches.list.form.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ReactPortal>
      )}

      {/* Модалка детального просмотра */}
      {detailModalOpen && selectedBranch && (
        <ReactPortal wrapperId="branch-detail-modal">
          <div
            className="branch__modal-overlay"
            onClick={() => setDetailModalOpen(false)}
          >
            <div
              className="branch__modal branch__modal--detail"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="branch__modal-header">
              <h3 className="branch__modal-title">{t("crm.branches.list.detail.title")}</h3>
              <button
                className="branch__icon-btn"
                onClick={() => setDetailModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="branch__detail-content">
              <div className="branch__detail-section">
                <div className="branch__detail-item">
                  <span className="branch__detail-label">{t("crm.branches.list.detail.name")}</span>
                  <span className="branch__detail-value">
                    {selectedBranch.name || "—"}
                  </span>
                </div>

                <div className="branch__detail-item">
                  <span className="branch__detail-label">{t("crm.branches.list.detail.status")}</span>
                  <span
                    className={`branch__status branch__status--${selectedBranch.is_active ? "active" : "inactive"
                      }`}
                  >
                    {selectedBranch.is_active ? (
                      <>
                        <FaCheckCircle /> {t("crm.branches.list.status.active")}
                      </>
                    ) : (
                      <>
                        <FaTimesCircle /> {t("crm.branches.list.status.inactive")}
                      </>
                    )}
                  </span>
                </div>

                {selectedBranch.address && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaMapMarkerAlt /> {t("crm.branches.list.detail.address")}
                    </span>
                    <span className="branch__detail-value">
                      {selectedBranch.address}
                    </span>
                  </div>
                )}

                {selectedBranch.phone && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaPhone /> {t("crm.branches.list.detail.phone")}
                    </span>
                    <span className="branch__detail-value">
                      {selectedBranch.phone}
                    </span>
                  </div>
                )}

                {selectedBranch.email && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaEnvelope /> {t("crm.branches.list.detail.email")}
                    </span>
                    <span className="branch__detail-value">
                      {selectedBranch.email}
                    </span>
                  </div>
                )}

                {selectedBranch.timezone && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaClock /> {t("crm.branches.list.detail.timezone")}
                    </span>
                    <span className="branch__detail-value">
                      {selectedBranch.timezone}
                    </span>
                  </div>
                )}

                {selectedBranch.created_at && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaCalendarAlt /> {t("crm.branches.list.detail.createdAt")}
                    </span>
                    <span className="branch__detail-value">
                      {new Date(selectedBranch.created_at).toLocaleString(
                        "ru-RU",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                )}

                {selectedBranch.updated_at && (
                  <div className="branch__detail-item">
                    <span className="branch__detail-label">
                      <FaCalendarAlt /> {t("crm.branches.list.detail.updatedAt")}
                    </span>
                    <span className="branch__detail-value">
                      {new Date(selectedBranch.updated_at).toLocaleString(
                        "ru-RU",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="branch__form-actions">
              <button
                type="button"
                className="nur-btn nur-btn--ghost"
                onClick={() => setDetailModalOpen(false)}
              >
                {t("crm.branches.list.detail.close")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={() => {
                  setDetailModalOpen(false);
                  openEdit(selectedBranch);
                }}
              >
                <FaEdit /> {t("crm.branches.list.detail.edit")}
              </button>
            </div>
          </div>
          </div>
        </ReactPortal>
      )}

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
        onConfirm={undefined as any}
      />
    </PageShell>
  );
};

export default Branch;
