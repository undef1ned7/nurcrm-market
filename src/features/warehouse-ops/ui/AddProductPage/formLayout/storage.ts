import {
  DEFAULT_PRODUCT_FORM_LAYOUT,
  PRODUCT_FORM_LAYOUT_STORAGE_PREFIX,
} from "./constants";
import { PRODUCT_FORM_BLOCK_IDS } from "./types";
import type { ProductFormBlockId, ProductFormLayout } from "./types";

export const storageKey = (companyId?: string | number | null) =>
  `${PRODUCT_FORM_LAYOUT_STORAGE_PREFIX}_${companyId || "default"}`;

const knownIds = new Set<string>(PRODUCT_FORM_BLOCK_IDS);

export function normalizeHidden(raw: unknown): ProductFormBlockId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ProductFormBlockId>();
  raw.forEach((item) => {
    const id = String(item || "");
    if (knownIds.has(id)) seen.add(id as ProductFormBlockId);
  });
  return PRODUCT_FORM_BLOCK_IDS.filter((id) => seen.has(id));
}

export function normalizeLayout(raw: unknown): ProductFormLayout {
  const hidden = normalizeHidden(
    raw && typeof raw === "object" ? (raw as { hidden?: unknown }).hidden : raw,
  );
  return { hidden };
}

export function loadProductFormLayout(
  companyId?: string | number | null,
): ProductFormLayout {
  if (typeof window === "undefined") return { ...DEFAULT_PRODUCT_FORM_LAYOUT };
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return { ...DEFAULT_PRODUCT_FORM_LAYOUT };
    return normalizeLayout(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PRODUCT_FORM_LAYOUT };
  }
}

export function saveProductFormLayout(
  layout: ProductFormLayout,
  companyId?: string | number | null,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(companyId),
      JSON.stringify({ hidden: normalizeHidden(layout?.hidden) }),
    );
  } catch {
    /* quota / private mode */
  }
}
