export const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }) +
  " с";

export const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("ru-RU");
};

export const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

export const emptyPage = { count: 0, next: null, previous: null, results: [] };
export const toNumber = (v) => Number(v) || 0;
export const fmtRu2 = (v) =>
  toNumber(v).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Страница контрагента: только денежные операции по контрагенту (API 5.3).
 * GET /api/warehouse/money/counterparties/{counterparty_id}/operations/
 * Фильтры: doc_type, status, warehouse, payment_category. Поиск: search (по number, comment).
 */
export const showAgentBlock = (profile) =>
  profile?.role === "owner" || profile?.role === "admin";

export const getRowDateValue = (row) => {
  const raw = row?.date ?? row?.created_at ?? row?.document?.date ?? null;
  const d = raw ? new Date(raw) : null;
  const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  return t;
};

export const getRowKey = (row, idx) =>
  row?.id ??
  `${row?.source ?? "row"}-${row?.number ?? row?.document?.number ?? "n"}-${
    row?.date ?? row?.created_at ?? row?.document?.date ?? "d"
  }-${idx}`;

