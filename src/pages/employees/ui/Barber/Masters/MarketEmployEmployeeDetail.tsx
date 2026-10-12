import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaCalculator,
  FaChartLine,
  FaCog,
  FaEdit,
  FaInfoCircle,
  FaLock,
} from "react-icons/fa";
import api from "@shared/api";
import { useUser } from "@entities/user";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { convertEmployeeAccessesToLabels } from "./employeeAccessLabels";
import EmployeeAccessModal from "./modals/EmployeeAccessModal";
import EmployeeEditModal from "./modals/EmployeeEditModal";
import MarketSaleEmployeePayProfileModal from "./modals/MarketSaleEmployeePayProfileModal";
import {
  isSaleEmployeePayrollSector,
  salePayrollSectorEmoji,
} from "./saleEmployeePayroll";
import { RoleSelect } from "./RoleSelect";
import "./Masters.scss";
import { employeeBranchIds } from "./masters.utils";
import { getProfileBranchId } from "@shared/lib/tools/branchContext";

const EMPLOYEES_LIST_URL = "/users/employees/";
const EMPLOYEE_ITEM_URL = (id: any) => `/users/employees/${id}/`;
const ROLES_LIST_URL = "/users/roles/";

const SYSTEM_ROLES = ["owner", "admin"];
const asArray = (d: any) =>
  Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];

const normalizeEmail = (s: any) =>
  String(s || "")
    .trim()
    .toLowerCase();
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmployee = (e: any = {}) => ({
  id: e.id,
  email: e.email ?? "",
  first_name: e.first_name ?? "",
  last_name: e.last_name ?? "",
  role: e.role ?? null,
  custom_role: e.custom_role ?? null,
  role_display: e.role_display ?? "",
  branches: Array.isArray(e.branches) ? e.branches : e.branch ? [e.branch] : [],
  branch: e.branch ?? null,
  track_number: e.track_number ?? "",
  phone_number: e.phone_number ?? "",
});

const fullName = (e: any) =>
  [e?.last_name || "", e?.first_name || ""].filter(Boolean).join(" ").trim();

const sysRoleLabel = (c: any, t: any) =>
  c === "owner"
    ? t("crm.employees.owner")
    : c === "admin"
      ? t("crm.employees.admin")
      : c || "";

const sysCodeFromName = (n: any) => {
  const l = String(n || "")
    .trim()
    .toLowerCase();
  if (["admin", "administrator", "админ", "администратор"].includes(l))
    return "admin";
  if (["owner", "владелец"].includes(l)) return "owner";
  return null;
};

// Как в списке: общий разбор ошибок (без сырого HTML, с ошибками полей DRF)
const pickApiError = (e: any, fb: any) => validateResErrors(e, fb);

const emptyEmp = {
  email: "",
  first_name: "",
  last_name: "",
  roleChoice: "",
  track_number: "",
  phone_number: "",
  branch: "",
  branches: [] as string[],
};

const fmtMoney = (n: any) =>
  Number(n || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Дата YYYY-MM-DD по МЕСТНОМУ времени. toISOString() переводит в UTC, и в UTC+6
 * (Бишкек) полночь 1-го числа превращалась в последнее число прошлого месяца —
 * пресеты периода сдвигались на день (01.10 → 30.09).
 */
const toLocalISODate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatPeriod = (from: any, to: any) => {
  const opts: any = { day: "numeric", month: "long", year: "numeric" };
  // new Date("garbage") не бросает исключение — проверяем дату явно, иначе «Invalid Date»
  const fmt = (v: any) => {
    const d = v ? new Date(`${v}T12:00:00`) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("ru-RU", opts) : "—";
  };
  return `${fmt(from)} — ${fmt(to)}`;
};

const monthRange = (year: any, month: any) => {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: toLocalISODate(from),
    to: toLocalISODate(to),
  };
};

const MarketEmployEmployeeDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tm = (k: string, o?: any): string =>
    t(`crm.employees.marketDetail.${k}`, o) as string;
  const { company, tariff, profile } = useUser();

  const profileScopeLabel = (scope: any) =>
    scope === "branch"
      ? tm("profileScopeBranch")
      : scope === "global"
        ? tm("profileScopeGlobal")
        : scope;

  const [employee, setEmployee] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessEmployee, setAccessEmployee] = useState<any>(null);
  const [accessLabels, setAccessLabels] = useState<any[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessErr, setAccessErr] = useState("");
  const [empAlerts, setEmpAlerts] = useState<any[]>([]);
  const [empFieldErrors, setEmpFieldErrors] = useState<any>({});
  const [empForm, setEmpForm] = useState<any>(emptyEmp);
  const [editingEmpId, setEditingEmpId] = useState<any>(null);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalISODate(d);
  });
  const [dateTo, setDateTo] = useState(() => toLocalISODate(new Date()));
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryRows, setSalaryRows] = useState<any[]>([]);
  const [salaryError, setSalaryError] = useState("");
  const [empAnalyticsLoading, setEmpAnalyticsLoading] = useState(false);
  const [empAnalyticsError, setEmpAnalyticsError] = useState("");
  const [empSalesPayload, setEmpSalesPayload] = useState<any>(null);
  const [empShiftsPayload, setEmpShiftsPayload] = useState<any>(null);
  const [activePanel, setActivePanel] = useState("payroll");

  const sectorName = String(company?.sector?.name || "").trim();
  const isSalePayroll = isSaleEmployeePayrollSector(sectorName);
  const payrollEmoji = salePayrollSectorEmoji(sectorName);

  const showBranchSelect = useMemo(() => {
    const tariffLower = String(tariff || "").toLowerCase();
    return tariffLower !== "старт" && tariffLower !== "start";
  }, [tariff]);

  const roleById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const roleOptions = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      key: `sys:${code}`,
      label: sysRoleLabel(code, t),
    }));
    const cus = roles
      .filter((r) => !sysCodeFromName(r.name))
      .map((r) => ({ key: `cus:${r.id}`, label: String(r.name || "").trim() }));
    return [...sys, ...cus].sort((a, b) =>
      a.label.localeCompare(b.label, "ru"),
    );
  }, [roles, t]);

  const reload = useCallback(async () => {
    if (!employeeId) return;
    setLoadErr("");
    try {
      const [empRes, listRes, rolesRes, brRes] = await Promise.all([
        api.get(EMPLOYEE_ITEM_URL(employeeId)),
        api.get(EMPLOYEES_LIST_URL),
        api.get(ROLES_LIST_URL),
        api.get("/users/branches/").catch(() => ({ data: [] })),
      ]);
      setEmployee(empRes.data);
      setAllEmployees(asArray(listRes.data).map(normalizeEmployee));
      setRoles(
        asArray(rolesRes.data).map((r: any) => ({
          id: r.id,
          name: r.name || "",
        })),
      );
      setBranches(asArray(brRes.data));
    } catch (e: any) {
      setLoadErr(validateResErrors(e, tm("loadError")));
      setEmployee(null);
    }
  }, [employeeId, t]);

  const fetchSalary = useCallback(async () => {
    if (!employeeId || !isSalePayroll) return;
    setSalaryLoading(true);
    setSalaryError("");
    try {
      const params: any = {
        tab: "salary",
        period_start: dateFrom,
        period_end: dateTo,
      };
      const branch = getProfileBranchId(profile);
      if (branch) params.branch = String(branch);
      const { data } = await api.get("/main/analytics/market/", { params });
      const rows = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.tables?.rows)
          ? data.tables.rows
          : [];
      setSalaryRows(
        rows.filter((r: any) => String(r.user_id) === String(employeeId)),
      );
    } catch (e: any) {
      setSalaryError(validateResErrors(e, tm("salaryLoadError")));
      setSalaryRows([]);
    } finally {
      setSalaryLoading(false);
    }
  }, [
    employeeId,
    isSalePayroll,
    dateFrom,
    dateTo,
    profile,
    t,
  ]);

  const fetchEmployeeMarketAnalytics = useCallback(async () => {
    if (!employeeId || !isSalePayroll) return;
    setEmpAnalyticsLoading(true);
    setEmpAnalyticsError("");
    try {
      const common: any = {
        period_start: dateFrom,
        period_end: dateTo,
      };
      const branch = getProfileBranchId(profile);
      if (branch) common.branch = String(branch);
      const [salesRes, shiftsRes] = await Promise.all([
        api.get("/main/analytics/market/", {
          params: { ...common, tab: "sales", cashier: String(employeeId) },
        }),
        api.get("/main/analytics/market/", {
          params: { ...common, tab: "shifts", cashier: String(employeeId) },
        }),
      ]);
      setEmpSalesPayload(salesRes?.data || null);
      setEmpShiftsPayload(shiftsRes?.data || null);
    } catch (e: any) {
      setEmpAnalyticsError(validateResErrors(e, tm("salesLoadError")));
      setEmpSalesPayload(null);
      setEmpShiftsPayload(null);
    } finally {
      setEmpAnalyticsLoading(false);
    }
  }, [
    employeeId,
    isSalePayroll,
    dateFrom,
    dateTo,
    profile,
    t,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    fetchSalary();
  }, [fetchSalary]);

  useEffect(() => {
    fetchEmployeeMarketAnalytics();
  }, [fetchEmployeeMarketAnalytics]);

  const empSalesCards = useMemo(() => {
    const c = empSalesPayload?.cards || {};
    return {
      revenue: fmtMoney(c.revenue || 0),
      transactions: Number(c.transactions || 0).toLocaleString("ru-RU"),
      avgCheck: fmtMoney(c.avg_check || 0),
      clients: Number(c.clients || 0).toLocaleString("ru-RU"),
    };
  }, [empSalesPayload]);

  const empSalesTopProducts = useMemo(
    () =>
      Array.isArray(empSalesPayload?.tables?.top_products)
        ? empSalesPayload.tables.top_products
        : [],
    [empSalesPayload],
  );
  const empSalesDocuments = useMemo(
    () =>
      Array.isArray(empSalesPayload?.tables?.documents)
        ? empSalesPayload.tables.documents
        : [],
    [empSalesPayload],
  );
  const empSalesPaymentMethods = useMemo(
    () =>
      Array.isArray(empSalesPayload?.charts?.payment_methods)
        ? empSalesPayload.charts.payment_methods
        : [],
    [empSalesPayload],
  );
  const empShiftRows = useMemo(
    () =>
      Array.isArray(empShiftsPayload?.tables?.active_shifts)
        ? empShiftsPayload.tables.active_shifts
        : [],
    [empShiftsPayload],
  );

  const salarySummary = salaryRows[0] || null;

  const applyPeriodPreset = (preset) => {
    const now = new Date();
    if (preset === "thisMonth") {
      const r = monthRange(now.getFullYear(), now.getMonth());
      setDateFrom(r.from);
      setDateTo(toLocalISODate(now));
      return;
    }
    if (preset === "lastMonth") {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const r = monthRange(d.getFullYear(), d.getMonth());
      setDateFrom(r.from);
      setDateTo(r.to);
      return;
    }
    if (preset === "last7") {
      const to = new Date(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setDateFrom(toLocalISODate(from));
      setDateTo(toLocalISODate(to));
    }
  };

  const refreshAll = () => {
    fetchSalary();
    fetchEmployeeMarketAnalytics();
  };

  const display = employee ? normalizeEmployee(employee) : null;
  const roleLabel = display
    ? display.role
      ? sysRoleLabel(display.role, t)
      : roleById.get(display.custom_role)?.name || display.role_display || "—"
    : "—";

  const openAccess = () => {
    if (!employee || display?.role === "owner") return;
    const labels = convertEmployeeAccessesToLabels(
      employee,
      company?.sector?.name,
    );
    setAccessEmployee(employee);
    setAccessLabels(labels);
    setAccessErr("");
    setAccessOpen(true);
  };

  const saveAccesses = async (payload) => {
    if (!accessEmployee) return;
    setAccessSaving(true);
    setAccessErr("");
    try {
      await api.patch(EMPLOYEE_ITEM_URL(accessEmployee.id), payload);
      setAccessOpen(false);
      setAccessEmployee(null);
      setAccessLabels([]);
      await reload();
    } catch (err: any) {
      // Раньше ошибка не ловилась: ни сообщения, ни реакции, необработанный reject
      setAccessErr(
        validateResErrors(err, "Не удалось обновить доступы сотрудника."),
      );
    } finally {
      setAccessSaving(false);
    }
  };

  const openEdit = () => {
    if (!display) return;
    const roleChoice = display.role
      ? `sys:${display.role}`
      : display.custom_role
        ? `cus:${display.custom_role}`
        : "";
    const branchIds = employeeBranchIds(display);
    setEditingEmpId(display.id);
    setEmpForm({
      email: display.email || "",
      first_name: display.first_name || "",
      last_name: display.last_name || "",
      roleChoice,
      track_number: display.track_number || "",
      phone_number: display.phone_number || "",
      branch: branchIds[0] || "",
      branches: branchIds,
    });
    setEmpAlerts([]);
    setEmpFieldErrors({});
    setEditOpen(true);
  };

  const submitEmployeeEdit = async (e: any) => {
    e.preventDefault();
    if (!editingEmpId) return;
    const errs: any = {};
    const alerts: any[] = [];
    const email = normalizeEmail(empForm.email);
    if (!email || !emailRx.test(email)) {
      errs.email = true;
      alerts.push(tm("errEmail"));
    }
    if (!String(empForm.first_name || "").trim()) {
      errs.first_name = true;
      alerts.push(tm("errFirstName"));
    }
    if (!String(empForm.last_name || "").trim()) {
      errs.last_name = true;
      alerts.push(tm("errLastName"));
    }
    if (!empForm.roleChoice) {
      errs.roleChoice = true;
      alerts.push(tm("errRole"));
    }
    const exists = allEmployees.some(
      (u) => normalizeEmail(u.email) === email && u.id !== editingEmpId,
    );
    if (exists) {
      errs.email = true;
      alerts.push(tm("errEmailExists"));
    }
    if (alerts.length) {
      setEmpFieldErrors(errs);
      setEmpAlerts(alerts);
      return;
    }
    const payload: any = {
      email,
      first_name: String(empForm.first_name || "").trim(),
      last_name: String(empForm.last_name || "").trim(),
      phone_number: String(empForm.phone_number || "").trim(),
      track_number: String(empForm.track_number || "").trim(),
      role: null,
      custom_role: null,
    };
    if (empForm.roleChoice.startsWith("sys:"))
      payload.role = empForm.roleChoice.slice(4);
    if (empForm.roleChoice.startsWith("cus:"))
      payload.custom_role = empForm.roleChoice.slice(4);
    if (showBranchSelect && empForm.branches.length > 0)
      payload.branches = empForm.branches;
    setEmpSaving(true);
    try {
      await api.patch(EMPLOYEE_ITEM_URL(editingEmpId), payload);
      setEditOpen(false);
      setEditingEmpId(null);
      await reload();
    } catch (err: any) {
      setEmpAlerts([pickApiError(err, tm("errUpdate"))]);
    } finally {
      setEmpSaving(false);
    }
  };

  if (!isSalePayroll) return <Navigate to="/crm/employ" replace />;
  if (!employeeId) return <Navigate to="/crm/employ" replace />;

  const periodLabel = formatPeriod(dateFrom, dateTo);
  const isRefreshing = salaryLoading || empAnalyticsLoading;
  const isOwner = display?.role === "owner";
  const avatarChar =
    (fullName(display) || display?.email || "•").trim().charAt(0).toUpperCase() ||
    "•";

  return (
    <div className="barbermasters cafeEmployDetail marketEmployDetail">
      <div className="barbermasters__top marketEmployDetail__topbar">
        <button
          type="button"
          className="barbermasters__btn barbermasters__btn--secondary"
          onClick={() => navigate("/crm/employ")}
        >
          <FaArrowLeft /> {tm("backToList")}
        </button>
      </div>

      {loading && (
        <div className="marketEmployDetail__stateBox">{t("common.loading")}</div>
      )}
      {!loading && loadErr && (
        <div className="barbermasters__alert">{loadErr}</div>
      )}

      {!loading && !loadErr && display && (
        <>
          <div className="marketEmployDetail__layout">
            <aside className="marketEmployDetail__sidebar">
              <header className="marketEmployDetail__profileHead">
                <div className="marketEmployDetail__avatar" aria-hidden>
                  {avatarChar}
                </div>
                <div className="marketEmployDetail__profileHeadText">
                  <h1 className="marketEmployDetail__profileName">
                    {fullName(display) || tm("noName")}
                  </h1>
                  <span className="marketEmployDetail__roleBadge">
                    {roleLabel}
                  </span>
                </div>
              </header>

              <dl className="marketEmployDetail__profileFacts">
                <div>
                  <dt>Email</dt>
                  <dd className="marketEmployDetail__factBreak">
                    {display.email || "—"}
                  </dd>
                </div>
                <div>
                  <dt>{tm("phone")}</dt>
                  <dd>{display.phone_number || "—"}</dd>
                </div>
                <div>
                  <dt>{tm("trackNumber")}</dt>
                  <dd>{display.track_number || "—"}</dd>
                </div>
              </dl>

              {!isOwner ? (
                <div className="marketEmployDetail__sidebarCta">
                  <p className="marketEmployDetail__sidebarCtaText">
                    {tm("schemeCta")}
                  </p>
                  <button
                    type="button"
                    className="barbermasters__btn barbermasters__btn--primary marketEmployDetail__sidebarCtaBtn"
                    onClick={() => setSalaryOpen(true)}
                  >
                    <FaCog aria-hidden /> {tm("setupSalary")}
                  </button>
                </div>
              ) : null}

              <div className="marketEmployDetail__sidebarActions">
                <button
                  type="button"
                  className="barbermasters__btn barbermasters__btn--secondary"
                  onClick={openEdit}
                >
                  <FaEdit /> {t("common.edit")}
                </button>
                <button
                  type="button"
                  className="barbermasters__btn barbermasters__btn--secondary"
                  onClick={openAccess}
                  disabled={isOwner}
                >
                  <FaLock /> {t("crm.employees.accesses")}
                </button>
              </div>
            </aside>

            <div className="marketEmployDetail__content">
              <div className="marketEmployDetail__guide" role="note">
                <FaInfoCircle
                  className="marketEmployDetail__guideIcon"
                  aria-hidden
                />
                <div>
                  <strong>{tm("guideTitle")}</strong>
                  <ol className="marketEmployDetail__guideList">
                    <li>{tm("guideStep1")}</li>
                    <li>
                      {tm("guideStep2a")}
                      <em>{tm("guideStep2em")}</em>
                      {tm("guideStep2b")}
                    </li>
                    <li>{tm("guideStep3")}</li>
                  </ol>
                </div>
              </div>

              <div className="marketEmployDetail__periodCard">
                <div className="marketEmployDetail__periodHead">
                  <span className="marketEmployDetail__periodTitle">
                    {tm("periodTitle")}
                  </span>
                  <span className="marketEmployDetail__periodHint">
                    {periodLabel}
                  </span>
                </div>
                <div className="marketEmployDetail__presets">
                  <button
                    type="button"
                    className="marketEmployDetail__presetBtn"
                    onClick={() => applyPeriodPreset("thisMonth")}
                  >
                    {tm("presetThisMonth")}
                  </button>
                  <button
                    type="button"
                    className="marketEmployDetail__presetBtn"
                    onClick={() => applyPeriodPreset("lastMonth")}
                  >
                    {tm("presetLastMonth")}
                  </button>
                  <button
                    type="button"
                    className="marketEmployDetail__presetBtn"
                    onClick={() => applyPeriodPreset("last7")}
                  >
                    {tm("presetLast7")}
                  </button>
                </div>
                <div className="marketEmployDetail__filters">
                  <label className="marketEmployDetail__dateField">
                    <span>{tm("dateFrom")}</span>
                    <input
                      type="date"
                      className="barbermasters__input marketEmployDetail__dateInput"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label={tm("dateFromAria")}
                    />
                  </label>
                  <label className="marketEmployDetail__dateField">
                    <span>{tm("dateTo")}</span>
                    <input
                      type="date"
                      className="barbermasters__input marketEmployDetail__dateInput"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label={tm("dateToAria")}
                    />
                  </label>
                  <button
                    type="button"
                    className="barbermasters__btn barbermasters__btn--primary marketEmployDetail__refreshBtn"
                    onClick={refreshAll}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? tm("refreshing") : tm("showForPeriod")}
                  </button>
                </div>
              </div>

              <div
                className="marketEmployDetail__tabs"
                role="tablist"
                aria-label={tm("tabsAria")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePanel === "payroll"}
                  className={`marketEmployDetail__tab${activePanel === "payroll" ? " marketEmployDetail__tab--active" : ""}`}
                  onClick={() => setActivePanel("payroll")}
                >
                  <FaCalculator aria-hidden /> {tm("tabPayroll")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePanel === "sales"}
                  className={`marketEmployDetail__tab${activePanel === "sales" ? " marketEmployDetail__tab--active" : ""}`}
                  onClick={() => setActivePanel("sales")}
                >
                  <FaChartLine aria-hidden /> {tm("tabSales")}
                </button>
              </div>

              {activePanel === "payroll" ? (
                <section
                  className="marketEmployDetail__panel"
                  role="tabpanel"
                  aria-label={tm("tabPayroll")}
                >
                  {salaryError ? (
                    <div className="barbermasters__alert">{salaryError}</div>
                  ) : null}

                  {salaryLoading ? (
                    <div className="marketEmployDetail__panelLoading">
                      {tm("calcInProgress")}
                    </div>
                  ) : null}

                  {!salaryLoading && salarySummary ? (
                    <>
                      <div className="marketEmployDetail__salaryHero">
                        <div className="marketEmployDetail__salaryHeroMain">
                          <span className="marketEmployDetail__salaryHeroLabel">
                            {tm("toPayForPeriod")}
                          </span>
                          <span className="marketEmployDetail__salaryHeroTotal">
                            {fmtMoney(salarySummary.total)} <small>сом</small>
                          </span>
                          <span className="marketEmployDetail__salaryHeroScheme">
                            {salarySummary.pay_scheme_label ||
                              salarySummary.pay_scheme ||
                              "—"}
                            {salarySummary.profile_scope
                              ? ` · ${profileScopeLabel(salarySummary.profile_scope)}`
                              : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="barbermasters__btn barbermasters__btn--secondary"
                          onClick={() => setSalaryOpen(true)}
                        >
                          {tm("changeScheme")}
                        </button>
                      </div>

                      <div className="marketEmployDetail__breakdown">
                        <div className="marketEmployDetail__breakdownItem">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("baseForPeriod")}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(salarySummary.base_prorated)}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("baseFromPerMonth", {
                              base: fmtMoney(salarySummary.monthly_base_salary),
                              days: salarySummary.period_days || 0,
                            })}
                          </span>
                        </div>
                        <div className="marketEmployDetail__breakdownItem">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("salesAsCashier")}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(
                              salarySummary.cashier_sales_period ??
                                salarySummary.employee_sales_period,
                            )}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("salesAsCashierHint")}
                          </span>
                        </div>
                        <div className="marketEmployDetail__breakdownItem">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("salesAsConsultant")}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(salarySummary.consultant_sales_period)}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("salesAsConsultantHint")}
                          </span>
                        </div>
                        <div className="marketEmployDetail__breakdownItem">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("consultantCommission")}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(
                              salarySummary.consultant_commission_period,
                            )}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("consultantCommissionHint")}
                          </span>
                        </div>
                        <div className="marketEmployDetail__breakdownItem">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("cashierPercentBase")}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(salarySummary.employee_sales_period)}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("cashierPercentBaseHint")}
                          </span>
                        </div>
                        <div className="marketEmployDetail__breakdownItem marketEmployDetail__breakdownItem--accent">
                          <span className="marketEmployDetail__breakdownLabel">
                            {tm("bonusPercent", {
                              percent: fmtMoney(salarySummary.sales_percent),
                            })}
                          </span>
                          <span className="marketEmployDetail__breakdownValue">
                            {fmtMoney(salarySummary.percent_bonus)}
                          </span>
                          <span className="marketEmployDetail__breakdownHint">
                            {tm("bonusHint")}
                          </span>
                        </div>
                      </div>

                      <details className="marketEmployDetail__detailsTable">
                        <summary>{tm("allCalcFields")}</summary>
                        <div className="marketEmployDetail__tableWrap">
                          <table className="marketEmployDetail__table marketEmployDetail__table--compact">
                            <thead>
                              <tr>
                                <th>{tm("colScheme")}</th>
                                <th>{tm("colBasePerMonth")}</th>
                                <th>{tm("colPercent")}</th>
                                <th>{tm("colDays")}</th>
                                <th>{tm("colBaseForPeriod")}</th>
                                <th>{tm("colCashier")}</th>
                                <th>{tm("colConsultant")}</th>
                                <th>{tm("colCommission")}</th>
                                <th>{tm("colPercentBase")}</th>
                                <th>{tm("colBonus")}</th>
                                <th>{tm("colTotal")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salaryRows.map((r, idx) => (
                                <tr key={`${r.user_id || "u"}-${idx}`}>
                                  <td>
                                    {r.pay_scheme_label || r.pay_scheme || "—"}
                                  </td>
                                  <td>{fmtMoney(r.monthly_base_salary)}</td>
                                  <td>{fmtMoney(r.sales_percent)}</td>
                                  <td>{r.period_days || 0}</td>
                                  <td>{fmtMoney(r.base_prorated)}</td>
                                  <td>
                                    {fmtMoney(
                                      r.cashier_sales_period ??
                                        r.employee_sales_period,
                                    )}
                                  </td>
                                  <td>{fmtMoney(r.consultant_sales_period)}</td>
                                  <td>
                                    {fmtMoney(r.consultant_commission_period)}
                                  </td>
                                  <td>{fmtMoney(r.employee_sales_period)}</td>
                                  <td>{fmtMoney(r.percent_bonus)}</td>
                                  <td>{fmtMoney(r.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  ) : null}

                  {!salaryLoading && !salarySummary ? (
                    <div className="marketEmployDetail__emptyState">
                      <div
                        className="marketEmployDetail__emptyStateIcon"
                        aria-hidden
                      >
                        {payrollEmoji}
                      </div>
                      <h3 className="marketEmployDetail__emptyStateTitle">
                        {tm("noCalcTitle")}
                      </h3>
                      <p className="marketEmployDetail__emptyStateText">
                        {tm("noCalcText")}
                      </p>
                      {!isOwner ? (
                        <button
                          type="button"
                          className="barbermasters__btn barbermasters__btn--primary"
                          onClick={() => setSalaryOpen(true)}
                        >
                          <FaCog aria-hidden /> {tm("setupSalary")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {activePanel === "sales" ? (
                <section
                  className="marketEmployDetail__panel"
                  role="tabpanel"
                  aria-label={tm("tabSales")}
                >
                  <p className="marketEmployDetail__panelIntro">
                    {tm("salesIntro")}
                  </p>
                  {empAnalyticsError ? (
                    <div className="barbermasters__alert">
                      {empAnalyticsError}
                    </div>
                  ) : null}
                  {empAnalyticsLoading ? (
                    <div className="marketEmployDetail__panelLoading">
                      {tm("loadingSales")}
                    </div>
                  ) : null}

                  <div className="marketEmployDetail__kpis">
                    <div className="marketEmployDetail__kpi">
                      <div className="marketEmployDetail__kpiLabel">
                        {tm("kpiRevenue")}
                      </div>
                      <div className="marketEmployDetail__kpiValue">
                        {empSalesCards.revenue}
                      </div>
                    </div>
                    <div className="marketEmployDetail__kpi">
                      <div className="marketEmployDetail__kpiLabel">
                        {tm("kpiChecks")}
                      </div>
                      <div className="marketEmployDetail__kpiValue">
                        {empSalesCards.transactions}
                      </div>
                    </div>
                    <div className="marketEmployDetail__kpi">
                      <div className="marketEmployDetail__kpiLabel">
                        {tm("kpiAvgCheck")}
                      </div>
                      <div className="marketEmployDetail__kpiValue">
                        {empSalesCards.avgCheck}
                      </div>
                    </div>
                    <div className="marketEmployDetail__kpi">
                      <div className="marketEmployDetail__kpiLabel">
                        {tm("kpiClients")}
                      </div>
                      <div className="marketEmployDetail__kpiValue">
                        {empSalesCards.clients}
                      </div>
                    </div>
                  </div>

                  <h4 className="marketEmployDetail__blockTitle">
                    {tm("blockPayment")}
                  </h4>
                  <div className="marketEmployDetail__tableWrap">
                    <table className="marketEmployDetail__table marketEmployDetail__table--compact">
                      <thead>
                        <tr>
                          <th>{tm("colMethod")}</th>
                          <th>{tm("colAmount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empSalesPaymentMethods.length ? (
                          empSalesPaymentMethods.map((m, idx) => (
                            <tr key={`${m.method || m.name || "pm"}-${idx}`}>
                              <td>{m.method || m.name || "—"}</td>
                              <td>{fmtMoney(m.total || m.count || 0)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={2}
                              className="marketEmployDetail__empty"
                            >
                              {tm("noDataForPeriod")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="marketEmployDetail__blockTitle">
                    {tm("blockTopProducts")}
                  </h4>
                  <div className="marketEmployDetail__tableWrap">
                    <table className="marketEmployDetail__table marketEmployDetail__table--compact">
                      <thead>
                        <tr>
                          <th>{tm("colProduct")}</th>
                          <th>{tm("colQtyShort")}</th>
                          <th>{tm("colRevenue")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empSalesTopProducts.length ? (
                          empSalesTopProducts.map((p, idx) => (
                            <tr key={`${p.name || "prod"}-${idx}`}>
                              <td>{p.name || "—"}</td>
                              <td>{p.sold || 0}</td>
                              <td>{fmtMoney(p.revenue || 0)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={3}
                              className="marketEmployDetail__empty"
                            >
                              {tm("noData")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="marketEmployDetail__blockTitle">
                    {tm("blockDocuments")}
                  </h4>
                  <div className="marketEmployDetail__tableWrap">
                    <table className="marketEmployDetail__table marketEmployDetail__table--compact">
                      <thead>
                        <tr>
                          <th>{tm("colType")}</th>
                          <th>{tm("colCount")}</th>
                          <th>{tm("colAmount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empSalesDocuments.length ? (
                          empSalesDocuments.map((d, idx) => (
                            <tr key={`${d.name || "doc"}-${idx}`}>
                              <td>{d.name || "—"}</td>
                              <td>{d.count || d.quantity || 0}</td>
                              <td>{fmtMoney(d.sum || d.amount || 0)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={3}
                              className="marketEmployDetail__empty"
                            >
                              {tm("noData")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="marketEmployDetail__blockTitle">
                    {tm("blockShifts")}
                  </h4>
                  <div className="marketEmployDetail__tableWrap">
                    <table className="marketEmployDetail__table marketEmployDetail__table--compact">
                      <thead>
                        <tr>
                          <th>{tm("colEmployee")}</th>
                          <th>{tm("colCashbox")}</th>
                          <th>{tm("colSales")}</th>
                          <th>{tm("colStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empShiftRows.length ? (
                          empShiftRows.map((s, idx) => (
                            <tr key={`${s.shift_id || s.id || "shift"}-${idx}`}>
                              <td>{s.cashier || s.employee || "—"}</td>
                              <td>{s.cashbox || "—"}</td>
                              <td>{fmtMoney(s.sales || 0)}</td>
                              <td>{s.status || "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="marketEmployDetail__empty"
                            >
                              {tm("noShiftsForPeriod")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <MarketSaleEmployeePayProfileModal
            open={salaryOpen}
            employee={display}
            onClose={() => setSalaryOpen(false)}
            employeeDisplayName={fullName(display)}
            onSaved={refreshAll}
          />
          <EmployeeAccessModal
            accessModalOpen={accessOpen}
            setAccessModalOpen={setAccessOpen}
            accessModalEmployee={accessEmployee}
            accessModalAccesses={accessLabels}
            handleSaveEmployeeAccesses={saveAccesses}
            profile={profile}
            tariff={tariff}
            company={company}
            empSaving={accessSaving}
            onCanSellWholesaleChange={undefined as any}
            accessError={accessErr}
          />
          <EmployeeEditModal
            empEditOpen={editOpen}
            empSaving={empSaving}
            setEmpEditOpen={setEditOpen}
            empAlerts={empAlerts}
            empFieldErrors={empFieldErrors}
            empForm={empForm}
            setEmpForm={setEmpForm}
            submitEmployeeEdit={submitEmployeeEdit}
            company={company}
            roleOptions={roleOptions}
            showBranchSelect={showBranchSelect}
            branches={branches}
            RoleSelect={RoleSelect}
          />
        </>
      )}
    </div>
  );
};

export default MarketEmployEmployeeDetail;
