/** Нормализация ответа POST /main/pos/sales/start/ и связанных POS-операций */
import i18n from "@shared/config/i18n";

// `shared` — нижний слой (см. src/ARCHITECTURE.md), не может импортировать
// типы из `entities/sale` — поэтому минимальные структурные типы объявлены
// локально, а не переиспользуют PosSale/PosCartTab из entities/sale/model/types.ts.
// Бэк отдаёт как минимум 4 разных формы ответа (sale, {carts, sale}, массив
// продаж, одна строка корзины) — внутри функций сознательно остаётся `any`
// там, где код реально разбирает разнородные объекты; типизированы вход и
// выход публичных функций. См. docs/sale-flow-bugs.md, пункт 10.

export type PosCartTabLike = {
  saleId: string;
  label: string;
  isMain: boolean;
  itemCount: number;
  total: string | number | null;
  status: string;
};

/** Минимальный срез стейта sale-слайса, который читают/пишут функции этого файла. */
export type MutablePosSaleState = {
  start?: Record<string, any> | null;
  posCarts?: PosCartTabLike[];
  activeSaleId?: string | null;
  [key: string]: unknown;
};

const countItems = (sale: any): number => {
  const items = sale?.items || sale?.cart?.items;
  return Array.isArray(items) ? items.length : 0;
};

export const mapCartTabFromApi = (
  raw: unknown,
  index = 0,
): PosCartTabLike | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const saleId = r.id ?? r.sale_id ?? r.saleId;
  if (!saleId) return null;
  const isMain = Boolean(r.is_default ?? r.isDefault ?? r.is_main ?? r.isMain);
  return {
    saleId: String(saleId),
    label:
      r.label ||
      r.name ||
      (isMain
        ? i18n.t("crm.cashier.main")
        : `${i18n.t("crm.cashier.cart")} ${index + 1}`),
    isMain,
    itemCount: Number(r.items_count ?? r.itemsCount ?? r.item_count ?? 0),
    total: r.total ?? r.total_amount ?? null,
    status: r.status ?? "open",
  };
};

export const mapCartTabsFromApi = (list: unknown): PosCartTabLike[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map((c, i) => mapCartTabFromApi(c, i))
    .filter((c): c is PosCartTabLike => c !== null);
};

const cartTabFromSale = (sale: any): PosCartTabLike | null => {
  if (!sale?.id) return null;
  return {
    saleId: String(sale.id),
    label:
      sale.is_default || sale.is_default === undefined
        ? i18n.t("crm.cashier.main")
        : i18n.t("crm.cashier.cart"),
    isMain: sale.is_default !== false,
    itemCount: countItems(sale),
    total: sale.total ?? null,
    status: sale.status ?? "open",
  };
};

export type NormalizedPosStartResponse = {
  sale: Record<string, any> | null;
  carts: PosCartTabLike[];
  activeSaleId: string | null;
};

export const normalizePosStartResponse = (
  data: unknown,
): NormalizedPosStartResponse => {
  if (!data || typeof data !== "object") {
    return { sale: null, carts: [], activeSaleId: null };
  }
  const d = data as Record<string, any>;

  if (Array.isArray(d.carts)) {
    const carts = mapCartTabsFromApi(d.carts);
    const sale = d.sale ?? d.active_sale ?? d.active ?? d.current_sale ?? null;
    const activeSaleId = String(
      sale?.id ??
        d.active_sale_id ??
        d.active_saleId ??
        d.active_id ??
        carts.find((c) => c.isMain)?.saleId ??
        carts[0]?.saleId ??
        "",
    );
    return {
      sale,
      carts,
      activeSaleId: activeSaleId || null,
    };
  }

  if (Array.isArray(d)) {
    const carts = mapCartTabsFromApi(d);
    const active = carts.find((c) => c.isMain) || carts[0];
    return {
      sale:
        (d as any[]).find((s) => String(s.id) === String(active?.saleId)) ??
        (d as any[])[0] ??
        null,
      carts,
      activeSaleId: active?.saleId ?? null,
    };
  }

  const sale = d;
  const tab = cartTabFromSale(sale);
  return {
    sale,
    carts: tab ? [tab] : [],
    activeSaleId: sale?.id ? String(sale.id) : null,
  };
};

export type EnrichPosSaleOptions = { salePackageId?: string | number | null };

/**
 * Бэк на add-item часто кладёт sale_package только в added_item, не в items[].
 * Без этого поштучная строка теряет sale_package и пачка PATCH-ит её же.
 */
