import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { HOTKEY_GROUP_PATTERN } from "./cashierPage.constants";
import type {
  CartLine,
  CartPromotionRule,
  CartSaleItem,
  CashierProduct,
  SaleShiftRef,
} from "./cashierPage.types";

export function mergeChangedMap<T extends Record<string, unknown>>(
  prev: T,
  patch: Partial<T>,
): T {
  let changed = false;
  const next = { ...prev } as Record<string, unknown>;
  Object.entries(patch).forEach(([key, value]) => {
    if (next[key] !== value) {
      next[key] = value;
      changed = true;
    }
  });
  return changed ? (next as T) : prev;
}

export function isSameCartLine(
  a: CartLine | null | undefined,
  b: CartLine | null | undefined,
): boolean {
  return (
    Boolean(a && b) &&
    a!.saleId === b!.saleId &&
    a!.itemId === b!.itemId &&
    a!.productId === b!.productId &&
    a!.isCustom === b!.isCustom &&
    a!.isWeight === b!.isWeight &&
    a!.salePackage === b!.salePackage &&
    a!.name === b!.name &&
    a!.price === b!.price &&
    a!.quantity === b!.quantity &&
    a!.discountTotal === b!.discountTotal &&
    a!.unit === b!.unit &&
    a!.image === b!.image
  );
}

export function normalizeHotkeyGroup(value: unknown): string {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return HOTKEY_GROUP_PATTERN.test(normalized) ? normalized : "";
}

/** Программно меняет значение controlled-инпута так, чтобы сработал React onChange. */
export function setNativeInputValue(el: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function normalizeCompactProductsResponse(data: unknown): CashierProduct[] {
  const record = data as Record<string, unknown> | unknown[] | null | undefined;
  const rawList = Array.isArray((record as Record<string, unknown>)?.results)
    ? ((record as Record<string, unknown>).results as unknown[])
    : Array.isArray(record)
      ? record
      : [];

  return rawList.map((item) => {
    const product = (item ?? {}) as CashierProduct;
    return {
      ...product,
      images: Array.isArray(product?.images) ? product.images : [],
      packages: Array.isArray(product?.packages) ? product.packages : [],
    };
  });
}

/** Убирает хвост .00 только у дробей; «50» и «100» не трогать (иначе /\.?0+$/ даёт «5» и «1»). */
export function stripTrailingZerosAfterDecimal(num: number | string): string {
  const s = String(num);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "") || "0";
}

export function fmtSomShort(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n ?? "");
  return stripTrailingZerosAfterDecimal(Number(x.toFixed(2)));
}

export function normalizeCartPromotionRules(rules: unknown): CartPromotionRule[] {
  if (!Array.isArray(rules)) return [];
  return rules
    .map((r, idx) => {
      const rule = (r ?? {}) as Record<string, unknown>;
      return {
        position: Number(rule.position ?? idx),
        min_amount:
          parseFloat(String(rule.min_amount ?? "").replace(",", ".")) || 0,
        discount_percent:
          parseFloat(String(rule.discount_percent ?? "").replace(",", ".")) ||
          0,
        promo_quantity:
          rule.promo_quantity === null ||
          rule.promo_quantity === undefined ||
          String(rule.promo_quantity).trim() === ""
            ? null
            : Math.max(
                0,
                parseFloat(String(rule.promo_quantity).replace(",", ".")) || 0,
              ),
      };
    })
    .filter((r) => r.discount_percent > 0)
    .sort((a, b) => a.position - b.position);
}

export function getActiveCartPromotionTier(
  price: unknown,
  qty: unknown,
  rules: unknown,
): CartPromotionRule | null {
  const list = normalizeCartPromotionRules(rules);
  if (!list.length) return null;
  const gross = (parseFloat(String(price)) || 0) * (parseFloat(String(qty)) || 0);
  const q = parseFloat(String(qty)) || 0;
  let best: CartPromotionRule | null = null;
  for (const r of list) {
    if (gross + 1e-9 < r.min_amount) continue;
    if (
      r.promo_quantity != null &&
      r.promo_quantity > 0 &&
      q + 1e-9 < r.promo_quantity
    )
      continue;
    if (!best || r.min_amount > best.min_amount) best = r;
  }
  return best;
}

