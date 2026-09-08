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
  readonly DEV_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