export const enrichPosSaleResponse = (
  data: unknown,
  options: EnrichPosSaleOptions = {},
): any => {
  if (!data || typeof data !== "object") return data;
  const d = data as Record<string, any>;

  const addedItemId = d.added_item_id ?? d.added_item?.id ?? null;
  const addedSalePackage =
    d.added_item?.sale_package ??
    d.added_item?.sale_package_id ??
    options.salePackageId ??
    null;

  if (!Array.isArray(d.items) && !Array.isArray(d.cart?.items)) {
    if (options.salePackageId && isCartLineItemResponse(d) && !d.sale_package) {
      return { ...d, sale_package: options.salePackageId };
    }
    return d;
  }

  const rawItems = d.items ?? d.cart?.items ?? [];
  const items = rawItems.map((item: any) => {
    const existing = item.sale_package ?? item.sale_package_id ?? null;
    if (existing != null && String(existing) !== "") {
      return item;
    }
    const isAdded =
      addedItemId != null && String(item.id) === String(addedItemId);
    const pkg = isAdded ? addedSalePackage : null;
    if (pkg == null || String(pkg) === "") return item;
    return { ...item, sale_package: pkg };
  });

  const next: any = { ...d, items };
  if (d.cart) {
    next.cart = { ...d.cart, items };
  }
  return next;
};

const resolveCartLineSalePackage = (line: any) =>
  line?.sale_package ?? line?.sale_package_id ?? null;

const preserveSalePackageFromPrevItems = (nextItems: any, prevItems: any) => {
  if (!Array.isArray(nextItems) || !Array.isArray(prevItems)) return nextItems;
  return nextItems.map((item) => {
    const existing = resolveCartLineSalePackage(item);
    if (existing != null && String(existing) !== "") return item;
    const prevLine = prevItems.find((p) => String(p.id) === String(item.id));
    const prevPkg = resolveCartLineSalePackage(prevLine);
    if (prevPkg != null && String(prevPkg) !== "") {
      return { ...item, sale_package: prevPkg };
    }
    return item;
  });
};

const mergeSaleIntoStateStart = (
  state: MutablePosSaleState,
  sale: any,
  options: EnrichPosSaleOptions = {},
): void => {
  if (!sale?.id) return;
  const prev = state.start;
  const prevId = prev?.id != null ? String(prev.id) : "";
  const nextId = String(sale.id);

  let nextSale = enrichPosSaleResponse(sale, options);

  if (prev && prevId && nextId && prevId === nextId) {
    const prevItems = prev.items ?? prev.cart?.items;
    const nextItemsMissing =
      nextSale.items === undefined &&
      (nextSale.cart === undefined || nextSale.cart.items === undefined);
    // POST /start/ и иногда PATCH — sale без items: не затираем строки корзины.
    // Пустой массив items[] (после удаления последней позиции) — применяем.
    if (Array.isArray(prevItems) && prevItems.length > 0 && nextItemsMissing) {
      state.start = { ...nextSale, items: prevItems };
      return;
    }

    const nextItems = nextSale.items ?? nextSale.cart?.items;
    if (Array.isArray(nextItems) && Array.isArray(prevItems)) {
      const mergedItems = preserveSalePackageFromPrevItems(nextItems, prevItems);
      nextSale = {
        ...nextSale,
        items: mergedItems,
        ...(nextSale.cart
          ? { cart: { ...nextSale.cart, items: mergedItems } }
          : {}),
      };
    }
  }
  state.start = nextSale;
};

/** Ответ POST add-item / PATCH строки — одна позиция, не вся продажа */
export const isCartLineItemResponse = (data: unknown): boolean => {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, any>;
  if (Array.isArray(d.carts) || d.sale != null) return false;
  if (Array.isArray(d.items) || Array.isArray(d.cart?.items)) return false;
  const productId = d.product ?? d.product_id;
  if (productId == null || d.id == null) return false;
  if (
    d.shift != null &&
    d.quantity == null &&
    d.product_name == null &&
    d.display_name == null
  ) {
    return false;
  }
  return true;
};

export const mergeCartLineIntoStart = (
  state: MutablePosSaleState,
  lineItem: any,
): boolean => {
  if (!state.start?.id) return false;
  const prevItems = [...(state.start.items ?? state.start.cart?.items ?? [])];
  const lineId = lineItem.id;
  const idx = prevItems.findIndex((it) => String(it.id) === String(lineId));
  const nextItems =
    idx >= 0
      ? prevItems.map((it, i) =>
          i === idx
            ? {
                ...it,
                ...lineItem,
                sale_package:
                  resolveCartLineSalePackage(lineItem) ??
                  resolveCartLineSalePackage(it) ??
                  null,
              }
            : it,
        )
      : [
          ...prevItems,
          {
            ...lineItem,
            sale_package: resolveCartLineSalePackage(lineItem) ?? null,
          },
        ];

  state.start = {
    ...state.start,
    items: nextItems,
    ...(state.start.cart
      ? { cart: { ...state.start.cart, items: nextItems } }
      : {}),
  };
  if (Array.isArray(state.posCarts) && state.posCarts.length) {
    state.posCarts = patchCartTabFromSale(state.posCarts, state.start);
  }
  return true;
};

