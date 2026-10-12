/**
 * Канонические типы POS-продажи. Раньше такого типа не было нигде в
 * репозитории — каждый файл заново придумывал свой список фолбэков на одни и
 * те же поля бэка (`item.unit_price || item.price`, `sale.total ?? sale.total_amount`
 * и т.п.). См. docs/sale-flow-bugs.md, пункт 10.
 *
 * Пока используется только для типизации аргументов ключевых thunk'ов
 * (saleThunk.ts) — не для состояния всего слайса (useSale()/initialState
 * остаются как есть, это отдельный, более рискованный шаг, см.
 * docs/sale-flow-fixes/10-sale-flow-typing.md, шаг 3).
 */

export type PosSaleStatus =
  | "new"
  | "paid"
  | "debt"
  | "partially_returned"
  | "canceled";

export type PosSaleItem = {
  id: string;
  /** Основное поле товара в строке корзины. */
  product?: string | null;
  /** Алиас product — бэк в разных ответах отдаёт то одно, то другое. */
  product_id?: string | null;
  quantity: string | number;
  /** Основная цена за единицу. */
  unit_price?: string | number;
  /** Алиас unit_price. */
  price?: string | number;
  /** Скидка на строку (сумма). */
  line_discount?: string | number;
  /** Алиас line_discount. */
  discount_total?: string | number;
  tax_total?: string | number;
  sale_package?: string | number | null;
  sale_package_id?: string | number | null;
  product_name?: string;
  display_name?: string;
  name?: string;
  unit?: string;
  is_weight?: boolean;
  promotion_rules?: unknown[];
  primary_image_url?: string | null;
  images?: { image_url?: string; is_primary?: boolean }[];
  [key: string]: unknown;
};

export type PosSale = {
  id: string;
  number?: number;
  /** `string`, а не только `PosSaleStatus` — на случай нового статуса с бэка,
   * которого фронт ещё не знает (не должно падать типом на неизвестном значении). */
  status: PosSaleStatus | string;
  shift?: string | { id?: string } | null;
  shift_id?: string | null;
  cashbox?: string | null;
  branch?: string | null;
  client?: string | null;
  client_name?: string | null;
  subtotal?: string;
  discount_total?: string;
  tax_total?: string;
  total?: string;
  order_discount_total?: string | number;
  order_discount_percent?: string | number;
  payment_method?: string;
  cash_received?: string;
  change?: string;
  debt_amount?: number | string;
  is_wholesale?: boolean;
  is_default?: boolean;
  items?: PosSaleItem[];
  cart?: { items?: PosSaleItem[] };
  created_at?: string;
  paid_at?: string | null;
  consultant?: string | null;
  consultant_commission_percent?: string | null;
  [key: string]: unknown;
};

export type PosCartTab = {
  saleId: string;
  label: string;
  isMain: boolean;
  itemCount: number;
  total: string | number | null;
  status: string;
};
