import api from "@shared/api";
import { PRODUCT_FORM_LAYOUT_URL } from "./constants";
import { normalizeLayout } from "./storage";
import type { ProductFormLayout } from "./types";

export function isMissingLayoutEndpoint(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

export async function fetchProductFormLayout(): Promise<ProductFormLayout> {
  const { data } = await api.get(PRODUCT_FORM_LAYOUT_URL);
  return normalizeLayout(data);
}

export async function updateProductFormLayout(
  layout: ProductFormLayout,
): Promise<ProductFormLayout> {
  const { data } = await api.patch(PRODUCT_FORM_LAYOUT_URL, {
    hidden: layout.hidden,
  });
  return normalizeLayout(data);
}
