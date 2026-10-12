/**
 * «Оплачено из кассы (ящика) смены» — кассир помечает, что наличные на
 * закупку/брак/долг поставщику физически взяты из ящика его открытой смены,
 * а не из отдельной кассы «Переменные расходы».
 *
 * Складские/долговые операции всегда маршрутизируются на `expense_variable`
 * (см. `cashboxResolution.ts`) и никогда не входят в `drawer_expected_cash`
 * смены — это осознанная логика backend (см.
 * docs/backend/kassa/shift-cash-reconciliation-backend.md). Чтобы физическое
 * изъятие из ящика всё же отразилось при закрытии смены, мы ДОПОЛНИТЕЛЬНО (не
 * вместо) создаём ручную запись через уже существующий, ничем не
 * заблокированный эндпоинт `/crm/kassa` (`POST /construction/cashflows/`) на
 * кассу самой смены. Backend уже учитывает такие ручные записи в
 * `drawer_expected_cash` (см. docs/backend/kassa/BACKEND-QUESTIONS.md, п.51-52)
 * — никаких доработок backend для этого не требуется.
 *
 * @see docs/backend/kassa/shift-drawer-funding-purchases-backend.md
 */
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useUser } from "@entities/user";
import { addCashFlows, getCashBoxes, useCash, useCashflowRequestsEnabled } from "@entities/cash";
import { useOwnOpenShift } from "./useOwnOpenShift";
import {
  resolveBranchId,
  resolvePosCashboxRole,
  CASHBOX_ROLE,
} from "@shared/lib/tools/cashboxResolution";

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const cashboxRole = (cashbox: any): string =>
  norm(cashbox?.role ?? cashbox?.inferred_role ?? cashbox?.cashbox_role);

const cashboxId = (cashbox: any): string | null => {
  const id = cashbox?.id;
  return id == null ? null : String(id);
};

const isActiveCashbox = (cashbox: any): boolean => cashbox?.is_active !== false;

/**
 * Резолвит id POS-кассы, привязанной к открытой смене пользователя.
 *
 * Backend пока не отдаёт `shift.cashbox` (id) — только `cashbox_name` (см.
 * docs/backend/kassa/shift-drawer-funding-purchases-backend.md §2). Пока
 * этого поля нет, ищем кассу среди активных по той же роли, которую backend
 * использовал бы при резолве POS-кассы (`pos_branch`/`pos_main`, см.
 * `resolve_cashbox()` в auto-cashflows-backend.md). Если кандидатов больше
 * одного (известный баг дублирующихся `pos_main` — см.
 * pos-main-duplicate-role-bug.md) — пытаемся уточнить по имени кассы,
 * которое смена уже возвращает (`cashbox_name`). Если однозначно определить
 * не удалось — возвращаем `null`: лучше скрыть функцию, чем списать не с той
 * кассы.
 */
export function resolveShiftDrawerCashboxId({
  shift,
  cashboxes,
  profile,
  company,
}: {
  shift: any;
  cashboxes: any[] | null | undefined;
  profile?: any;
  company?: any;
}): string | null {
  if (!shift) return null;

  // Задел на будущее: если backend когда-нибудь начнёт отдавать id кассы
  // смены напрямую — используем его, не резолвя по роли.
  if (shift.cashbox != null) {
    if (typeof shift.cashbox === "object") {
      const direct = cashboxId(shift.cashbox);
      if (direct) return direct;
    } else if (String(shift.cashbox).trim()) {
      return String(shift.cashbox).trim();
    }
  }

  const list = Array.isArray(cashboxes) ? cashboxes.filter(isActiveCashbox) : [];
  if (!list.length) return null;

  const role = resolvePosCashboxRole(profile, company);
  const branchId = resolveBranchId(profile, company);

  const byRole = list.filter((c) => {
    if (cashboxRole(c) !== role) return false;
    if (role !== CASHBOX_ROLE.POS_BRANCH) return true;
    return String(c?.branch_id ?? c?.branch ?? "") === String(branchId ?? "");
  });

  if (byRole.length === 1) return cashboxId(byRole[0]);
  if (byRole.length > 1 && shift.cashbox_name) {
    const byName = byRole.filter(
      (c) => norm(c?.name) === norm(shift.cashbox_name),
    );
    if (byName.length === 1) return cashboxId(byName[0]);
  }

  return null;
}

/**
 * Данные для UI-чекбокса «Я заплатил из кассы смены»: доступна ли функция
 * прямо сейчас, и на какую кассу спишется сумма.
 */
export function useShiftDrawerFundingTarget() {
  const dispatch = useDispatch() as any;
  const { profile, company } = useUser() as any;
  const { shift, shiftId, loading: shiftLoading } = useOwnOpenShift();
  const { list: cashboxes } = useCash() as any;

  useEffect(() => {
    if (!cashboxes || cashboxes.length === 0) {
      dispatch(getCashBoxes({}));
    }
    // Список касс общий на компанию — достаточно подгрузить один раз.
  }, [dispatch]);

  const cashboxIdResolved = useMemo(
    () =>
      resolveShiftDrawerCashboxId({ shift, cashboxes, profile, company }),
    [shift, cashboxes, profile, company],
  );

  return {
    available: Boolean(shiftId && cashboxIdResolved),
    loading: shiftLoading,
    shiftId,
    cashboxId: cashboxIdResolved,
    cashboxName: shift?.cashbox_name ?? null,
  };
}

export type RecordShiftDrawerOutflowArgs = {
  cashboxId: string;
  amount: number;
  name: string;
};

export type RecordShiftDrawerOutflowResult =
  | { ok: true }
  | { ok: false; error?: unknown };

/**
 * Записывает расход в кассу смены (см. модуль-комментарий выше). Статус —
 * та же формула, что уже используют ручные записи `/crm/kassa`
 * (`AddCashFlowsModal.tsx`, `Kassa.tsx`): approved для владельца или при
 * выключенных «Запросах на подтверждение», иначе pending. Это НЕ формула
 * авто-операций бизнес-эндпоинтов (`subscription_plan.name === "Старт"`) —
 * запись идёт через ручной эндпоинт кассы, у него своя политика статуса
 * (см. auto-cashflows-backend.md §«Политика status»).
 */
export function useRecordShiftDrawerOutflow() {
  const dispatch = useDispatch() as any;
  const { profile } = useUser() as any;
  const cashflowRequestsEnabled = useCashflowRequestsEnabled();

  return useCallback(
    async ({
      cashboxId,
      amount,
      name,
    }: RecordShiftDrawerOutflowArgs): Promise<RecordShiftDrawerOutflowResult> => {
      if (!cashboxId || !(amount > 0)) {
        return { ok: false, error: "invalid_amount_or_cashbox" };
      }
      const status =
        profile?.role === "owner" || !cashflowRequestsEnabled
          ? "approved"
          : "pending";
      try {
        const response: any = await dispatch(
          addCashFlows({
            cashbox: cashboxId,
            type: "expense",
            amount,
            name,
            status,
          }),
        );
        if (response?.error) {
          return { ok: false, error: response.payload };
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
    [dispatch, profile?.role, cashflowRequestsEnabled],
  );
}
