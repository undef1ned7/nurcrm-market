// API-клиент раздела «Магазин в приложении» (приложение покупателей NurCRM).
// GET/PATCH /main/app-shop-settings/ — настройки компании и её филиалов, статус, превью.
//
// ВАЖНО: точные названия полей пришлёт бэкенд (памятка Беки). Пока её нет,
// названия полей ищутся в ответе сервера по списку кандидатов (FIELD_KEYS),
// а в PATCH уходят ТОЛЬКО те ключи, которые сервер сам прислал в GET.
// Свои названия на сервер не отправляем: тот же запрос использует NurMarket.
// Когда придёт памятка — поставить точные ключи первыми в FIELD_KEYS.
import api from "@shared/api";

export const APP_SHOP_SETTINGS_URL = "/main/app-shop-settings/";

export type ShopFieldId =
  | "enabled"
  | "name"
  | "address"
  | "phone"
  | "schedule"
  | "lat"
  | "lng"
  | "pointsEnabled"
  | "pointsPercent";

/** Кандидаты ключей для каждого поля; "a.b" — вложенное поле. Первый найденный в ответе — используется. */
export const FIELD_KEYS: Record<ShopFieldId, string[]> = {
  enabled: [
    "show_in_app",
    "app_enabled",
    "is_shown_in_app",
    "show_in_client_app",
    "app_visible",
    "is_enabled",
    "enabled",
  ],
  name: ["app_name", "display_name", "public_name", "customer_name", "name_for_customers", "shop_name"],
  address: ["app_address", "address"],
  phone: ["app_phone", "phone", "contact_phone"],
  schedule: ["working_hours", "work_schedule", "schedule", "opening_hours", "work_hours", "hours"],
  lat: ["latitude", "lat", "location.latitude", "location.lat", "coordinates.latitude", "coordinates.lat"],
  lng: [
    "longitude",
    "lng",
    "lon",
    "location.longitude",
    "location.lng",
    "location.lon",
    "coordinates.longitude",
    "coordinates.lng",
    "coordinates.lon",
  ],
  pointsEnabled: [
    "points_enabled",
    "bonus_enabled",
    "loyalty_enabled",
    "cashback_enabled",
    "bonuses_enabled",
  ],
  pointsPercent: [
    "points_percent",
    "bonus_percent",
    "loyalty_percent",
    "cashback_percent",
    "bonuses_percent",
  ],
};

const REASON_KEYS = ["reason", "visibility_reason", "hidden_reason", "not_visible_reason", "status_reason", "reason_code"];
const ADMIN_REASON_KEYS = ["hidden_reason_text", "admin_reason", "hidden_by_admin_reason", "moderation_comment", "reason_text", "reason_message"];
const PREVIEW_KEYS = ["preview", "app_preview", "card_preview"];
const BRANCH_LIST_KEYS = ["branches", "filials"];
const BRANCH_TITLE_KEYS = ["branch_name", "title", "name"];

export type VisibilityReason =
  | "visible"
  | "disabled"
  | "no_address"
  | "no_coordinates"
  | "hidden_by_admin"
  | "payment_required"
  | "unknown";

export type ShopForm = {
  enabled: boolean;
  name: string;
  address: string;
  phone: string;
  schedule: string;
  lat: string;
  lng: string;
  pointsEnabled: boolean;
  pointsPercent: string;
};

export type ShopPreview = {
  name: string;
  address: string;
  pointsPercent: number | null;
  phone: string;
  image: string;
};

export type ShopEntity = {
  /** "company" — основной магазин, иначе id филиала. */
  key: string;
  branchId: string | null;
  title: string;
  /** Найденный в ответе ключ для каждого поля; нет ключа — поле не показываем и не отправляем. */
  keys: Partial<Record<ShopFieldId, string>>;
  form: ShopForm;
  visible: boolean;
  reason: VisibilityReason;
  adminReason: string;
  preview: ShopPreview | null;
};

export type AppShopState = {
  company: ShopEntity;
  branches: ShopEntity[];
  /** Поля компании пришли в обёртке `company: {...}` (а не на верхнем уровне). */
  companyWrapped: boolean;
  branchListKey: string;
};

/* ---------- чтение ---------- */

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

const getPath = (obj: any, path: string) =>
  path.split(".").reduce((acc, k) => (isObj(acc) ? acc[k] : undefined), obj);

const hasPath = (obj: any, path: string) => {
  const parts = path.split(".");
  const last = parts.pop() as string;
  const parent = parts.reduce((acc, k) => (isObj(acc) ? acc[k] : undefined), obj);
  return isObj(parent) && last in parent;
};

const firstKey = (obj: any, candidates: string[]) => candidates.find((k) => hasPath(obj, k));

