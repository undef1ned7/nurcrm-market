import api from "@shared/api";

export type ExchangePaymentMethod = "cash" | "transfer";

export type ExchangePayload = {
  return_items: { item: string; qty: string }[];
  new_items: { product: string; variant?: string; qty: string }[];
  /** Карта и QR — тоже "transfer": "card" сервер не принимает. */
  payment: { method: ExchangePaymentMethod };
};

export type ExchangeResult = {
  exchange?: string;
  original_sale?: string;
  new_sale?: string;
  new_sale_number?: string | number;
  return?: string;
  returned_amount?: string;
  new_amount?: string;
  difference?: string;
};

/** POST /main/pos/sales/{id}/exchange/ → 201. Ошибки 400 — текстом сервера. */
export async function exchangeSale(
  saleId: string,
  payload: ExchangePayload,
): Promise<ExchangeResult> {
  const { data } = await api.post(
    `/main/pos/sales/${encodeURIComponent(saleId)}/exchange/`,
    payload,
  );
  return (data ?? {}) as ExchangeResult;
}
