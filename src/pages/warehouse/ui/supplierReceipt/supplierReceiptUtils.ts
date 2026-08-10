export const listFrom = (res) => res?.data?.results || res?.data || [];

export const formatQty = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPriceInput = (value) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return "";
  const num = Number(normalized);
  if (!Number.isFinite(num)) return "";
  return String(num);
};

export const parsePositiveQty = (value) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return 0;
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

export const parseNonNegativePrice = (value) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

export const buildSupplierLabel = (supplier) => {
  if (!supplier || typeof supplier !== "object") return "Без названия";
  return (
    String(
      supplier.full_name ||
        supplier.name ||
        supplier.company_name ||
        supplier.phone ||
        supplier.email ||
        "Без названия",
    ).trim() || "Без названия"
  );
};

export const buildProductLabel = (product) =>
  String(
    product?.name ||
      product?.title ||
      product?.product_name ||
      product?.code ||
      "Товар",
  ).trim() || "Товар";

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const toNum = (value) => {
  const num = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
};

export const getTodayIsoDate = () => new Date().toISOString().split("T")[0];

export const downloadBlob = (blob, filename) => {
  if (typeof window === "undefined" || !window.URL || !window.document) {
    throw new Error("Браузерное окружение недоступно");
  }
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
