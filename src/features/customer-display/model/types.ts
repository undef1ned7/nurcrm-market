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
    }
  | {
      type: "thanks";
      total?: number;
      durationMs?: number;
    }
  | {
      type: "age-check";
      productName?: string;
    }
  | { type: "age-check-dismiss" }
  | { type: "clear" };

export type CustomerDisplayPhase = "idle" | "cart" | "payment" | "thanks";
