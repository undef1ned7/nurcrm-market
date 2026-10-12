import { validateResErrors } from "@shared/lib/tools/validateResErrors";
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
  branches: [] as string[],
};

/** id филиалов сотрудника из ответа API (массив id/объектов или одиночное поле). */
export const employeeBranchIds = (u: any): string[] => {
  const raw = Array.isArray(u?.branches)
    ? u.branches
    : Array.isArray(u?.branch_ids)
      ? u.branch_ids
      : u?.branch
        ? [u.branch]
        : [];
  return raw
    .map((b: any) => (b && typeof b === "object" ? b.id : b))
    .filter((b: any) => b != null && b !== "")
    .map(String);
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
  // Телефон и трек-номер нужны форме правки: без них PATCH отправлял "" и стирал данные
  phone_number: e.phone_number ?? "",
  track_number: e.track_number ?? "",
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

// Общий разбор ошибок API: отсекает HTML-страницы nginx/Django (раньше 502 показывался
// в модалке сырым HTML) и собирает ошибки полей DRF ({ email: ["…"] }).
export const pickApiError = (e, fb) => validateResErrors(e, fb);

/** Склонение: pluralRu(1, ["сотрудник", "сотрудника", "сотрудников"]) → «сотрудник». */
export const pluralRu = (n: number, forms: [string, string, string]) => {
  const abs = Math.abs(Number(n) || 0);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
};

export const focusFirstInvalid = (errs: any) => {
  const order = ["email", "first_name", "last_name", "roleChoice"];
  const key = order.find((k) => errs[k]);
  if (key) {
    const el: any = document.querySelector(`.barbermasters__form [name="${key}"]`);
    if (el?.focus) el.focus();
  }
};

export const validateEmployee = (
  form: any,
  employees: any,
  isEdit = false,
  editId: any = null,
  t: (k: string) => string = (k) => k,
) => {
  const tv = (k: string) => t(`crm.employees.validate.${k}`);
  const alerts: any[] = [];
  const errs: any = {};
  const email = normalizeEmail(form.email);
  if (!email) {
    errs.email = true;
    alerts.push(tv("emailRequired"));
  } else if (!emailRx.test(email)) {
    errs.email = true;
    alerts.push(tv("emailInvalid"));
  } else {
    const exists = employees.some(
      (u) =>
        normalizeEmail(u.email) === email && (!isEdit || u.id !== editId),
    );
    if (exists) {
      errs.email = true;
      alerts.push(tv("emailExists"));
    }
  }
  const first = String(form.first_name || "").trim();
  const last = String(form.last_name || "").trim();
  if (!first) {
    errs.first_name = true;
    alerts.push(tv("firstNameRequired"));
  } else if (first.length < 2) {
    errs.first_name = true;
    alerts.push(tv("firstNameMin"));
  }
  if (!last) {
    errs.last_name = true;
    alerts.push(tv("lastNameRequired"));
  } else if (last.length < 2) {
    errs.last_name = true;
    alerts.push(tv("lastNameMin"));
  }
  if (!form.roleChoice) {
    errs.roleChoice = true;
    alerts.push(tv("roleRequired"));
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