const firstValue = (obj: any, candidates: string[]) => {
  const k = firstKey(obj, candidates);
  return k ? getPath(obj, k) : undefined;
};

const asText = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const asNumText = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? String(n) : "";
};

const asBool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

const REASONS: VisibilityReason[] = [
  "visible",
  "disabled",
  "no_address",
  "no_coordinates",
  "hidden_by_admin",
  "payment_required",
];

const parseReason = (raw: unknown, visible: boolean): VisibilityReason => {
  if (visible) return "visible";
  const code = String(isObj(raw) ? raw.code ?? "" : raw ?? "").trim();
  return (REASONS as string[]).includes(code) ? (code as VisibilityReason) : "unknown";
};

const parsePreview = (raw: unknown): ShopPreview | null => {
  if (!isObj(raw)) return null;
  const pct = firstValue(raw, ["points_percent", "bonus_percent", "loyalty_percent", "cashback_percent", "percent"]);
  const pctNum = pct === null || pct === undefined || pct === "" ? null : Number(pct);
  return {
    name: asText(firstValue(raw, ["name", "title", "display_name"])),
    address: asText(firstValue(raw, ["address"])),
    pointsPercent: Number.isFinite(pctNum as number) ? (pctNum as number) : null,
    phone: asText(firstValue(raw, ["phone"])),
    image: asText(firstValue(raw, ["logo", "image", "image_url", "logo_url"])),
  };
};

const parseEntity = (raw: Record<string, any>, key: string, branchId: string | null, fallbackTitle: string): ShopEntity => {
  const keys: Partial<Record<ShopFieldId, string>> = {};
  (Object.keys(FIELD_KEYS) as ShopFieldId[]).forEach((f) => {
    const k = firstKey(raw, FIELD_KEYS[f]);
    if (k) keys[f] = k;
  });
  const val = (f: ShopFieldId) => (keys[f] ? getPath(raw, keys[f] as string) : undefined);

  const visible = asBool(raw.visible_in_app);
  const reasonRaw = firstValue(raw, REASON_KEYS);
  const adminReason =
    asText(firstValue(raw, ADMIN_REASON_KEYS)) ||
    (isObj(reasonRaw) ? asText(reasonRaw.message || reasonRaw.text || reasonRaw.detail) : "");

  return {
    key,
    branchId,
    title: asText(firstValue(raw, BRANCH_TITLE_KEYS)) || fallbackTitle,
    keys,
    form: {
      enabled: asBool(val("enabled")),
      name: asText(val("name")),
      address: asText(val("address")),
      phone: asText(val("phone")),
      schedule: asText(val("schedule")),
      lat: asNumText(val("lat")),
      lng: asNumText(val("lng")),
      pointsEnabled: asBool(val("pointsEnabled")),
      pointsPercent: asNumText(val("pointsPercent")),
    },
    visible,
    reason: parseReason(reasonRaw, visible),
    adminReason,
    preview: parsePreview(firstValue(raw, PREVIEW_KEYS)),
  };
};

/** Разбирает ответ GET/PATCH. Бросает ошибку, если ответ не похож на настройки магазина. */
export const parseAppShopSettings = (data: unknown, companyTitle: string): AppShopState => {
  if (!isObj(data)) throw new Error("app-shop-settings: unexpected response");
  const companyWrapped = isObj(data.company);
  const companyRaw = companyWrapped ? data.company : data;
  const branchListKey =
    BRANCH_LIST_KEYS.find((k) => Array.isArray(data[k])) ||
    BRANCH_LIST_KEYS.find((k) => Array.isArray(companyRaw[k])) ||
    "branches";
  const branchList = Array.isArray(data[branchListKey])
    ? data[branchListKey]
    : Array.isArray(companyRaw[branchListKey])
      ? companyRaw[branchListKey]
      : [];

  const company = parseEntity(companyRaw, "company", null, companyTitle);
  const branches = branchList
    .filter((b: unknown) => isObj(b) && (b as any).id !== undefined)
    .map((b: any, i: number) =>
      parseEntity(b, `branch:${b.id}`, String(b.id), `${companyTitle} #${i + 1}`),
    );

  return { company, branches, companyWrapped, branchListKey };
};

/* ---------- запись ---------- */

const setPath = (obj: Record<string, any>, path: string, value: unknown) => {
  const parts = path.split(".");
  const last = parts.pop() as string;
  let cur = obj;
  parts.forEach((k) => {
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k];
  });
  cur[last] = value;
};

const numOrNull = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const FIELD_VALUE: Record<ShopFieldId, (f: ShopForm) => unknown> = {
  enabled: (f) => f.enabled,
  name: (f) => f.name.trim(),
  address: (f) => f.address.trim(),
  phone: (f) => f.phone.trim(),
  schedule: (f) => f.schedule.trim(),
  lat: (f) => numOrNull(f.lat),
  lng: (f) => numOrNull(f.lng),
  pointsEnabled: (f) => f.pointsEnabled,
  pointsPercent: (f) => numOrNull(f.pointsPercent),
};

