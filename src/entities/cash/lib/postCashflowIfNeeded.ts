import { addCashFlows } from "../model/cashSlice";
import { shouldPostCashflowFallback } from "@shared/lib/tools/backendCashflows";
import { hasExplicitCashbox } from "@shared/lib/tools/cashboxResolution";
import {
  getCashflowPartialFailureKey,
  notify,
} from "@shared/lib/notifications";

export type CashflowPayload = {
  name?: string;
  amount?: string | number;
  cashbox?: string | number;
  type?: "income" | "expense" | string;
  status?: string;
  source_cashbox_flow_id?: string | number;
  source_business_operation_id?: string;
  [key: string]: unknown;
};

export type CashflowPartialFailureContext =
  | "product"
  | "purchase"
  | "sale"
  | "debt"
  | "return"
  | "writeoff"
  | "accept"
  | "supplierReturn";

export type PostCashflowOptions = {
  /**
   * При ошибке POST cashflow показать warning и не бросать исключение.
   * Бизнес-операция уже выполнена — пользователь должен знать о расхождении в кассе.
   */
  warnOnFailure?: boolean;
  /** Контекст для i18n-сообщения (см. notifications.cashflow.partialFailure.*) */
  failureContext?: CashflowPartialFailureContext;
};

type UnwrapDispatch = (action: unknown) => { unwrap: () => Promise<unknown> };

/**
 * Posts a cashflow only when backend auto-cashflows are disabled
 * (`VITE_BE_CASHFLOWS` not `"true"`). No-op when the backend owns creation.
 */
export async function postCashflowIfNeeded(
  dispatch: UnwrapDispatch | ((action: unknown) => unknown),
  payload: CashflowPayload,
  options?: PostCashflowOptions,
): Promise<unknown> {
  if (!shouldPostCashflowFallback()) {
    return undefined;
  }

  if (!hasExplicitCashbox(payload.cashbox)) {
    // Кассу выбирает бэк; не подставляем cashBoxes[0] на фронте.
    return undefined;
  }

  try {
    const result = (dispatch as UnwrapDispatch)(addCashFlows(payload) as any);
    return await result.unwrap();
  } catch (error) {
    if (options?.warnOnFailure) {
      const contextKey = options.failureContext
        ? getCashflowPartialFailureKey(options.failureContext)
        : undefined;
      notify.cashflowPartialFailure(error, contextKey);
      return undefined;
    }
    throw error;
  }
}
