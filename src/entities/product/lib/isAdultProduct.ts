const storageKey = (companyId?: string | number | null) =>
  `market_adult_products_${companyId || "default"}`;

const readIds = (companyId?: string | number | null): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)).filter(Boolean));
  } catch {
    return new Set();
  }
};

const writeIds = (ids: Set<string>, companyId?: string | number | null) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(companyId), JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
};

export function rememberAdultProduct(
  productId?: string | number | null,
  isAdult = false,
  companyId?: string | number | null,
) {
  const id = String(productId || "").trim();
  if (!id) return;
  const ids = readIds(companyId);
  if (isAdult) ids.add(id);
  else ids.delete(id);
  writeIds(ids, companyId);
}

export function isLocalAdultProduct(
  productId?: string | number | null,
  companyId?: string | number | null,
) {
  const id = String(productId || "").trim();
  if (!id) return false;
  return readIds(companyId).has(id);
}

type AdultProductLike = {
  id?: string | number | null;
  is_adult?: unknown;
  is_18_plus?: unknown;
} | null | undefined;

/**
 * Серверное поле `is_adult` имеет приоритет.
 * Пока бэкенд не отдаёт флаг, используем localStorage после сохранения карточки.
 */
export function isAdultProduct(
  product?: AdultProductLike,
  companyId?: string | number | null,
) {
  if (!product) return false;
  if (product.is_adult === true || product.is_18_plus === true) return true;
  if (product.is_adult === false || product.is_18_plus === false) return false;
  return isLocalAdultProduct(product.id, companyId);
}
