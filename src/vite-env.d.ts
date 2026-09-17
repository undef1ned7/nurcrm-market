/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_API_URL?: string;
  readonly VITE_REGISTER_ACCESS_PASSWORD?: string;
  readonly VITE_REGISTER_ACCESS_BACKEND?: string;
  readonly VITE_BUILDING_APP_URL?: string;
  readonly VITE_MAIN_APP_URL?: string;
  /** When `"true"`, BE creates auto cashflows; FE skips POST after business ops. */
  readonly VITE_BE_CASHFLOWS?: string;
  /** When `"true"`, show "Edit/Cancel" actions on approved cashbox movements. */
  readonly VITE_CASHFLOW_CHANGE_REQUESTS?: string;
  /** When `"true"`, show "Delete" action (with merge-on-delete) for cashboxes in /crm/kassa. */
  readonly VITE_CASHBOX_DELETE?: string;
  /** When `"true"`, show "For debts" checkbox/role assignment for cashboxes in /crm/kassa. */
  readonly VITE_CASHBOX_DEBT_ROLE?: string;
  readonly DEV_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
