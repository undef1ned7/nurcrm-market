import api from "@shared/api";

/**
 * Заказ-наряд (ремонт, режим «Услуги»):
 *   GET/POST main/work-orders/ — приём с предоплатой в текущую смену;
 *   POST {id}/issue/ {"payment": {"method", "received"}} — выдача: предоплата
 *   засчитывается, доплата — указанным способом.
 *
 * Поля наряда в ТЗ не перечислены — нормализуем терпимо к названиям.
 */

export type WorkOrder = {
  id: string;
  number: string;
  clientName: string;
  title: string;
  description: string;
  status: string;
  total: number;
  prepayment: number;
  createdAt: string;
};

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (v == null ? "" : String(v).trim());

export const normalizeWorkOrder = (raw: any): WorkOrder | null => {
  if (!raw || typeof raw !== "object" || raw.id == null) return null;
  return {
    id: String(raw.id),
    number: str(raw.number ?? raw.doc_number ?? raw.code),
    clientName: str(raw.client_name ?? raw.client?.full_name ?? raw.client?.name) || "—",
    title: str(raw.title ?? raw.device ?? raw.item_name ?? raw.name) || "—",
    description: str(raw.description ?? raw.problem ?? raw.note),
    status: str(raw.status) || "accepted",
    total: num(raw.total ?? raw.price ?? raw.estimated_price ?? raw.amount),
    prepayment: num(raw.prepayment ?? raw.prepayment_amount ?? raw.paid_amount),
    createdAt: str(raw.created_at),
  };
};

/** Остаток к оплате при выдаче (не меньше нуля). */
export const workOrderDue = (o: Pick<WorkOrder, "total" | "prepayment">): number =>
  Math.max(0, Math.round((o.total - o.prepayment) * 100) / 100);

export const isWorkOrderIssued = (o: Pick<WorkOrder, "status">): boolean =>
  ["issued", "done", "closed", "completed"].includes(o.status);

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export async function fetchWorkOrders(status?: string): Promise<WorkOrder[]> {
  const { data } = await api.get("/main/work-orders/", {
    params: status ? { status } : undefined,
  });
  return asList(data)
    .map(normalizeWorkOrder)
    .filter((o): o is WorkOrder => Boolean(o));
}

export type WorkOrderDraft = {
  clientId: string;
  title: string;
  description: string;
  price: string;
  prepayment: string;
  prepaymentMethod: "cash" | "transfer";
};

export type WorkOrderDraftError = "client" | "title" | "price" | "prepayment" | "prepaymentTooBig";

const MONEY_RE = /^\d+([.,]\d{1,2})?$/;
const money = (s: string) => Number(s.trim().replace(",", ".") || "0");

export const validateWorkOrderDraft = (d: WorkOrderDraft): WorkOrderDraftError | null => {
  if (!d.clientId) return "client";
  if (!d.title.trim()) return "title";
  if (d.price.trim() && !MONEY_RE.test(d.price.trim())) return "price";
  if (d.prepayment.trim() && !MONEY_RE.test(d.prepayment.trim())) return "prepayment";
  if (d.price.trim() && money(d.prepayment) > money(d.price)) return "prepaymentTooBig";
  return null;
};

export const buildWorkOrderPayload = (
  d: WorkOrderDraft,
  routing: Record<string, string> = {},
) => ({
  client: d.clientId,
  title: d.title.trim().slice(0, 200),
  ...(d.description.trim() ? { description: d.description.trim().slice(0, 1000) } : {}),
  ...(d.price.trim() ? { price: money(d.price).toFixed(2) } : {}),
  prepayment: money(d.prepayment).toFixed(2),
  prepayment_method: d.prepaymentMethod,
  ...routing,
});

export async function createWorkOrder(payload: Record<string, unknown>) {
  const { data } = await api.post("/main/work-orders/", payload);
  return normalizeWorkOrder(data);
}

export async function issueWorkOrder(
  id: string,
  payment: { method: "cash" | "transfer"; received: string },
  routing: Record<string, string> = {},
) {
  const { data } = await api.post(`/main/work-orders/${encodeURIComponent(id)}/issue/`, {
    payment,
    ...routing,
  });
  return normalizeWorkOrder(data);
}
