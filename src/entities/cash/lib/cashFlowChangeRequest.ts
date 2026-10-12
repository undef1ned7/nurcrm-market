/**
 * Заявки на редактирование / отмену уже одобренных движений кассы.
 *
 * Движение (CashFlow, status=approved) нельзя менять напрямую из UI — правка и
 * отмена всегда создают заявку, привязанную к той же кассе, и попадают в тот же
 * список «Запросы» (?status=pending&cashbox={id}). Владелец подтверждает —
 * только тогда деньги двигаются.
 *
 * @see docs/backend/kassa/cashflow-edit-cancel-request-backend.md
 */

/**
 * Фичефлаг. Пока бэкенд-эндпоинты не готовы — по умолчанию выкл, кнопки
 * «Изменить»/«Отменить» на экране кассы не показываются.
 */
export function isCashFlowChangeRequestsEnabled(): boolean {
  return import.meta.env.VITE_CASHFLOW_CHANGE_REQUESTS === "true";
}

const norm = (v: unknown) => String(v ?? "").trim();

/** Стабильная подпись операции — чтобы повторный сабмит не плодил заявки. */
const stableSignature = (parts: Array<string | number>) =>
  parts
    .map((p) => norm(p))
    .join("|")
    .replace(/\s+/g, " ");

export type FlowType = "income" | "expense";

export interface ProposedFlowChange {
  name: string;
  amount: string;
  type: FlowType;
}

export interface EditRequestPayload {
  proposed: ProposedFlowChange;
  reason: string;
  idempotency_key: string;
}

export interface CancelRequestPayload {
  reason: string;
  idempotency_key: string;
}

/** Приводит сумму к строке с точкой, без пробелов/запятых. */
export const normalizeAmount = (value: unknown): string => {
  const s = norm(value).replace(/\s+/g, "").replace(",", ".");
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : "";
};

export const isValidProposedChange = (p: Partial<ProposedFlowChange>): boolean => {
  const amount = normalizeAmount(p.amount);
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (p.type !== "income" && p.type !== "expense") return false;
  if (!norm(p.name)) return false;
  return true;
};

/** true — предложенные значения реально отличаются от текущих. */
export const hasProposedDiff = (
  current: Partial<ProposedFlowChange>,
  proposed: ProposedFlowChange,
): boolean =>
  norm(current.name) !== norm(proposed.name) ||
  normalizeAmount(current.amount) !== normalizeAmount(proposed.amount) ||
  norm(current.type) !== norm(proposed.type);

export const buildEditRequestPayload = (
  targetFlowId: string,
  proposedRaw: ProposedFlowChange,
  reason: string,
): EditRequestPayload => {
  const proposed: ProposedFlowChange = {
    name: norm(proposedRaw.name),
    amount: normalizeAmount(proposedRaw.amount),
    type: proposedRaw.type,
  };
  return {
    proposed,
    reason: norm(reason),
    idempotency_key: `cfedit-${targetFlowId}-${stableSignature([
      proposed.name,
      proposed.amount,
      proposed.type,
      reason,
    ])}`,
  };
};

export const buildCancelRequestPayload = (
  targetFlowId: string,
  reason: string,
): CancelRequestPayload => ({
  reason: norm(reason),
  idempotency_key: `cfcancel-${targetFlowId}`,
});