/** Изменённые поля сущности с ключами из ответа сервера; координаты уходят парой. */
export const entityPatch = (entity: ShopEntity, form: ShopForm): Record<string, any> | null => {
  const out: Record<string, any> = {};
  let changed = false;
  (Object.keys(FIELD_VALUE) as ShopFieldId[]).forEach((f) => {
    const key = entity.keys[f];
    if (!key) return;
    const next = FIELD_VALUE[f](form);
    const prev = FIELD_VALUE[f](entity.form);
    if (next === prev) return;
    changed = true;
    setPath(out, key, next);
  });
  if (!changed) return null;
  // Широта без долготы бессмысленна — если поменялась одна, отправляем обе.
  const { lat: latKey, lng: lngKey } = entity.keys;
  if (latKey && lngKey && (hasPath(out, latKey) || hasPath(out, lngKey))) {
    setPath(out, latKey, FIELD_VALUE.lat(form));
    setPath(out, lngKey, FIELD_VALUE.lng(form));
  }
  return out;
};

/** Один PATCH на всё: поля компании (в той же форме, что пришли) и изменённые филиалы. */
export const buildAppShopPatch = (
  state: AppShopState,
  forms: Record<string, ShopForm>,
): Record<string, any> | null => {
  const body: Record<string, any> = {};
  const companyPatch = forms.company ? entityPatch(state.company, forms.company) : null;
  if (companyPatch) {
    if (state.companyWrapped) body.company = companyPatch;
    else Object.assign(body, companyPatch);
  }
  const branchPatches = state.branches
    .map((b) => {
      const p = forms[b.key] ? entityPatch(b, forms[b.key]) : null;
      return p ? { id: b.branchId, ...p } : null;
    })
    .filter(Boolean);
  if (branchPatches.length) body[state.branchListKey] = branchPatches;
  return Object.keys(body).length ? body : null;
};

/* ---------- ошибки ---------- */

export type FieldErrors = Record<string, Partial<Record<ShopFieldId | "_", string>>>;

const firstMsg = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(firstMsg).find(Boolean) || "";
  if (isObj(v)) return firstMsg(v.message ?? v.detail ?? Object.values(v)[0]);
  return "";
};

const entityErrors = (entity: ShopEntity, raw: Record<string, any>) => {
  const out: Partial<Record<ShopFieldId | "_", string>> = {};
  (Object.keys(entity.keys) as ShopFieldId[]).forEach((f) => {
    const key = entity.keys[f] as string;
    const msg = firstMsg(getPath(raw, key) ?? raw[key.split(".")[0]]);
    if (msg) out[f] = msg;
  });
  const general = firstMsg(raw.non_field_errors ?? raw.detail);
  if (general) out._ = general;
  return out;
};

/** Ошибки 400 из ответа сервера → по сущностям и полям. */
export const parseFieldErrors = (state: AppShopState, data: unknown): FieldErrors => {
  if (!isObj(data)) return {};
  const out: FieldErrors = {};
  const companyRaw = state.companyWrapped && isObj(data.company) ? data.company : data;
  const c = entityErrors(state.company, companyRaw);
  if (Object.keys(c).length) out.company = c;
  const list = data[state.branchListKey];
  if (Array.isArray(list)) {
    list.forEach((errs, i) => {
      if (!isObj(errs)) return;
      const id = errs.id !== undefined ? String(errs.id) : null;
      const branch = state.branches.find((b) => b.branchId === id) || state.branches[i];
      if (!branch) return;
      const e = entityErrors(branch, errs);
      if (Object.keys(e).length) out[branch.key] = e;
    });
  }
  return out;
};

export const isPaymentRequired = (err: any) => {
  const data = err?.response?.data;
  return (
    err?.response?.status === 403 &&
    (data?.code === "client_app_payment_required" || data?.detail?.code === "client_app_payment_required")
  );
};

/* ---------- запросы ---------- */

export const fetchAppShopSettings = async () => {
  const { data } = await api.get(APP_SHOP_SETTINGS_URL);
  return data;
};

export const updateAppShopSettings = async (payload: Record<string, any>) => {
  const { data } = await api.patch(APP_SHOP_SETTINGS_URL, payload);
  return data;
};

/* ---------- геокодер для «Найти по адресу» (OpenStreetMap Nominatim) ---------- */

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  const q = address.trim();
  if (!q) return null;
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "kg",
    "accept-language": "ru",
    q,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const arr = await res.json();
  const hit = Array.isArray(arr) ? arr[0] : null;
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};
