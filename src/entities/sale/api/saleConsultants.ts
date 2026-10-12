import api from "@shared/api";
import {
  isActiveEmployee,
  listFromPaged,
  normalizeConsultant,
  pickDefaultSalesPercent,
  type SaleConsultant,
} from "../lib/saleConsultant";

async function fetchAllPages(startUrl: string, maxPages = 40): Promise<unknown[]> {
  const acc: unknown[] = [];
  let url: string | null = startUrl;
  let guard = 0;
  while (url && guard < maxPages) {
    const { data } = await api.get(url);
    acc.push(...listFromPaged(data));
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

export async function fetchSaleConsultants(): Promise<SaleConsultant[]> {
  try {
    const { data } = await api.get("/main/pos/sale-consultants/");
    const list = listFromPaged(data)
      .map(normalizeConsultant)
      .filter((item): item is SaleConsultant => Boolean(item));
    if (list.length || data?.results != null || Array.isArray(data)) {
      return list;
    }
  } catch {
    /* endpoint may be missing until backend ships */
  }

  const rows = await fetchAllPages("/users/employees/?is_active=1");
  return rows
    .filter((row) => isActiveEmployee(row as Record<string, unknown>))
    .map(normalizeConsultant)
    .filter((item): item is SaleConsultant => Boolean(item));
}

export async function fetchConsultantDefaultPercent(
  userId: string,
  branchId?: string | number | null,
): Promise<string> {
  if (!userId) return "";
  let url: string | null = `/main/market-sale-employee-pay-profiles/?user=${encodeURIComponent(userId)}`;
  const acc: unknown[] = [];
  let guard = 0;
  while (url && guard < 40) {
    const { data } = await api.get(url);
    acc.push(...listFromPaged(data));
    url = data?.next || null;
    guard += 1;
  }
  if (acc.length) return pickDefaultSalesPercent(acc, branchId);

  url = "/main/market-sale-employee-pay-profiles/";
  guard = 0;
  while (url && guard < 40) {
    const { data } = await api.get(url);
    const chunk = listFromPaged(data).filter((profile) => {
      const row = profile as Record<string, unknown>;
      return String(row?.user ?? row?.user_id ?? "") === String(userId);
    });
    acc.push(...chunk);
    url = data?.next || null;
    guard += 1;
  }
  return pickDefaultSalesPercent(acc, branchId);
}