export function formatCartPromotionRulesLabel(rules: unknown): string {
  const list = normalizeCartPromotionRules(rules);
  if (!list.length) return "";
  return list
    .map((r) => {
      const pq =
        r.promo_quantity != null && r.promo_quantity > 0
          ? `, от ${fmtSomShort(r.promo_quantity)} шт`
          : "";
      return `от ${fmtSomShort(r.min_amount)} сом${pq}: −${stripTrailingZerosAfterDecimal(r.discount_percent)}%`;
    })
    .join(" · ");
}

/** Процент скидки для поля в режиме «%» (как при переключении кнопки %). */
export function getSaleShiftId(sale: SaleShiftRef): string | number | null {
  if (!sale) return null;
  const shift = sale.shift;
  if (shift != null && typeof shift === "object") {
    return shift.id ?? shift.pk ?? null;
  }
  return sale.shift_id ?? shift ?? null;
}

export function isShiftNotOpenApiError(error: unknown): boolean {
  const text = validateResErrors(error, "").toLowerCase();
  return (
    text.includes("смен") &&
    (text.includes("не открыт") ||
      text.includes("закрыт") ||
      text.includes("not open"))
  );
}

export function formatDiscountPercentFromLine(
  discountSom: unknown,
  lineTotal: unknown,
): string {
  const d = parseFloat(String(discountSom)) || 0;
  const lt = parseFloat(String(lineTotal)) || 0;
  if (lt <= 0) return "";
  if (d <= 0) return "0";
  const pctNum = Number(((d / lt) * 100).toFixed(2));
  return stripTrailingZerosAfterDecimal(pctNum) || "0";
}

export function formatQuantity(qty: unknown): string {
  if (qty === null || qty === undefined || qty === "") return "0";
  const num = parseFloat(String(qty));
  if (isNaN(num)) return "0";
  if (num % 1 === 0) return String(num);
  return String(num).replace(/\.?0+$/, "");
}

export function normalizeQuantity(qty: unknown): number {
  if (qty === null || qty === undefined || qty === "") return 0;
  const num = parseFloat(String(qty));
  if (isNaN(num)) return 0;
  const rounded = Math.round(num * 10000) / 10000;
  if (rounded % 1 === 0) return Math.floor(rounded);
  return rounded;
}

/** Ввод дроби не завершён: ждём цифру после «.»/«,» или blur */
export function isIncompleteDecimalInput(rawValue: unknown): boolean {
  const raw = String(rawValue ?? "").trim();
  if (!raw || raw === "-") return true;
  if (raw === "." || raw === ",") return true;
  if (/[.,]$/.test(raw)) return true;
  const normalized = raw.replace(",", ".");
  if (normalized === "0" || normalized === "0.") return true;
  return false;
}

export function parseDecimalInput(rawValue: unknown): number {
  return parseFloat(String(rawValue ?? "").trim().replace(",", "."));
}

/** Не синхронизируем с API, пока дробь не дописана */
export function shouldSyncDecimalFieldWhileTyping(rawValue: unknown): boolean {
  if (isIncompleteDecimalInput(rawValue)) return false;
  const num = parseDecimalInput(rawValue);
  return Number.isFinite(num) && num >= 0;
}

export function normalizePrice(price: unknown): number {
  if (price === null || price === undefined || price === "") return 0;
  const num = parseFloat(String(price));
  if (isNaN(num)) return 0;
  const rounded = Math.round(num * 100) / 100;
  if (rounded % 1 === 0) return Math.floor(rounded);
  return rounded;
}

export function formatPrice(price: unknown): string {
  if (price === null || price === undefined || price === "") return "0";
  const num = parseFloat(String(price));
  if (isNaN(num)) return "0";
  if (num % 1 === 0) return String(num);
  return String(num).replace(/\.?0+$/, "");
}

/**
 * Считает суммарное потребление пачек для товара по всем строкам корзины.
 * items — currentSale.items
 * productId — ID товара
 * productsList — список товаров (для поиска packages)
 */
export function calcTotalConsumeForProduct(
  items: CartSaleItem[],
  productId: string | number | undefined,
  productsList: CashierProduct[],
): number {
  const product = productsList.find((p) => p.id === productId);
  return items
    .filter((item) => (item.product || item.product_id) === productId)
    .reduce((sum, item) => {
      const qty = parseFloat(String(item.quantity)) || 0;
      if (item.sale_package) {
        const pkg = product?.packages?.find((p) => p.id === item.sale_package);
        const qip = Number(pkg?.quantity_in_package);
        return sum + (qip > 0 ? qty / qip : 0);
      }
      return sum + qty;
    }, 0);
}
