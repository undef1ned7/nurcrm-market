import api from "@shared/api";
import { classifyBarcodeFallback } from "../lib/classifyBarcode";
import type { MassIncomingCheck, MassIncomingRow } from "../model/types";

const isMissing = (error: unknown) => {
  const status = (error as { response?: { status?: number }; status?: number })
    ?.response?.status ?? (error as { status?: number })?.status;
  return status === 404 || status === 405 || status === 501;
};

export async function checkWarehouseBarcode(
  warehouseId: string,
  barcode: string,
): Promise<MassIncomingCheck> {
  const code = String(barcode || "").trim();
  if (!code) return { status: "UNKNOWN", barcode: "" };

  if (warehouseId) {
    try {
      const { data } = await api.get(
        `/warehouse/${encodeURIComponent(warehouseId)}/barcode-check/${encodeURIComponent(code)}/`,
      );
      if (data?.status) {
        return {
          status: data.status,
          barcode: data.barcode || code,
          product: data.product || null,
          ambiguous: Boolean(data.ambiguous),
          matches: data.matches || [],
        };
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  return classifyBarcodeFallback(code);
}

export async function postMassIncoming(
  warehouseId: string,
  rows: MassIncomingRow[],
  comment?: string,
) {
  const items = rows
    .filter((row) => row.productId && row.quantity > 0)
    .map((row) => ({
      product_id: row.productId,
      quantity: String(row.quantity),
      list: row.status,
    }));

  const { data } = await api.post(
    `/warehouse/${encodeURIComponent(warehouseId)}/mass-incoming/`,
    { items, comment: comment || "Массовое сканирование" },
  );
  return data;
}

export async function createProductByBarcode({
  barcode,
  name,
  price,
  warehouseId,
}: {
  barcode: string;
  name: string;
  price?: string;
  warehouseId?: string;
}) {
  const payload: Record<string, unknown> = {
    barcode,
    name,
  };
  if (price) payload.price = price;
  if (warehouseId) payload.warehouse = warehouseId;

  if (warehouseId) {
    try {
      const { data } = await api.post(
        `/warehouse/${encodeURIComponent(warehouseId)}/products/scan/`,
        payload,
      );
      return data?.product || data;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  const { data } = await api.post("/main/products/create-by-barcode/", payload);
  return data?.product || data;
}

export { isMissing as isMassIncomingEndpointMissing };
