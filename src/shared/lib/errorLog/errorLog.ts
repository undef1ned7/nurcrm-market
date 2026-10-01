/**
 * Журнал ошибок приложения (раздел «Помощь → Журнал ошибок»).
 *
 * Хранит только предупреждения и ошибки (включая разрывы связи с сервером).
 * Запись живёт в localStorage этого браузера и никуда не отправляется само.
 *
 * Как в программе владельца, журнал разбит на два «файла»: текущий и
 * предыдущий. Когда текущий переполняется, он становится предыдущим, а
 * прежний предыдущий удаляется — показываются записи из двух последних.
 *
 * Пароли и токены в журнал не попадают: сообщения проходят через
 * `sanitizeLogText`, а из адресов запросов убирается query-строка.
 */

export type ErrorLogLevel = "warning" | "error" | "critical" | "deferred";

/** Известные коды записей — для них в UI есть понятный перевод. */
export type ErrorLogCode =
  | "network_lost"
  | "network_restored"
  | "printer_error"
  | "subscription_expired"
  | "subscription_expiring"
  | "permission_denied"
  | "drawer_pulse"
  | "request_timeout"
  | "server_error"
  | "script_error"
  | "render_crash"
  | "sale_deferred";

export type ErrorLogEntry = {
  id: string;
  /** Unix-время в миллисекундах. */
  ts: number;
  level: ErrorLogLevel;
  code?: ErrorLogCode | string;
  /** Исходное техническое сообщение (уже очищенное). */
  message: string;
  /** Подстановки для перевода (например, порт ящика). */
  params?: Record<string, string | number>;
};

export const ERROR_LOG_CURRENT_KEY = "nur_error_log_current";
export const ERROR_LOG_PREVIOUS_KEY = "nur_error_log_previous";
/** Сколько записей помещается в один «файл» журнала. */
export const ERROR_LOG_FILE_LIMIT = 300;
const MAX_MESSAGE_LENGTH = 500;
const DEDUPE_WINDOW_MS = 2000;

const listeners = new Set<() => void>();

function readFile(key: string): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFile(key: string, entries: ErrorLogEntry[]) {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* хранилище недоступно или переполнено — журнал не должен ронять приложение */
  }
}

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore */
    }
  });
}

/** Убирает из текста токены, пароли и длинные хвосты. */
export function sanitizeLogText(input: unknown): string {
  let text = typeof input === "string" ? input : String(input ?? "");
  text = text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, "***")
    .replace(
      /("?(?:password|passwd|pwd|token|access|refresh|secret|authorization)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,&;}]+)/gi,
      "$1***",
    );
  if (text.length > MAX_MESSAGE_LENGTH) {
    text = `${text.slice(0, MAX_MESSAGE_LENGTH)}…`;
  }
  return text;
}

/** Адрес запроса без query-строки и домена. */
export function safeRequestPath(url: unknown): string {
  const raw = String(url ?? "");
  const withoutQuery = raw.split("?")[0].split("#")[0];
  return withoutQuery.replace(/^https?:\/\/[^/]+/i, "");
}

function makeId(ts: number) {
  return `${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logEvent(
  level: ErrorLogLevel,
  message: unknown,
  extra: { code?: ErrorLogCode | string; params?: Record<string, string | number> } = {},
): ErrorLogEntry | null {
  const ts = Date.now();
  const entry: ErrorLogEntry = {
    id: makeId(ts),
    ts,
    level,
    message: sanitizeLogText(message),
    ...(extra.code ? { code: extra.code } : {}),
    ...(extra.params ? { params: extra.params } : {}),
  };

  const current = readFile(ERROR_LOG_CURRENT_KEY);
  const last = current[current.length - 1];
  if (
    last &&
    last.level === entry.level &&
    last.code === entry.code &&
    last.message === entry.message &&
    ts - last.ts < DEDUPE_WINDOW_MS
  ) {
    return null;
  }

  current.push(entry);
  if (current.length > ERROR_LOG_FILE_LIMIT) {
    writeFile(ERROR_LOG_PREVIOUS_KEY, current);
    writeFile(ERROR_LOG_CURRENT_KEY, [entry]);
  } else {
    writeFile(ERROR_LOG_CURRENT_KEY, current);
  }
  emit();
  return entry;
}

export const logWarning = (
  message: unknown,
  extra?: Parameters<typeof logEvent>[2],
) => logEvent("warning", message, extra);
export const logError = (
  message: unknown,
  extra?: Parameters<typeof logEvent>[2],
) => logEvent("error", message, extra);
export const logCritical = (
  message: unknown,
  extra?: Parameters<typeof logEvent>[2],
) => logEvent("critical", message, extra);
/** Действие, отложенное кассиром (отложенная продажа и т.п.). */
export const logDeferred = (
  message: unknown,
  extra?: Parameters<typeof logEvent>[2],
) => logEvent("deferred", message, extra);

/** Записи из двух последних «файлов», новые сверху. */
export function readErrorLog(): ErrorLogEntry[] {
  // Хронологический порядок файлов → разворот → устойчивая сортировка по времени:
  // записи в одну миллисекунду остаются в порядке «новые сверху».
  const all = [
    ...readFile(ERROR_LOG_PREVIOUS_KEY),
    ...readFile(ERROR_LOG_CURRENT_KEY),
  ].reverse();
  return all.sort((a, b) => b.ts - a.ts);
}

export function clearErrorLog() {
  try {
    localStorage.removeItem(ERROR_LOG_CURRENT_KEY);
    localStorage.removeItem(ERROR_LOG_PREVIOUS_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Подписка на изменения (включая другие вкладки). Возвращает отписку. */
export function subscribeErrorLog(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === ERROR_LOG_CURRENT_KEY ||
      event.key === ERROR_LOG_PREVIOUS_KEY ||
      event.key === null
    ) {
      listener();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Текстовая выгрузка журнала для поддержки. */
export function formatErrorLogAsText(
  entries: ErrorLogEntry[],
  header: Record<string, string> = {},
): string {
  const lines = Object.entries(header).map(([k, v]) => `${k}: ${v}`);
  if (lines.length) lines.push("");
  entries.forEach((entry) => {
    const d = new Date(entry.ts);
    lines.push(
      `${d.toISOString()}\t${entry.level}\t${entry.code ?? "-"}\t${entry.message}`,
    );
  });
  return lines.join("\n");
}
