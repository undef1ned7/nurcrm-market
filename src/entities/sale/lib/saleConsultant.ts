export type SaleConsultant = {
  id: string;
  full_name: string;
  default_commission_percent?: string | null;
};

export type ConsultantDraft = {
  specify: boolean;
  consultantId: string;
  consultantName: string;
  commissionEnabled: boolean;
  percent: string;
};

export const EMPTY_CONSULTANT_DRAFT: ConsultantDraft = {
  specify: false,
  consultantId: "",
  consultantName: "",
  commissionEnabled: true,
  percent: "",
};

export function listFromPaged(data: unknown): unknown[] {
  if (Array.isArray((data as { results?: unknown[] })?.results)) {
    return (data as { results: unknown[] }).results;
  }
  return Array.isArray(data) ? data : [];
}

export function employeeDisplayName(employee: Record<string, unknown> | null | undefined): string {
  if (!employee || typeof employee !== "object") return "";
  const full = [employee.last_name, employee.first_name]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    String(employee.full_name || "").trim() ||
    String(employee.name || "").trim() ||
    full ||
    String(employee.email || "").trim() ||
    ""
  );
}

export function isActiveEmployee(employee: Record<string, unknown> | null | undefined): boolean {
  if (!employee) return false;
  if (employee.is_active === false || employee.is_active === 0) return false;
  if (employee.active === false) return false;
  return true;
}

export function normalizeConsultant(raw: unknown): SaleConsultant | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id ?? row.user ?? row.user_id;
  if (id == null || String(id).trim() === "") return null;
  const defaultPercent =
    row.default_commission_percent ?? row.market_default_sales_percent ?? null;
  return {
    id: String(id),
    full_name: employeeDisplayName(row) || "Сотрудник",
    default_commission_percent:
      defaultPercent == null || defaultPercent === ""
        ? null
        : String(defaultPercent).replace(",", "."),
  };
}

export function parseCommissionPercent(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

export function isValidCommissionPercent(value: number | null): boolean {
  return value != null && value >= 0 && value <= 100;
}

export function previewCommissionAmount(total: number, percent: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(percent)) return 0;
  return Math.round(((total * percent) / 100) * 100) / 100;
}

export function validateConsultantDraft(draft: ConsultantDraft | null | undefined): string | null {
  if (!draft?.specify) return null;
  if (!draft.consultantId) return "Выберите консультанта";
  if (!draft.commissionEnabled) return null;
  const raw = String(draft.percent ?? "").trim();
  if (raw === "") return "Укажите процент комиссии";
  const percent = parseCommissionPercent(raw);
  if (!isValidCommissionPercent(percent)) {
    return "Процент должен быть от 0 до 100";
  }
  return null;
}

export function buildCheckoutConsultantPayload(draft: ConsultantDraft | null | undefined): {
  consultant_id?: string;
  consultant_commission_enabled?: boolean;
  consultant_commission_percent?: string;
} {
  if (!draft?.specify || !draft.consultantId) return {};
  const enabled = Boolean(draft.commissionEnabled);
  const parsed = parseCommissionPercent(draft.percent);
  const percent = enabled && parsed != null ? parsed : 0;
  return {
    consultant_id: draft.consultantId,
    consultant_commission_enabled: enabled,
    consultant_commission_percent: percent.toFixed(2),
  };
}

const PERCENT_SCHEMES = new Set(["percent", "salary_plus_percent"]);

export function pickDefaultSalesPercent(
  profiles: unknown[],
  branchId?: string | number | null,
): string {
  const list = Array.isArray(profiles) ? profiles : [];
  const usable = list.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const profile = item as Record<string, unknown>;
    if (!PERCENT_SCHEMES.has(String(profile.pay_scheme || ""))) return false;
    const percent = parseCommissionPercent(profile.sales_percent as string | number);
    return percent != null && percent >= 0 && percent <= 100;
  }) as Record<string, unknown>[];
  if (!usable.length) return "";

  const branch = branchId != null && String(branchId).trim() !== "" ? String(branchId) : "";
  const byBranch = branch
    ? usable.find((profile) => String(profile.branch ?? profile.branch_id ?? "") === branch)
    : null;
  const global = usable.find(
    (profile) => profile.branch == null && profile.branch_id == null,
  );
  const picked = byBranch || global || usable[0];
  const percent = parseCommissionPercent(picked.sales_percent as string | number);
  return percent == null ? "" : String(percent);
}

export function consultantDisplayFromSale(sale: Record<string, unknown> | null | undefined): string {
  if (!sale) return "—";
  const display = sale.consultant_display || sale.consultant_name;
  if (display) return String(display);
  if (sale.consultant && typeof sale.consultant === "object") {
    return employeeDisplayName(sale.consultant as Record<string, unknown>) || "—";
  }
  return "—";
}

export function consultantCommissionLabel(
  sale: Record<string, unknown> | null | undefined,
  { showZero = false }: { showZero?: boolean } = {},
): string {
  if (!sale) return "—";
  const hasConsultant =
    Boolean(sale.consultant) ||
    Boolean(sale.consultant_display) ||
    Boolean(sale.consultant_name);
  if (!hasConsultant) return "—";
  const amount = parseCommissionPercent(sale.consultant_commission_amount as string | number) || 0;
  const percent = parseCommissionPercent(sale.consultant_commission_percent as string | number);
  if (amount <= 0 && !showZero) return "—";
  const amountText = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (percent == null) return `${amountText} с`;
  return `${percent} % · ${amountText} с`;
}

export function receiptConsultantName(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) return "";
  const nested = payload.consultant;
  if (nested && typeof nested === "object") {
    const fromNested = employeeDisplayName(nested as Record<string, unknown>);
    if (fromNested) return fromNested;
  }
  return String(
    payload.consultant_display || payload.consultant_name || "",
  ).trim();
}
