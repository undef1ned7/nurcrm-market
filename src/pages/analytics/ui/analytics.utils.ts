export const translateLowStockStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "critical") return "Критично";
  if (normalized === "low") return "Низкий";
  return String(status || "Низкий").trim() || "Низкий";
};

export const normalizeLowStockStatusType = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "critical" || normalized === "критично") return "critical";
  return "low";
};

export const normalizeExpiryStatusType = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (["expired", "просрочен"].includes(normalized)) return "critical";
  if (["critical", "истекает"].includes(normalized)) return "critical";
  return "low";
};

export const barPercentOfMax = (value, values) => {
  const nums = (values || []).map((v) => Number(v) || 0);
  const max = Math.max(0, ...nums);
  if (max <= 0) return 0;
  return Math.max(2, ((Number(value) || 0) / max) * 100);
};

export const sortStockList = (list, mode) => {
  const arr = [...(list || [])];
  switch (mode) {
    case "name-asc":
      return arr.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "ru"),
      );
    case "name-desc":
      return arr.sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || ""), "ru"),
      );
    case "stock-desc":
      return arr.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    case "stock-asc":
      return arr.sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    default:
      return arr;
  }
};

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
  if (!includeTime) {
    return year + "-" + month + "-" + day;
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds;
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
  };
  return tabMap[tab] || "sales";
};

export const formatNumber = (num) => {
  if (typeof num === "string") {
    num = parseFloat(num);
  }
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
  return day + "." + month;
};

export const formatCurrency = (num, decimals = 2) => {
  if (typeof num === "string") {
    num = parseFloat(num);
  }
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
