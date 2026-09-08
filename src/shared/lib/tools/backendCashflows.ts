/**
 * When `VITE_BE_CASHFLOWS=true`, NurCRM API creates income/expense cashflows
 * atomically inside business endpoints. The frontend must not POST
 * `/construction/cashflows/` after those operations (manual kassa UI still may).
 *
 * Default (unset/false): legacy frontend fallback via `addCashFlows`.
 *
 * @see docs/backend/kassa/auto-cashflows-backend.md
 */
export function isBackendCashflowsEnabled(): boolean {
  return import.meta.env.VITE_BE_CASHFLOWS === "true";
}

/** True when the FE should still POST auto cashflows after business ops. */
export function shouldPostCashflowFallback(): boolean {
  return !isBackendCashflowsEnabled();
}
