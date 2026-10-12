export type CustomerDisplayCartItem = {
  name: string;
  qty: number;
  price: number;
  discount?: number;
  lineTotal: number;
};

export type CustomerDisplaySlide = {
  imageUrl: string;
  caption?: string;
};

export type CustomerDisplayInstallment = {
  number: number;
  dueDate: string;
  amount: number;
};

export type CustomerDisplayDebtInfo = {
  customerName?: string;
  /** Остаток, который клиент должен после этой продажи. */
  totalDebt?: number;
  /** Сумма, оплаченная сейчас (предоплата по рассрочке). */
  prepayment?: number;
  installments?: CustomerDisplayInstallment[];
};

export type CustomerDisplayMessage =
  | {
      type: "hello";
      logoUrl?: string;
      welcomeText?: string;
      companyName?: string;
    }
  | {
      type: "idle";
      logoUrl?: string;
      welcomeText?: string;
      companyName?: string;
      slides?: CustomerDisplaySlide[];
    }
  | {
      type: "cart";
      cartId?: string;
      items: CustomerDisplayCartItem[];
      subtotal: number;
      discountTotal?: number;
      total: number;
      currency?: string;
    }
  | {
      type: "payment";
      total: number;
      currency?: string;
      /** Наличными получено от клиента. */
      paid?: number;
      /** Сдача клиенту. */
      change?: number;
      debt?: CustomerDisplayDebtInfo;
    }
  | {
      type: "thanks";
      total?: number;
      durationMs?: number;
      paid?: number;
      change?: number;
      debt?: CustomerDisplayDebtInfo;
    }
  | {
      type: "age-check";
      productName?: string;
    }
  | { type: "age-check-dismiss" }
  | { type: "clear" };

export type CustomerDisplayPhase = "idle" | "cart" | "payment" | "thanks";
