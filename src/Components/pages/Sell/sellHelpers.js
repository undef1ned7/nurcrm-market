import api from "../../../api";

/**
 * Создание долга для клиента.
 */
export async function createDebt({
  clientId,
  title,
  amount,
  debtMonths = 0,
  firstDueDate = null,
  phone = "",
  name = "",
  note = "",
}) {
  const payload = {
    client: clientId,
    kind: "debt",
    title,
    name,
    phone,
    note: note || "",
    amount,
    debt_months: Number(debtMonths ?? 0),
  };

  if (firstDueDate) {
    payload.first_due_date = firstDueDate;
  }

  const res = await api.post("/main/debts/", payload);
  return res.data;
}

export const DEAL_STATUS_RU = ["Продажа", "Долги", "Предоплата"];

/** Фильтрация товаров по остаткам у агента (production transfer stock). */
export function filterProducts(products = [], transfers = []) {
  const onAgent = new Map();
  for (const t of transfers || []) {
    const pid = String(t.product);
    const qty = Number(t.qty_on_agent) || 0;
    onAgent.set(pid, (onAgent.get(pid) || 0) + qty);
  }

  if (transfers.length === 0) {
    return (products || []).map((p) => ({
      ...p,
      on_agent: p.qty_on_hand || p.qty_on_agent || 0,
    }));
  }

  return (products || [])
    .filter((p) => (onAgent.get(String(p.id)) || 0) > 0)
    .map((p) => ({
      ...p,
      on_agent: onAgent.get(String(p.id)) || 0,
    }));
}
