import api from "@shared/api";

/**
 * Запись клиентов (режим «Услуги»): GET/POST main/appointments/,
 * PATCH/DELETE {id}/, POST {id}/to-sale/ → корзина смены с услугой и мастером.
 *
 * Названия полей записи сервер в ТЗ не перечислил — нормализуем терпимо к
 * вариантам (starts_at / start_at / date+time, duration_minutes / duration).
 */

export type AppointmentStatus = "scheduled" | "done" | "canceled" | string;

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  performerId: string;
  performerName: string;
  serviceId: string;
  serviceName: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  durationMin: number;
  status: AppointmentStatus;
  note: string;
  saleId: string;
};

const str = (v: unknown) => (v == null ? "" : String(v).trim());
const idOf = (v: any) => str(v && typeof v === "object" ? v.id : v);

/** Дата/время из ISO в часовом поясе бизнеса. */
const splitIso = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
};

export const normalizeAppointment = (raw: any): Appointment | null => {
  if (!raw || typeof raw !== "object" || raw.id == null) return null;
  const iso = str(raw.starts_at ?? raw.start_at ?? raw.datetime ?? raw.start);
  const fromIso = iso ? splitIso(iso) : { date: "", time: "" };
  const date = str(raw.date) || fromIso.date;
  const time = (str(raw.time) || fromIso.time).slice(0, 5);
  const duration = Number(raw.duration_minutes ?? raw.duration ?? 60);
  return {
    id: String(raw.id),
    clientId: idOf(raw.client),
    clientName: str(raw.client_name ?? raw.client?.full_name ?? raw.client?.name) || "—",
    performerId: idOf(raw.performer),
    performerName: str(raw.performer_name ?? raw.performer_display ?? raw.performer?.full_name),
    serviceId: idOf(raw.service ?? raw.product),
    serviceName: str(raw.service_name ?? raw.product_name ?? raw.service?.name) || "—",
    date,
    time,
    durationMin: Number.isFinite(duration) && duration > 0 ? duration : 60,
    status: str(raw.status) || "scheduled",
    note: str(raw.note ?? raw.comment),
    saleId: idOf(raw.sale),
  };
};

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export async function fetchAppointments(params: {
  date: string;
  performer?: string;
  status?: string;
}): Promise<Appointment[]> {
  const query: Record<string, string> = { date: params.date };
  if (params.performer) query.performer = params.performer;
  if (params.status) query.status = params.status;
  const { data } = await api.get("/main/appointments/", { params: query });
  return asList(data)
    .map(normalizeAppointment)
    .filter((a): a is Appointment => Boolean(a));
}

export type AppointmentDraft = {
  clientId: string;
  performerId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMin: string;
  note: string;
};

export type AppointmentDraftError = "client" | "performer" | "service" | "date" | "time" | "duration";

export const validateAppointmentDraft = (d: AppointmentDraft): AppointmentDraftError | null => {
  if (!d.clientId) return "client";
  if (!d.performerId) return "performer";
  if (!d.serviceId) return "service";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return "date";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return "time";
  const n = Number(d.durationMin);
  if (!Number.isInteger(n) || n < 5 || n > 24 * 60) return "duration";
  return null;
};

/** Начало записи в ISO с часовым поясом Бишкека (+06:00). */
export const appointmentStartIso = (date: string, time: string) => `${date}T${time}:00+06:00`;

export const buildAppointmentPayload = (d: AppointmentDraft) => ({
  client: d.clientId,
  performer: d.performerId,
  service: d.serviceId,
  date: d.date,
  time: d.time,
  starts_at: appointmentStartIso(d.date, d.time),
  duration_minutes: Number(d.durationMin),
  ...(d.note.trim() ? { note: d.note.trim().slice(0, 500) } : {}),
});

export async function createAppointment(d: AppointmentDraft) {
  const { data } = await api.post("/main/appointments/", buildAppointmentPayload(d));
  return normalizeAppointment(data);
}

export async function updateAppointment(id: string, patch: Record<string, unknown>) {
  const { data } = await api.patch(`/main/appointments/${encodeURIComponent(id)}/`, patch);
  return normalizeAppointment(data);
}

export async function deleteAppointment(id: string) {
  await api.delete(`/main/appointments/${encodeURIComponent(id)}/`);
}

/** В продажу: сервер кладёт услугу с мастером в корзину смены. Возвращает id продажи. */
export async function appointmentToSale(id: string): Promise<string> {
  const { data } = await api.post(`/main/appointments/${encodeURIComponent(id)}/to-sale/`, {});
  return str(data?.sale_id ?? data?.sale?.id ?? data?.sale ?? data?.id);
}

/* ---------- сетка дня ---------- */

export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 21 * 60;
export const SLOT_MIN = 30;

export const timeToMin = (time: string): number => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};

export const minToTime = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Слоты дня 08:00…20:30 (по 30 минут). */
export const daySlots = (): string[] => {
  const out: string[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += SLOT_MIN) out.push(minToTime(m));
  return out;
};

/** Пересекается ли запись с другой у того же мастера. */
export const overlapsExisting = (
  list: Appointment[],
  performerId: string,
  date: string,
  time: string,
  durationMin: number,
  exceptId?: string,
): boolean => {
  const start = timeToMin(time);
  const end = start + durationMin;
  return list.some((a) => {
    if (a.id === exceptId || a.performerId !== performerId || a.date !== date) return false;
    if (a.status === "canceled") return false;
    const s = timeToMin(a.time);
    return s < end && start < s + a.durationMin;
  });
};
