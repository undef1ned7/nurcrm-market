/** Ошибки формата и opaque payload для печати */

export function isOpaquePrintPayload(payload: unknown): boolean {
  return (
    payload instanceof Blob ||
    payload instanceof ArrayBuffer ||
    ArrayBuffer.isView(payload) ||
    (typeof ReadableStream !== "undefined" && payload instanceof ReadableStream)
  );
}

export function isPrintFormatError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || "");
  return (
    msg.includes("Неизвестный формат") ||
    msg.includes("невалидный PDF") ||
    msg.includes("не JSON") ||
    msg.includes("Invalid JSON") ||
    msg.includes("Empty print payload")
  );
}
