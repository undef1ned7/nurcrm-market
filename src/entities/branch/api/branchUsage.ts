import api from "@shared/api";
import i18n from "@shared/config/i18n";

export type BranchUsage = {
  openShifts: number | null;
  products: number | null;
  employees: number | null;
  transfers: number | null;
};

const countOf = (data: any): number | null => {
  if (typeof data?.count === "number") return data.count;
  if (Array.isArray(data?.results)) return data.results.length;
  if (Array.isArray(data)) return data.length;
  return null;
};

const count = async (url: string, params: Record<string, unknown>) => {
  try {
    const { data } = await api.get(url, { params });
    return countOf(data);
  } catch {
    // эндпоинта может не быть (например, перемещения) — «неизвестно», не блокируем
    return null;
  }
};

/**
 * Что привязано к филиалу перед удалением. `null` — не удалось узнать.
 * `branch` передаётся явно, поэтому не зависит от филиала текущего аккаунта.
 */
export async function fetchBranchUsage(branchId: string): Promise<BranchUsage> {
  const [openShifts, products, employees, transfers] = await Promise.all([
    count("/construction/shifts/", {
      branch: branchId,
      status: "open",
      page_size: 1,
    }),
    count("/main/products/list/", { branch: branchId, page_size: 1 }),
    count("/users/employees/", { branch: branchId, page_size: 1 }),
    count("/main/branch-transfers/", { branch: branchId, page_size: 1 }),
  ]);
  return { openShifts, products, employees, transfers };
}

/** Текст предупреждения; пусто, если ничего не привязано. */
export function describeBranchUsage(usage: BranchUsage): string {
  const parts: string[] = [];
  if (usage.openShifts) parts.push(i18n.t("crm.branches.list.usage.openShifts", { value: usage.openShifts }));
  if (usage.products) parts.push(i18n.t("crm.branches.list.usage.products", { value: usage.products }));
  if (usage.employees) parts.push(i18n.t("crm.branches.list.usage.employees", { value: usage.employees }));
  if (usage.transfers) parts.push(i18n.t("crm.branches.list.usage.transfers", { value: usage.transfers }));
  return parts.join(", ");
}
