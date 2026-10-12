import i18n from "i18next";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { addToast, type ToastType } from "./toastStore";
import { realtimeLevelToToastType } from "./realtimeEvents";

export type NotifyOptions = {
  title?: string;
  duration?: number;
};

function show(type: ToastType, message: string, options?: NotifyOptions) {
  if (!message?.trim()) return;
  addToast({
    type,
    message: message.trim(),
    title: options?.title?.trim() || undefined,
    duration: options?.duration,
  });
}

function t(key: string, params?: Record<string, unknown>) {
  return i18n.t(key, params ?? {});
}

export const notify = {
  success(message: string, options?: NotifyOptions) {
    show("success", message, options);
  },

  error(message: string, options?: NotifyOptions) {
    show("error", message, {
      ...options,
      title: options?.title ?? t("common.error"),
    });
  },

  warning(message: string, options?: NotifyOptions) {
    show("warning", message, {
      ...options,
      title: options?.title ?? t("common.warning"),
    });
  },

  info(message: string, options?: NotifyOptions) {
    show("info", message, options);
  },

  /** Операция выполнена, но POST cashflow (legacy) не удался */
  cashflowPartialFailure(error?: unknown, contextKey?: string) {
    const detail = error
      ? validateResErrors(error, "")
      : "";
    const base = contextKey
      ? t(contextKey)
      : t("notifications.cashflow.partialFailure");
    const message = detail ? `${base} ${detail}` : base;
    show("warning", message, {
      title: t("common.warning"),
      duration: 8000,
    });
  },

  /** Показ toast из WS / CRM notification payload */
  fromRealtime(payload: Record<string, unknown> | null | undefined) {
    if (!payload || typeof payload !== "object") return;

    const title = String(payload.title || "").trim();
    const body = String(
      payload.message || payload.body || payload.text || "",
    ).trim();
    const type = realtimeLevelToToastType(
      payload.level ?? payload.importance ?? payload.priority,
    );

    if (!title && !body) return;

    show(type, body || title, {
      title: body ? title || undefined : undefined,
      duration: type === "error" ? 9000 : 6500,
    });
  },
};

export function getCashflowPartialFailureKey(
  context:
    | "product"
    | "purchase"
    | "sale"
    | "debt"
    | "return"
    | "writeoff"
    | "accept"
    | "supplierReturn",
): string {
  return `notifications.cashflow.partialFailure.${context}`;
}
