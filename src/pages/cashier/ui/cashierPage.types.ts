export type CartPromotionRule = {
  position: number;
  min_amount: number;
  discount_percent: number;
  promo_quantity: number | null;
};

export type CartLine = {
  id: string;
  saleId?: string | number;
  itemId?: string | number;
  productId?: string | number | null;
  isCustom: boolean;
  isWeight: boolean;
  salePackage?: string | number | null;
  name: string;
  price: number;
  quantity: number;
  discountTotal: number;
  unit: string;
  promotionRules?: unknown[];
  image?: string | null;
};

export type CartSaleItem = {
  product?: string | number;
  product_id?: string | number;
  quantity?: number | string;
  sale_package?: string | number | null;
  [key: string]: unknown;
};

export type ProductPackage = {
  id?: string | number;
  quantity_in_package?: number | string;
  [key: string]: unknown;
};

export type CashierProduct = {
  id?: string | number;
  name?: string;
  is_favorite?: boolean;
  is_adult?: boolean;
  packages?: ProductPackage[];
  images?: unknown[];
  [key: string]: unknown;
};

export type PieceSaleModalState = {
  product: CashierProduct;
  step?: "choice" | string;
  source?: "click" | "scan" | string;
  maxQuantity?: number | null;
  scanCartItemId?: string | number;
  [key: string]: unknown;
} | null;

export type DeleteCodePromptState = {
  title: string;
  description: string;
} | null;

export type SaleShiftRef = {
  shift?:
    | { id?: string | number; pk?: string | number }
    | string
    | number
    | null;
  shift_id?: string | number | null;
  [key: string]: unknown;
} | null;

export type AlertModalState = {
  open: boolean;
  type: string;
  title: string;
  message: string;
  okText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
};

export type CartDiscountMode = "amount" | "percent";