export const removeCartLineFromStart = (
  state: MutablePosSaleState,
  itemId: unknown,
): boolean => {
  if (!state.start?.id || itemId == null) return false;
  const prevItems = state.start.items ?? state.start.cart?.items ?? [];
  if (!Array.isArray(prevItems)) return false;
  const nextItems = prevItems.filter((it) => String(it.id) !== String(itemId));
  if (nextItems.length === prevItems.length) return false;

  state.start = {
    ...state.start,
    items: nextItems,
    ...(state.start.cart
      ? { cart: { ...state.start.cart, items: nextItems } }
      : {}),
  };
  if (Array.isArray(state.posCarts) && state.posCarts.length) {
    state.posCarts = patchCartTabFromSale(state.posCarts, state.start);
  }
  return true;
};

export const applyPosStartToState = (
  state: MutablePosSaleState,
  data: unknown,
): void => {
  const { sale, carts, activeSaleId } = normalizePosStartResponse(data);
  if (sale) {
    mergeSaleIntoStateStart(state, sale);
  }
  if (carts.length) state.posCarts = carts;
  if (activeSaleId) state.activeSaleId = activeSaleId;
  else if (sale?.id) state.activeSaleId = String(sale.id);
};

/**
 * PATCH /main/pos/carts/{saleId}/items/{itemId}/ — ответ с одной продажей.
 * Не подменяет список вкладок (posCarts), только активную продажу и метаданные вкладки.
 */
export const applyPosCartItemPatchToState = (
  state: MutablePosSaleState,
  data: unknown,
  options: EnrichPosSaleOptions = {},
): void => {
  if (!data || typeof data !== "object") return;

  const payload = enrichPosSaleResponse(data, options);

  if (Array.isArray(payload.carts)) {
    applyPosStartToState(state, payload);
    return;
  }

  if (isCartLineItemResponse(payload)) {
    mergeCartLineIntoStart(state, payload);
    return;
  }

  const { sale } = normalizePosStartResponse(payload);
  const patchSale =
    sale ?? (payload.id != null || payload.sale_id != null ? payload : null);
  if (!patchSale?.id) return;

  const patchId = String(patchSale.id ?? patchSale.sale_id);
  const activeId = state.activeSaleId
    ? String(state.activeSaleId)
    : state.start?.id != null
      ? String(state.start.id)
      : "";

  if (activeId && patchId !== activeId) return;

  mergeSaleIntoStateStart(state, patchSale, options);

  if (Array.isArray(state.posCarts) && state.posCarts.length) {
    state.posCarts = patchCartTabFromSale(state.posCarts, state.start ?? patchSale);
  }
};

export const patchCartTabFromSale = (
  carts: PosCartTabLike[],
  sale: any,
): PosCartTabLike[] => {
  if (!sale?.id || !Array.isArray(carts)) return carts;
  const id = String(sale.id);
  const count = countItems(sale);
  const has = carts.some((c) => String(c.saleId) === id);
  if (!has) {
    const tab = cartTabFromSale(sale);
    return tab ? [...carts, tab] : carts;
  }
  return carts.map((c) =>
    String(c.saleId) === id ? { ...c, itemCount: count, total: sale.total ?? c.total } : c,
  );
};

export const getMainCartSaleId = (
  carts: PosCartTabLike[] | null | undefined,
): string | null => {
  if (!Array.isArray(carts) || !carts.length) return null;
  const main = carts.find((c) => c.isMain);
  return main?.saleId ?? carts[0]?.saleId ?? null;
};

/** Тело POST /main/pos/sales/start/ */
export const buildPosStartPayload = (args: unknown = {}): Record<string, any> => {
  const normalized: any =
    typeof args === "number" || typeof args === "string"
      ? { discount_total: Number(args) || 0 }
      : { ...(args as object) };

  const {
    discount_total,
    order_discount_total,
    shift = null,
    isNew,
    is_new,
    sale_id,
    saleId,
    ...rest
  } = normalized;

  const payload: Record<string, any> = { ...rest };

  const discount =
    order_discount_total !== undefined ? order_discount_total : discount_total;
  if (discount !== undefined && payload.order_discount_total === undefined) {
    payload.order_discount_total = discount;
  }
  if (shift) payload.shift = shift;

  if (is_new !== undefined) payload.is_new = Boolean(is_new);
  else if (isNew !== undefined) payload.is_new = Boolean(isNew);

  const sid = sale_id ?? saleId;
  if (sid) payload.sale_id = sid;

  return payload;
};
