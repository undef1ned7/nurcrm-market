import api from "@shared/api";

/**
 * Версия каталога компании — `GET /main/products/catalog-version/` (~30 мс).
 * Меняется при любой правке товара, продаже, приходе, удалении
 * (docs/backend/calculator-after-stress-test/02-catalog-change-marker.md).
 * По ней автообновления узнают, что каталог не менялся, и не перекачивают его.
 */

/** Эндпоинта нет на этом сервере (404/405/501) — больше не спрашиваем до перезагрузки. */
let unsupported = false;

const isCanceled = (err: any) => err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

/**
 * Текущая версия каталога или `null`, если узнать нельзя (старый сервер, сбой).
 * `null` значит «не знаю» — вызывающий код тогда просто грузит данные, как раньше.
 * Отмену запроса пробрасывает, чтобы вызывающий код её видел.
 */
export async function fetchCatalogVersion(signal?: AbortSignal): Promise<string | null> {
  if (unsupported) return null;
  try {
    const { data } = await api.get("main/products/catalog-version/", { signal });
    const raw =
      typeof data === "string" || typeof data === "number"
        ? data
        : (data?.version ?? data?.catalog_version ?? null);
    return raw != null && String(raw).trim() ? String(raw) : null;
  } catch (err: any) {
    if (isCanceled(err)) throw err;
    if ([404, 405, 501].includes(err?.response?.status)) unsupported = true;
    return null;
  }
}

/** Для тестов: снова считать, что эндпоинт может быть. */
export function resetCatalogVersionSupport() {
  unsupported = false;
}
