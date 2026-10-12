const AXIOS_STATUS_MESSAGE = /^Request failed with status code \d+$/i;
const GENERIC_ERROR_MESSAGE = /^(Rejected|Aborted)$/i;

const isAxiosError = (error: any) =>
  error?.isAxiosError === true ||
  (error?.config != null && typeof error?.response !== "undefined");

/** Тело ошибки API из axios или из Promise.reject(response.data) */
export const getApiErrorPayload = (error: any) => {
  if (error == null) return null;
  if (typeof error === "string") return error;
  if (error?.response?.data != null) return error.response.data;
  if (typeof error === "object" && !isAxiosError(error)) {
    return error;
  }
  const msg = error?.message;
  return typeof msg === "string" ? msg : null;
};

const isGenericMessage = (message: any) => {
  const trimmed = String(message ?? "").trim();
  if (!trimmed) return true;
  return (
    AXIOS_STATUS_MESSAGE.test(trimmed) || GENERIC_ERROR_MESSAGE.test(trimmed)
  );
};

const dedupe = (parts: any) => {
  const seen = new Set();
  const result: any[] = [];
  for (const part of parts) {
    const key = part.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
};

const formatCandidate = (candidate: any) => {
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  if (Array.isArray(candidate) && candidate.length > 0) {
    const parts = candidate
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return (
            item.message ||
            item.msg ||
            item.detail ||
            // Вложенные ошибки полей, напр. { quantity_fact: ["..."] }
            formatCandidate(item) ||
            ""
          );
        }
        return "";
      })
      .filter(Boolean);
    const unique = dedupe(parts);
    if (unique.length > 0) {
      return unique.join(unique.length > 1 ? "\n" : ", ");
    }
  }
  if (candidate && typeof candidate === "object") {
    const direct = formatCandidate(
      candidate.detail ?? candidate.message ?? candidate.error,
    );
    if (direct) return direct;

    // Собираем сообщения из всех полей объекта (DRF возвращает { field: [...] }).
    const parts: any[] = [];
    for (const value of Object.values(candidate)) {
      const parsed = formatCandidate(value);
      if (parsed) parts.push(parsed);
    }
    const unique = dedupe(parts);
    if (unique.length > 0) {
      return unique.join(unique.length > 1 ? "\n" : ", ");
    }
  }
  return null;
};

/** Страница ошибки сервера (Django/nginx на 500/502) — не текст для пользователя. */
const looksLikeHtml = (text: string) => /^<(!doctype|html|head|body|\?xml)\b/i.test(text);

const extractFromResponseData = (data: any) => {
  if (!data) return null;
  if (typeof data === "string" && data.trim()) {
    const trimmed = data.trim();
    return isGenericMessage(trimmed) || looksLikeHtml(trimmed) ? null : trimmed;
  }

  if (typeof data !== "object") return null;

  for (const key of ["detail", "message", "error", "errors"]) {
    const parsed = formatCandidate(data[key]);
    if (parsed) return parsed;
  }

  const nonField = formatCandidate(data.non_field_errors);
  if (nonField) return nonField;

  const fieldMessages: any[] = [];
  // У объекта-исключения (Error/AxiosError) name — это «AxiosError», а code —
  // «ERR_BAD_RESPONSE»: не текст для пользователя. У тела ответа DRF name и code —
  // обычные поля формы ({ code: ["Филиал с таким кодом уже существует."] }),
  // их пропускать нельзя.
  const isErrorObject = data instanceof Error || "stack" in data;
  const skipKeys = new Set([
    "detail",
    "message",
    "error",
    "errors",
    "non_field_errors",
    ...(isErrorObject ? ["name", "code"] : []),
    "stack",
  ]);

  for (const [key, value] of Object.entries(data)) {
    if (skipKeys.has(key)) continue;
    const parsed = formatCandidate(value);
    if (parsed) {
      fieldMessages.push(parsed);
    }
  }

  if (fieldMessages.length > 0) {
    return fieldMessages.join("; ");
  }

  return null;
};

export const validateResErrors = (
  error: any,
  fallbackMessage = "Произошла ошибка",
) => {
  if (!error) return fallbackMessage;

  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed && !isGenericMessage(trimmed) && !looksLikeHtml(trimmed)) return trimmed;
    return fallbackMessage;
  }

  const payload = getApiErrorPayload(error);

  const fromAxios = extractFromResponseData(error?.response?.data);
  if (fromAxios) return fromAxios;

  const fromPayload = extractFromResponseData(payload);
  if (fromPayload) return fromPayload;

  const genericMessage =
    typeof error?.message === "string" ? error.message.trim() : "";
  if (genericMessage && !isGenericMessage(genericMessage)) {
    return genericMessage;
  }

  return fallbackMessage;
};
