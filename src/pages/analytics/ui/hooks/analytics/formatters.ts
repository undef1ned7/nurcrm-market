
export const saleStatusInfo = (sale) => {
  const s = String(sale?.status || "").toLowerCase();
  const pm = String(sale?.payment_method || "").toLowerCase();
  if (["canceled", "cancelled", "refunded", "returned"].includes(s)) {
    return { label: "Отменено", variant: "canceled" };
  }
  if (pm === "debt" || s === "debt" || s === "unpaid" || s === "credit") {
    return { label: "Долг", variant: "debt" };
  }
  if (s === "partial" || s === "partially_paid") {
    return { label: "Частично", variant: "debt" };
  }
  return { label: "Оплачено", variant: "paid" };
};

export const formatDateForAPI = (date, includeTime = true) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (!includeTime) return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const mapTabToAPI = (tab) => {
  const tabMap = {
    sales: "sales",
    warehouse: "stock",
    purchases: "purchases",
    cashiers: "cashboxes",
    shifts: "shifts",
    products: "products",
    suppliers: "suppliers",
    users: "users",
    finance: "finance",
    procurement: "procurement",
    abc: "abc",
  };
  return tabMap[tab] || "sales";
};

export const formatNumber = (num) => {
  if (typeof num === "string") num = parseFloat(num);
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const formatAnalyticsQty = (v) => {
  if (v == null || v === "") return "—";
  const n =
    typeof v === "string"
      ? parseFloat(String(v).replace(",", "."))
      : Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export const formatDateForChart = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
};

export const formatCurrency = (num, decimals = 2) => {
  if (typeof num === "string") num = parseFloat(num);
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
