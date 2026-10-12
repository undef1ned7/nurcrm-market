import api from "@shared/api";

export type RentalStatus = "active" | "overdue" | "returned";

export type RentalItem = {
  product: string;
  name: string;
  variantLabel: string;
  qty: number;
};

export type Rental = {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  items: RentalItem[];
  dateFrom: string;
  dateTo: string;
  depositType: "money" | "document";
  depositAmount: number;
  depositDocument: string;
  status: RentalStatus | string;
  penalty: number;
  condition: string;
  note: string;
};

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown) => (v == null ? "" : String(v).trim());

export const normalizeRental = (raw: any): Rental | null => {
  if (!raw || typeof raw !== "object" || raw.id == null) return null;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id),
    number: str(raw.number ?? raw.doc_number ?? raw.code),
    clientId: str(typeof raw.client === "object" ? raw.client?.id : raw.client),
    clientName:
      str(raw.client_name ?? raw.client_display ?? raw.client?.full_name ?? raw.client?.name) || "—",
    items: items.map((it: any) => ({
      product: str(typeof it.product === "object" ? it.product?.id : it.product),
      name: str(it.product_name ?? it.name ?? it.product?.name) || "—",
      variantLabel: [str(it.variant_size), str(it.variant_color)].filter(Boolean).join(", "),
      qty: num(it.qty ?? it.quantity) || 1,
    })),
    dateFrom: str(raw.date_from),
    dateTo: str(raw.date_to),
    depositType: raw.deposit_type === "document" ? "document" : "money",
    depositAmount: num(raw.deposit_amount),
    depositDocument: str(raw.deposit_document),
    status: str(raw.status) || "active",
    penalty: num(raw.penalty),
    condition: str(raw.condition),
    note: str(raw.note),
  };
};

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export async function fetchRentals(status: RentalStatus): Promise<Rental[]> {
  const { data } = await api.get("/rentals/", { params: { status } });
  return asList(data)
    .map(normalizeRental)
    .filter((r): r is Rental => Boolean(r));
}

export type CreateRentalPayload = {
  client: string;
  items: { product: string; variant?: string; qty: string }[];
  date_from: string;
  date_to: string;
  tariff: "day";
  deposit_type: "money" | "document";
  deposit_amount?: string;
  deposit_method?: "cash" | "transfer";
  deposit_document?: string;
  note?: string;
};

export async function createRental(payload: CreateRentalPayload): Promise<Rental | null> {
  const { data } = await api.post("/rentals/", payload);
  return normalizeRental(data);
}

export async function returnRental(
  id: string,
  payload: { condition: "ok" | "damaged"; penalty: string },
): Promise<Rental | null> {
  const { data } = await api.post(`/rentals/${encodeURIComponent(id)}/return/`, payload);
  return normalizeRental(data);
}

/* ---------- расчёты для экрана ---------- */

/** Сегодня (YYYY-MM-DD) по часовому поясу бизнеса. */
export const todayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Просрочен: сервер так сказал или срок возврата уже прошёл. */
export const isRentalOverdue = (r: Rental, today = todayKey()): boolean =>
  r.status === "overdue" || (r.status !== "returned" && Boolean(r.dateTo) && r.dateTo < today);

export const rentalTiles = (active: Rental[], overdue: Rental[]) => {
  const byId = new Map<string, Rental>();
  [...active, ...overdue].forEach((r) => byId.set(r.id, r));
  const open = [...byId.values()];
  return {
    onHands: open.length,
    overdue: open.filter((r) => isRentalOverdue(r)).length,
    moneyDeposits:
      Math.round(
        open
          .filter((r) => r.depositType === "money")
          .reduce((s, r) => s + r.depositAmount, 0) * 100,
      ) / 100,
  };
};

export type RentalDraft = {
  clientId: string;
  items: { key: string; product: string; variant?: string; name: string; qty: string }[];
  dateFrom: string;
  dateTo: string;
  depositType: "money" | "document";
  depositAmount: string;
  depositMethod: "cash" | "transfer";
  depositDocument: string;
  note: string;
};

export type RentalDraftError =
  | "client"
  | "items"
  | "qty"
  | "dates"
  | "depositAmount"
  | "depositDocument";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const validateRentalDraft = (d: RentalDraft): RentalDraftError | null => {
  if (!d.clientId) return "client";
  if (!d.items.length) return "items";
  if (d.items.some((i) => !/^\d+$/.test(i.qty.trim()) || Number(i.qty) <= 0)) return "qty";
  if (!DATE_RE.test(d.dateFrom) || !DATE_RE.test(d.dateTo) || d.dateTo < d.dateFrom) return "dates";
  if (d.depositType === "money") {
    const s = d.depositAmount.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(s) || Number(s) <= 0) return "depositAmount";
  } else if (!d.depositDocument.trim()) {
    return "depositDocument";
  }
  return null;
};

export const buildRentalPayload = (d: RentalDraft): CreateRentalPayload => ({
  client: d.clientId,
  items: d.items.map((i) => ({
    product: i.product,
    ...(i.variant ? { variant: i.variant } : {}),
    qty: String(Number(i.qty)),
  })),
  date_from: d.dateFrom,
  date_to: d.dateTo,
  tariff: "day",
  deposit_type: d.depositType,
  ...(d.depositType === "money"
    ? {
        deposit_amount: Number(d.depositAmount.replace(",", ".")).toFixed(2),
        deposit_method: d.depositMethod,
      }
    : { deposit_document: d.depositDocument.trim().slice(0, 200) }),
  ...(d.note.trim() ? { note: d.note.trim().slice(0, 500) } : {}),
});
