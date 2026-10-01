import type {
  TransferBranchRef,
  TransferItem,
  TransferStatus,
} from "@entities/branch";

export const MAIN_WAREHOUSE_LABEL = "Главный склад";

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  completed: "Проведено",
  cancelled: "Отменено",
};

export const transferPlaceName = (ref: TransferBranchRef | undefined) =>
  ref?.name || MAIN_WAREHOUSE_LABEL;

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const transferItemPrice = (it: TransferItem) => num(it.price);

export const transferItemAmount = (it: TransferItem) =>
  it.amount != null && it.amount !== ""
    ? num(it.amount)
    : num(it.quantity) * num(it.price);

export const fmtQty = (v: unknown) =>
  num(v).toLocaleString("ru-RU", { maximumFractionDigits: 8 });

export const fmtMoney = (v: unknown) =>
  num(v).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/** Значение <select>: "" = Главный склад, иначе id филиала. */
export const placeToApi = (value: string): string | null => value || null;

/** Значение для GET /main/products/list/?branch= (null — главный склад). */
export const placeToStockParam = (value: string): string | null => value || null;

export const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const TRANSFER_STATUS_TONE: Record<TransferStatus, string> = {
  completed: "success",
  cancelled: "danger",
};

/** Направление перемещения относительно филиала `branchId`. */
export const transferDirection = (
  t: { from_branch: TransferBranchRef; to_branch: TransferBranchRef },
  branchId: string,
): "in" | "out" | null => {
  if (!branchId) return null;
  if (String(t.to_branch?.id ?? "") === branchId) return "in";
  if (String(t.from_branch?.id ?? "") === branchId) return "out";
  return null;
};

export const parseQty = (v: unknown) =>
  Number(String(v ?? "").replace(",", ".").trim());

export const shiftDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const PERIOD_PRESETS = [
  { value: "today", label: "Сегодня", days: 0 },
  { value: "7d", label: "7 дней", days: 6 },
  { value: "30d", label: "30 дней", days: 29 },
  { value: "all", label: "Всё время", days: null },
] as const;

export const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
