import type {
  CustomerDisplayCartItem,
  CustomerDisplayMessage,
} from "../model/types";

type CartLike = {
  name?: string;
  quantity?: number;
  price?: number;
  discountTotal?: number;
};

const toNum = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function buildCustomerDisplayCartMessage({
  cart,
  total,
  cartId,
}: {
  cart?: CartLike[] | null;
  total?: number;
  cartId?: string | number | null;
}): CustomerDisplayMessage {
  const items: CustomerDisplayCartItem[] = (cart || []).map((item) => {
    const qty = toNum(item.quantity) || 0;
    const price = toNum(item.price);
    const discount = toNum(item.discountTotal);
    const lineTotal = Math.max(0, price * qty - discount);
    return {
      name: String(item.name || "Товар"),
      qty,
      price,
      discount: discount || undefined,
      lineTotal,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountTotal = items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0,
  );
  const resolvedTotal =
    Number.isFinite(Number(total)) && Number(total) > 0
      ? Number(total)
      : Math.max(0, subtotal - discountTotal);

  return {
    type: "cart",
    cartId: cartId != null ? String(cartId) : undefined,
    items,
    subtotal,
    discountTotal: discountTotal || undefined,
    total: resolvedTotal,
    currency: "сом",
  };
}
