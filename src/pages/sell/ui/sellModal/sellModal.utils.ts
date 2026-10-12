/* =========================
   0.1) Хелперы валидации склада
   ========================= */
export const STOCK_DETAIL_RE =
  /Недостаточно на складе:\s*«(.+?)»\.\s*Нужно\s*([\d\s.,]+),\s*доступно\s*([\d\s.,]+)/i;

export function numberify(s) {
  if (s == null) return 0;
  const n = Number(String(s).replaceAll(" ", "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function parseStockError(err) {
  const raw =
    err?.detail ||
    err?.data?.detail ||
    err?.response?.data?.detail ||
    err?.message ||
    "";
  const m = String(raw).match(STOCK_DETAIL_RE);
  if (!m) return null;
  return {
    name: m[1],
    need: numberify(m[2]),
    available: numberify(m[3]),
    raw,
  };
}

export function getAvailableFromObject(p) {
  return (
    Number(p?.qty_on_agent ?? p?.qty_on_hand ?? p?.quantity ?? p?.stock ?? 0) ||
    0
  );
}

