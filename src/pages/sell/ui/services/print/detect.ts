/** Определение формата ответа (PDF/JSON/base64) */

async function looksLikePdf(blob) {
  if (!(blob instanceof Blob)) return false;
  try {
    const head = await blob.slice(0, 8).text();
    return head.startsWith("%PDF-");
  } catch {
    return false;
  }
}
async function tryParseJsonFromBlob(blob) {
  try {
    const text = await blob.text();
    if (text.startsWith("data:application/pdf;base64,")) {
      const b64 = text.split(",")[1];
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return { pdfBlob: new Blob([bin], { type: "application/pdf" }) };
    }
    const json = JSON.parse(text);
    if (json && Array.isArray(json.items)) return { json };
    return null;
  } catch {
    return null;
  }
}

function unwrapPrintablePayload(source, depth = 0) {
  if (depth > 3 || source == null) return source;
  if (source instanceof Blob) return source;
  if (Array.isArray(source?.items)) return source;
  if (typeof source === "string") return source;
  if (typeof source !== "object") return source;

  const candidates = [
    source.receipt,
    source.checkoutResponse,
    source.payload,
    source.data,
    source.result,
    source.response,
    source.body,
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const unwrapped = unwrapPrintablePayload(candidate, depth + 1);
    if (
      unwrapped instanceof Blob ||
      typeof unwrapped === "string" ||
      Array.isArray(unwrapped?.items)
    ) {
      return unwrapped;
    }
  }

  return source;
}


export { looksLikePdf, tryParseJsonFromBlob, unwrapPrintablePayload };
