import { logError, logWarning, safeRequestPath } from "./errorLog";

/**
 * Автоматическая запись в журнал ошибок: обрывы связи, ответы сервера,
 * ошибки скриптов. Подключается один раз при старте (`installErrorCapture`).
 */

let networkDown = false;
let installed = false;

export function markNetworkLost() {
  if (networkDown) return;
  networkDown = true;
  logWarning("Network is unreachable", { code: "network_lost" });
}

export function markNetworkRestored() {
  if (!networkDown) return;
  networkDown = false;
  logWarning("Connection restored", { code: "network_restored" });
}

const isSubscriptionProblem = (status: number, detail: string) =>
  status === 402 || /подписк|subscription|срок действия/i.test(detail);

/** Вызывается из axios-перехватчика на каждую ошибку запроса. */
export function captureApiError(error: any) {
  if (!error || error.__errorLogged) return;
  if (error.code === "ERR_CANCELED" || error.name === "CanceledError") return;
  if (error.config?.skipErrorLog) return;

  const status: number | undefined = error.response?.status;
  const path = safeRequestPath(error.config?.url);
  const method = String(error.config?.method || "get").toUpperCase();
  const where = `${method} ${path}`;

  if (!error.response) {
    if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
      logWarning(`Timeout: ${where}`, { code: "request_timeout" });
      return;
    }
    if (
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      markNetworkLost();
    }
    return;
  }

  // 401 обрабатывает refresh-перехватчик
  if (status === 401) return;

  const detail = String(
    error.response?.data?.detail ?? error.response?.data?.message ?? "",
  );

  if (status === 402 || status === 403) {
    if (isSubscriptionProblem(status, detail)) {
      logWarning(`Subscription expired: ${where}`, {
        code: "subscription_expired",
      });
    } else {
      logWarning(`Permission denied: ${where}`, { code: "permission_denied" });
    }
    return;
  }

  if (status && status >= 500) {
    logError(`HTTP ${status}: ${where}`, { code: "server_error" });
  }
}

/** Успешный ответ — значит связь есть. */
export function captureApiSuccess() {
  markNetworkRestored();
}

export function installErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("offline", markNetworkLost);
  window.addEventListener("online", markNetworkRestored);

  window.addEventListener("error", (event) => {
    // Ошибки загрузки ресурсов (img/script) приходят без message
    if (!event.message) return;
    logError(
      `${event.message}${event.filename ? ` (${safeRequestPath(event.filename)}:${event.lineno})` : ""}`,
      { code: "script_error" },
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    // Ошибки API уже записаны перехватчиком axios
    if (reason?.isAxiosError) return;
    logError(reason?.message || String(reason ?? "Unhandled promise rejection"), {
      code: "script_error",
    });
  });
}
