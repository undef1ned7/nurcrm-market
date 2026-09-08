import { isBackendCashflowsEnabled } from "./backendCashflows";

/**
 * Роли касс для маршрутизации на бэкенде.
 * Бэк сопоставляет role (+ branch_id) с записью Cashbox — не по «первой в списке».
 *
 * @see docs/backend/kassa/auto-cashflows-backend.md — раздел «Маршрутизация касс»
 */
export const CASHBOX_ROLE = {
  /** POS / продажи: основная касса компании («Основная касса компании») */
  POS_MAIN: "pos_main",
  /** POS филиала («Касса филиала …») */
  POS_BRANCH: "pos_branch",
  /** Закупки, переменные расходы («Переменные расходы») */
  EXPENSE_VARIABLE: "expense_variable",
  /** Постоянные расходы («Постоянные расходы») */
  EXPENSE_FIXED: "expense_fixed",
} as const;

export type CashboxRole = (typeof CASHBOX_ROLE)[keyof typeof CASHBOX_ROLE];

/** Контекст для бэка: откуда брать кассу вместо явного cashbox_id */
export type CashRoutingContext = {
  branch_id?: string | number | null;
  cashbox_role?: CashboxRole | null;
  /** Открытая смена кассира — приоритет для POS income */
  shift_id?: string | number | null;
};

export function resolveBranchId(
  profile?: { active_branch?: unknown; branch?: unknown } | null,
  company?: { active_branch?: unknown } | null,
): string | undefined {
  const raw =
    profile?.active_branch ??
    profile?.branch ??
    company?.active_branch ??
    null;
  if (raw == null || raw === "") return undefined;
  return String(raw);
}

/** Фронт не должен подставлять cashbox_id — выбор на бэке. */
export function shouldFrontendSendCashboxId(): boolean {
  return !isBackendCashflowsEnabled();
}

/**
 * Поля маршрутизации для тела бизнес-запроса (checkout, pay, shift open…).
 * Старый бэк игнорирует неизвестные поля.
 */
export function buildCashRoutingPayload(
  context: CashRoutingContext = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  const branchId = context.branch_id;
  if (branchId != null && String(branchId).trim()) {
    out.branch_id = String(branchId);
  }
  if (context.cashbox_role) {
    out.cashbox_role = context.cashbox_role;
  }
  if (context.shift_id != null && String(context.shift_id).trim()) {
    out.shift_id = String(context.shift_id);
  }
  return out;
}

/** Для legacy POST /construction/cashflows/: не слать cashbox, если не выбран явно. */
export function hasExplicitCashbox(
  cashbox: string | number | null | undefined,
): boolean {
  return cashbox != null && String(cashbox).trim() !== "";
}

/** POS: филиал → pos_branch, иначе основная касса компании. */
export function resolvePosCashboxRole(
  profile?: { active_branch?: unknown; branch?: unknown } | null,
  company?: { active_branch?: unknown } | null,
): CashboxRole {
  return resolveBranchId(profile, company)
    ? CASHBOX_ROLE.POS_BRANCH
    : CASHBOX_ROLE.POS_MAIN;
}

/** Маршрутизация для продаж / оплаты долга / открытия смены. */
export function buildPosRoutingFromUser(
  profile?: { active_branch?: unknown; branch?: unknown } | null,
  company?: { active_branch?: unknown } | null,
  shiftId?: string | number | null,
): Record<string, string> {
  const branch_id = resolveBranchId(profile, company);
  return buildCashRoutingPayload({
    branch_id,
    cashbox_role: resolvePosCashboxRole(profile, company),
    shift_id: shiftId,
  });
}

/** Закупки, переменные расходы, списания. */
export function buildExpenseVariableRouting(): Record<string, string> {
  return buildCashRoutingPayload({
    cashbox_role: CASHBOX_ROLE.EXPENSE_VARIABLE,
  });
}

/** Постоянные расходы (аренда, зарплата и т.п.). */
export function buildExpenseFixedRouting(): Record<string, string> {
  return buildCashRoutingPayload({
    cashbox_role: CASHBOX_ROLE.EXPENSE_FIXED,
  });
}

/**
 * Ожидаемая сумма в физическом ящике кассира: только размен + наличные продажи.
 * Складские закупки сюда не входят (они в кассе «Переменные расходы»).
 */
export function calcShiftDrawerExpected(
  openingCash: number,
  cashSalesTotal: number,
  drawerOutflows = 0,
): number {
  const opening = Number.isFinite(openingCash) ? openingCash : 0;
  const cashSales = Number.isFinite(cashSalesTotal) ? cashSalesTotal : 0;
  const outflows = Number.isFinite(drawerOutflows) ? drawerOutflows : 0;
  return opening + cashSales - outflows;
}

/**
 * Оценка суммы складских/закупочных списаний, ошибочно учтённых в expected_cash смены.
 * Если бэк считает expected = opening + cash_sales - all_expenses на POS-кассе,
 * а закупки шли с той же кассы — разница ≈ сумма закупок.
 */
export function estimateShiftWarehouseDrain(
  openingCash: number,
  cashSalesTotal: number,
  ledgerExpectedCash: number,
): number {
  const drawerExpected = calcShiftDrawerExpected(openingCash, cashSalesTotal);
  const drain = drawerExpected - ledgerExpectedCash;
  return drain > 0.01 ? drain : 0;
}
