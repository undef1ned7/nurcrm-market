import type {
  CashDataState,
  ClientFormState,
  CustomServiceState,
} from "../sellMainStart.types";

export const cx = (...args: any[]) => args.filter(Boolean).join(" ");

export function buildInitialClientForm(): ClientFormState {
  return {
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "client",
    llc: "",
    inn: "",
    okpo: "",
    score: "",
    bik: "",
    address: "",
  };
}

export const INITIAL_CUSTOM_SERVICE: CustomServiceState = {
  name: "",
  price: "",
  quantity: "1",
};

export function buildInitialCashData(company: any): CashDataState {
  return {
    cashbox: "",
    type: "income",
    name: "",
    amount: "",
    source_cashbox_flow_id: "",
    source_business_operation_id: "Продажа",
    status:
      company?.subscription_plan?.name === "Старт" ? "approved" : "pending",
  };
}

/** Products with cart qty subtracted, cart items first, empty stock filtered out. */
export function buildFilteredProducts(products: any[], start: any) {
  const cartItemsMap = new Map<any, { qty: number; item: any }>(
    start?.items?.map((el: any) => [
      el.product,
      { qty: parseFloat(el.quantity), item: el },
    ])
  );
  return products
    .map((el: any) => {
      const qty = parseFloat(el.quantity);
      const cartItem = cartItemsMap.get(el.id);
      const cartQty = cartItem?.qty || 0;
      const primaryImg = el.images.find((img: any) => img.is_primary);
      return {
        ...el,
        quantity: qty - cartQty,
        isCart: !!cartQty,
        cartItem: cartItem?.item,
        img:
          primaryImg?.image_url ??
          el.images[0]?.image_url ??
          "/images/placeholder.avif",
      };
    })
    .sort((a: any, b: any) => {
      if (a.cartItem) return -1;
      if (b.cartItem) return 1;
      return 0;
    })
    .filter((el: any) => !!el.quantity);
}
