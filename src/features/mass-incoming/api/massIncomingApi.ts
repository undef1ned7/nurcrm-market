import api from "@shared/api";
import i18n from "@shared/config/i18n";
import {
  classifyBarcodeFallback,
  findGlobalProduct,
  isCheckStatus,
  toMassIncomingProduct,
} from "../lib/classifyBarcode";
import type { MassIncomingCheck, MassIncomingRow } from "../model/types";

const isMissing = (error: unknown) => {
  const status = (error as { response?: { status?: number }; status?: number })
    ?.response?.status ?? (error as { status?: number })?.status;
  return status === 404 || status === 405 || status === 501;
};

const listFrom = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  const results = (data as { results?: unknown })?.results;
  return Array.isArray(results) ? results : [];
};

/**
 * Склад маркета — `main.Warehouse` (`/main/warehouses/`), а не модуль
 * «Склад» (`/warehouse/crud/warehouses/`): у маркет-компаний его обычно нет,
 * из-за чего раньше приход падал с «Не найден склад компании».
 * Пустая строка — склада нет, работаем через `/main/products/`.
 */
export async function resolveMarketWarehouseId(): Promise<string> {
  try {
    const { data } = await api.get("/main/warehouses/");
    const first = listFrom(data)[0];
    const id = first?.id ?? first?.uuid ?? first?.pk;
    return id ? String(id) : "";
  } catch {
    return "";
  }
}

/**
 * Серверная классификация. `null` — endpoint/склад не поддерживается
 * (404/405/501), вызывающий переключается на `/main/products/`.
 */
export async function checkServerBarcode(
  warehouseId: string,
  code: string,
): Promise<MassIncomingCheck | null> {
  try {
    const { data } = await api.get(
      `/warehouse/${encodeURIComponent(warehouseId)}/barcode-check/${encodeURIComponent(code)}/`,
    );
    if (!isCheckStatus(data?.status)) return null;
    const barcode = data.barcode || code;
    if (data.ambiguous) {
      return {
        status: "UNKNOWN",
        source: "none",
        barcode,
        ambiguous: true,
        matches: data.matches || [],
      };
    }
    const product = data.product ? toMassIncomingProduct(data.product) : null;
    if (data.status !== "UNKNOWN" && product?.id) {
      return { status: data.status, source: "company", barcode, product };
    }
    // barcode-check смотрит только каталог компании — добираем глобальную базу.
    return (
      (await findGlobalProduct(barcode)) || {
        status: "UNKNOWN",
        source: "none",
        barcode,
      }
    );
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

export { classifyBarcodeFallback };

/**
 * Единый батч-приход без склада: сервер одной транзакцией создаёт
 * недостающие карточки (`barcode`/`name`/`price`/`from_global`), меняет
 * цену у существующих (`product_id` + `price`) и добавляет `quantity`
 * к остатку. Все правки одним запросом вместо цепочки create/PATCH на
 * каждую строку. `404/405/501` — сервер ещё не поддерживает, вызывающий
 * переходит на пошаговый фолбэк (`createCompanyProduct` + `updateProductPrice`
 * + `postIncomingViaProduct` / `postMassIncoming`).
 */
export async function postMassIncomingBatch(
  items: Array<Record<string, unknown>>,
  comment?: string,
) {
  const { data } = await api.post("/main/products/mass-incoming/", {
    items,
    comment: comment || i18n.t("crm.warehouse.massScan"),
  });
  return data;
}

/** Атомарный приход (all-or-nothing) — только когда сервер принял склад. */
export async function postMassIncoming(
  warehouseId: string,
  rows: MassIncomingRow[],
  comment?: string,
) {
  const items = rows.map((row) => ({
    product_id: row.productId,
    quantity: String(row.quantity),
    list: row.status,
  }));

  const { data } = await api.post(
    `/warehouse/${encodeURIComponent(warehouseId)}/mass-incoming/`,
    { items, comment: comment || i18n.t("crm.warehouse.massScan") },
  );
  return data;
}

/**
 * Приход одной позиции через карточку `/main/products/{id}/`.
 * Остаток перечитывается непосредственно перед PATCH, чтобы не затереть
 * продажи, прошедшие после скана.
 */
export async function postIncomingViaProduct(row: MassIncomingRow) {
  const id = encodeURIComponent(String(row.productId));
  const { data: fresh } = await api.get(`/main/products/${id}/`);
  const current = Number(fresh?.quantity ?? 0);
  const next = (Number.isFinite(current) ? current : 0) + row.quantity;
  const { data } = await api.patch(`/main/products/${id}/`, {
    quantity: String(next),
  });
  return data;
}

export async function updateProductPrice(productId: string, price: string) {
  const { data } = await api.patch(
    `/main/products/${encodeURIComponent(productId)}/`,
    { price },
  );
  return data;
}

const productFrom = (data: any) => data?.product || data;

/**
 * Карточка компании для строки. Остаток 0 — количество придёт приходом,
 * иначе оно задвоится.
 * - `global`: из глобальной базы NurCRM (`create-by-barcode`);
 * - `none`:   ручное создание (`create-manual`) — create-by-barcode
 *             для неизвестного штрихкода отвечает ошибкой.
 */
export async function createCompanyProduct({
  barcode,
  name,
  price,
  fromGlobal,
}: {
  barcode: string;
  name: string;
  price?: string;
  fromGlobal: boolean;
}) {
  const payload: Record<string, unknown> = { barcode, name, quantity: 0 };
  if (price) payload.price = price;

  if (fromGlobal) {
    try {
      const { data } = await api.post("/main/products/create-by-barcode/", payload);
      return productFrom(data);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  const { data } = await api.post("/main/products/create-manual/", payload);
  return productFrom(data);
}

export { isMissing as isMassIncomingEndpointMissing };
