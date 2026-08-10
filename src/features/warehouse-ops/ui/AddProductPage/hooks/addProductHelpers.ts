export const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const DICT_PAGE_LIMIT = 100;

export const formatPrice3Decimals = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n)
    ? (Math.round(n * 1000) / 1000).toString()
    : String(v);
};

export const sanitizePriceTo3Decimals = (val) => {
  const s = String(val ?? "").replace(",", ".");
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join("").slice(0, 3);
};
