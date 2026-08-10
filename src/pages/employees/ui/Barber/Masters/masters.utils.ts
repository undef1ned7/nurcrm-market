/* ===================== API endpoints ===================== */
export const EMPLOYEES_LIST_URL = "/users/employees/";
export const EMPLOYEES_CREATE_URL = "/users/employees/create/";
export const EMPLOYEE_ITEM_URL = (id: any) => `/users/employees/${id}/`;

export const ROLES_LIST_URL = "/users/roles/";
export const ROLE_CREATE_URL = "/users/roles/custom/";
export const ROLE_ITEM_URL = (id: any) => `/users/roles/custom/${id}/`;

/* ===================== Constants ===================== */
export const SYSTEM_ROLES = ["owner", "admin"];
export const PAGE_SIZE = 100;
export const BARBER_CAN_VIEW_CLIENT_DOCUMENTS = "can_view_document";

export const EMPTY_EMP_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  roleChoice: "",
  track_number: "",
  phone_number: "",
  branch: "",
};

export const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ===================== Pure helpers ===================== */
export const asArray = (d) =>
  Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];

export const normalizeEmail = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

export const normalizeEmployee = (e: any = {}) => ({
  id: e.id,
  email: e.email ?? "",
  first_name: e.first_name ?? "",
  last_name: e.last_name ?? "",
  role: e.role ?? null,
  custom_role: e.custom_role ?? null,
  role_display: e.role_display ?? "",
  branches: Array.isArray(e.branches) ? e.branches : e.branch ? [e.branch] : [],
  branch: e.branch ?? null, // сохраняем для обратной совместимости
});

export const fullName = (e) =>
  [e?.last_name || "", e?.first_name || ""].filter(Boolean).join(" ").trim();

export const sysCodeFromName = (n) => {
  const l = String(n || "")
    .trim()
    .toLowerCase();
  if (["admin", "administrator", "админ", "администратор"].includes(l))
    return "admin";
  if (["owner", "владелец"].includes(l)) return "owner";
  return null;
};

export const normalizeRoleName = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const pickApiError = (e, fb) => {
  const d = e?.response?.data;
  if (!d) return fb;
  if (typeof d === "string") return d;
  if (typeof d === "object") {
    try {
      const k = Object.keys(d)[0];
      const v = Array.isArray(d[k]) ? d[k][0] : d[k];
      return String(v || fb);
    } catch {
      return fb;
    }
  }
  return fb;
};

export const focusFirstInvalid = (errs: any) => {
  const order = ["email", "first_name", "last_name", "roleChoice"];
  const key = order.find((k) => errs[k]);
  if (key) {
    const el: any = document.querySelector(`.barbermasters__form [name="${key}"]`);
    if (el?.focus) el.focus();
  }
};

export const validateEmployee = (form: any, employees: any, isEdit = false, editId: any = null) => {
  const alerts: any[] = [];
  const errs: any = {};
  const email = normalizeEmail(form.email);
  if (!email) {
    errs.email = true;
    alerts.push("Укажите Email.");
  } else if (!emailRx.test(email)) {
    errs.email = true;
    alerts.push("Email указан неверно.");
  } else {
    const exists = employees.some(
      (u) =>
        normalizeEmail(u.email) === email && (!isEdit || u.id !== editId),
    );
    if (exists) {
      errs.email = true;
      alerts.push("Сотрудник с таким Email уже существует.");
    }
  }
  const first = String(form.first_name || "").trim();
  const last = String(form.last_name || "").trim();
  if (!first) {
    errs.first_name = true;
    alerts.push("Укажите имя.");
  } else if (first.length < 2) {
    errs.first_name = true;
    alerts.push("Имя: минимум 2 символа.");
  }
  if (!last) {
    errs.last_name = true;
    alerts.push("Укажите фамилию.");
  } else if (last.length < 2) {
    errs.last_name = true;
    alerts.push("Фамилия: минимум 2 символа.");
  }
  if (!form.roleChoice) {
    errs.roleChoice = true;
    alerts.push("Выберите роль.");
  }
  return { errs, alerts };
};

/** Набор складов общего доступа с fallback на legacy common_warehouse. */
export const getMembershipCommonWarehouseIds = (membership) => {
  if (
    Array.isArray(membership?.common_warehouses) &&
    membership.common_warehouses.length
  ) {
    return membership.common_warehouses.map(String);
  }
  return membership?.common_warehouse
    ? [String(membership.common_warehouse)]
    : [];
};
