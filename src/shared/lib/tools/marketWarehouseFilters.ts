/**
 * Параметры GET /main/products/list/ для склада маркета (/crm/sklad).
 * UI — на русском, в query уходят стабильные английские коды.
 */

export const MARKET_WAREHOUSE_KIND = {
  product: "product",
  service: "service",
  bundle: "bundle",
};

/** Товар-услуга склада маркета (без учёта остатка на кассе). */
export const isMarketWarehouseServiceProduct = (item: any) =>
  String(item?.kind ?? "")
    .trim()
    .toLowerCase() === MARKET_WAREHOUSE_KIND.service;

const normalizeKind = (item: any) =>
  String(item?.kind ?? MARKET_WAREHOUSE_KIND.product)
    .trim()
    .toLowerCase();

/** Обычный товар (не услуга и не комплект). */
export const isMarketWarehouseProductKind = (item: any) =>
  normalizeKind(item) === MARKET_WAREHOUSE_KIND.product;

/** Есть положительный остаток на складе. */
export const hasMarketWarehouseStock = (item: any) => {
  const qty = parseFloat(item?.quantity);
  return Number.isFinite(qty) && qty > 0;
};

/** Кандидат в состав комплекта: только товар с остатком. */
export const isKitCompositionCandidate = (item: any) =>
  isMarketWarehouseProductKind(item) && hasMarketWarehouseStock(item);

/**
 * Единица продажи на складе.
 * Поштучно — товар с розничной упаковкой: продаётся и пачкой, и штуками из неё.
 */
export const MARKET_WAREHOUSE_SALE_UNIT = {
  weight: "weight",
  piece: "piece",
  piece_sale: "piece_sale",
} as const;

export const MARKET_WAREHOUSE_SALE_UNITS = [
  { value: MARKET_WAREHOUSE_SALE_UNIT.weight, label: "Весовые" },
  { value: MARKET_WAREHOUSE_SALE_UNIT.piece, label: "Штучные" },
  {
    value: MARKET_WAREHOUSE_SALE_UNIT.piece_sale,
    label: "Поштучно",
    hint: "Продаются и упаковкой, и по штукам (достают из упаковки)",
  },
];

export const isMarketWarehouseWeightProduct = (item: any) => {
  if (item?.is_weight === true || item?.isWeight === true) return true;
  const scaleType = String(item?.scale_type ?? item?.scaleType ?? "")
    .trim()
    .toLowerCase();
  return scaleType === "weight";
};

/** Товар с поштучной продажей из упаковки (не услуга и не комплект). */
export const isMarketWarehousePieceSaleProduct = (item: any) => {
  if (!isMarketWarehouseProductKind(item)) return false;
  const pkgs = item?.packages;
  if (!Array.isArray(pkgs) || pkgs.length === 0) return false;
  return pkgs.some((pkg: any) => Number(pkg?.quantity_in_package) > 1);
};

export const classifyMarketWarehouseSaleUnit = (item: any) => {
  if (isMarketWarehousePieceSaleProduct(item)) {
    return MARKET_WAREHOUSE_SALE_UNIT.piece_sale;
  }
  if (isMarketWarehouseWeightProduct(item)) {
    return MARKET_WAREHOUSE_SALE_UNIT.weight;
  }
  return MARKET_WAREHOUSE_SALE_UNIT.piece;
};

export const matchesMarketWarehouseSaleUnit = (item: any, saleUnit: any) => {
  const unit = String(saleUnit || "").trim();
  if (!unit) return true;
  return classifyMarketWarehouseSaleUnit(item) === unit;
};

export const filterProductsBySaleUnit = (products: any, saleUnit: any) => {
  const list = Array.isArray(products) ? products : [];
  const unit = String(saleUnit || "").trim();
  if (!unit) return list;
  return list.filter((item: any) => matchesMarketWarehouseSaleUnit(item, unit));
};

const isTruthyQueryFlag = (value: any) =>
  value === true || value === "true" || value === 1 || value === "1";

export const normalizeSaleUnitValue = (value: any) => {
  const key = String(value || "").trim();
  if (
    key === MARKET_WAREHOUSE_SALE_UNIT.weight ||
    key === MARKET_WAREHOUSE_SALE_UNIT.piece ||
    key === MARKET_WAREHOUSE_SALE_UNIT.piece_sale
  ) {
    return key;
  }
  return "";
};

/** Пишет sale_unit / is_weight в params списка товаров. */
export const applySaleUnitParams = (params: any, saleUnit: any) => {
  const unit = normalizeSaleUnitValue(saleUnit);
  if (!unit) return params;
  params.sale_unit = unit;
  if (unit === MARKET_WAREHOUSE_SALE_UNIT.weight) {
    params.is_weight = true;
  } else if (unit === MARKET_WAREHOUSE_SALE_UNIT.piece) {
    params.is_weight = false;
  }
  return params;
};

export const MARKET_WAREHOUSE_PRESETS = [
  { value: "discounted", label: "Товары со скидкой" },
  { value: "shelf_life_expires_7d", label: "Срок годности истекает в течение 7 дней" },
  { value: "zero_cost", label: "Нулевая себестоимость" },
  { value: "shelf_life_expired", label: "Истёк срок годности" },
  { value: "out_of_stock", label: "Нет в наличии" },
  { value: "not_sold_90d", label: "Не продаются 3 месяца" },
  { value: "negative_stock", label: "Отрицательный остаток" },
  { value: "stock_below_min", label: "Общий остаток меньше минимального" },
];

/** @deprecated старые value на кириллице — для восстановления сохранённых фильтров */
const LEGACY_PRESET_MAP = {
  товары_со_скидкой: "discounted",
  срок_годности_истекает_7_дней: "shelf_life_expires_7d",
  нулевая_себестоимость: "zero_cost",
  истек_срок_годности: "shelf_life_expired",
  нет_в_наличии: "out_of_stock",
  не_продаются_3_месяца: "not_sold_90d",
  отрицательный_остаток: "negative_stock",
  общий_остаток_меньше_минимального: "stock_below_min",
};

const PRICE_TYPE_TO_API = {
  базовая: "base",
  "цена закупки": "purchase",
  себестоимость: "cost",
  скидка: "discount",
};

const PRICE_TYPE_FROM_API = Object.fromEntries(
  Object.entries(PRICE_TYPE_TO_API).map(([ru, en]) => [en, ru]),
);

const CONDITION_TO_API = {
  больше: "gt",
  меньше: "lt",
  равно: "eq",
};

const CONDITION_FROM_API = Object.fromEntries(
  Object.entries(CONDITION_TO_API).map(([ru, en]) => [en, ru]),
);

const SHELF_LIFE_CONDITION_TO_API = {
  "истекает в течение": "expires_within",
  истек: "expired",
};

const SHELF_LIFE_CONDITION_FROM_API = Object.fromEntries(
  Object.entries(SHELF_LIFE_CONDITION_TO_API).map(([ru, en]) => [en, ru]),
);

const SELLABILITY_CONDITION_TO_API = {
  "продавался в течение": "sold_within",
  "не продавался в течение": "not_sold_within",
};

const SELLABILITY_CONDITION_FROM_API = Object.fromEntries(
  Object.entries(SELLABILITY_CONDITION_TO_API).map(([ru, en]) => [en, ru]),
);

const STOCK_TYPE_TO_API = {
  общие: "total",
};

const STOCK_TYPE_FROM_API = { total: "общие" };

const mapToApi = (value: any, map: any) => {
  if (!value) return "";
  const key = String(value).trim();
  return map[key] || key;
};

const mapFromApi = (value: any, map: any, fallback: any) => {
  if (!value) return fallback;
  const key = String(value).trim();
  return map[key] || key;
};

export const normalizePresetValue = (preset: any) => {
  if (!preset) return "";
  const key = String(preset).trim();
  return LEGACY_PRESET_MAP[key] || key;
};

/** Чекбоксы модалки из query-параметра kind */
export const itemTypesFromKindParam = (kind: any) => {
  const allSelected = {
    product: true,
    service: true,
    kit: true,
  };
  if (!kind) return allSelected;

  const tokens = String(kind)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!tokens.length) return allSelected;

  return {
    product: tokens.includes("product"),
    service: tokens.includes("service"),
    kit: tokens.includes("bundle") || tokens.includes("kit"),
  };
};

/** kind для API из чекбоксов */
export const kindParamFromItemTypes = (itemTypes: any) => {
  const kinds: any[] = [];
  if (itemTypes?.product) kinds.push(MARKET_WAREHOUSE_KIND.product);
  if (itemTypes?.service) kinds.push(MARKET_WAREHOUSE_KIND.service);
  if (itemTypes?.kit) kinds.push(MARKET_WAREHOUSE_KIND.bundle);
  return kinds;
};

/**
 * Собирает query-параметры для GET /main/products/list/
 * @param {object} modalState — состояние формы FilterModal
 * @returns {{ params: object, error?: string }}
 */
export const buildMarketWarehouseListParams = (modalState: any) => {
  const params: any = {};
  const kinds = kindParamFromItemTypes(modalState?.itemTypes);

  if (kinds.length === 0) {
    return { params: {}, error: "Выберите хотя бы один тип товара" };
  }

  if (kinds.length < 3) {
    params.kind = kinds;
  }

  applySaleUnitParams(params, modalState?.saleUnit);

  const preset = normalizePresetValue(modalState?.preset);
  if (preset) params.preset = preset;

  if (modalState?.category) params.category = modalState.category;
  if (modalState?.brand) params.brand = modalState.brand;
  if (modalState?.supplier) params.supplier = modalState.supplier;

  const priceValue = String(modalState?.price?.value ?? "0").trim();
  if (priceValue && priceValue !== "0") {
    params.price_type = mapToApi(modalState.price.type, PRICE_TYPE_TO_API);
    params.price_condition = mapToApi(
      modalState.price.condition,
      CONDITION_TO_API,
    );
    params.price_value = priceValue;
  }

  const stockValue = String(modalState?.stock?.value ?? "0").trim();
  if (stockValue && stockValue !== "0") {
    params.stock_type = mapToApi(modalState.stock.type, STOCK_TYPE_TO_API);
    params.stock_condition = mapToApi(
      modalState.stock.condition,
      CONDITION_TO_API,
    );
    params.stock_value = stockValue;
  }

  const shelfValue = String(modalState?.shelfLife?.value ?? "0").trim();
  if (shelfValue && shelfValue !== "0") {
    params.shelf_life_condition = mapToApi(
      modalState.shelfLife.condition,
      SHELF_LIFE_CONDITION_TO_API,
    );
    params.shelf_life_value = shelfValue;
  }

  const changesValue = String(modalState?.productChanges?.value ?? "0").trim();
  if (changesValue && changesValue !== "0") {
    params.changes_condition = mapToApi(
      modalState.productChanges.condition,
      CONDITION_TO_API,
    );
    params.changes_value = changesValue;
  }

  const sellValue = String(modalState?.sellability?.value ?? "0").trim();
  if (sellValue && sellValue !== "0") {
    params.sellability_condition = mapToApi(
      modalState.sellability.condition,
      SELLABILITY_CONDITION_TO_API,
    );
    params.sellability_value = sellValue;
  }

  return { params };
};

/** Восстановление UI-модалки из применённых query-параметров */
export const modalStateFromAppliedFilters = (applied : any = {}) => {
  const kindRaw = applied.kind;
  const kindStr = Array.isArray(kindRaw)
    ? kindRaw.join(",")
    : String(kindRaw || "");

  const appliedSaleUnit = normalizeSaleUnitValue(applied.sale_unit);
  const saleUnit =
    appliedSaleUnit ||
    (isTruthyQueryFlag(applied.is_weight)
      ? MARKET_WAREHOUSE_SALE_UNIT.weight
      : "");

  return {
    itemTypes: itemTypesFromKindParam(kindStr),
    saleUnit,
    preset: normalizePresetValue(applied.preset),
    category: applied.category || "",
    brand: applied.brand || "",
    supplier: applied.supplier || "",
    price: {
      type: mapFromApi(
        applied.price_type,
        PRICE_TYPE_FROM_API,
        "базовая",
      ),
      condition: mapFromApi(
        applied.price_condition,
        CONDITION_FROM_API,
        "больше",
      ),
      value: applied.price_value || "0",
    },
    stock: {
      type: mapFromApi(applied.stock_type, STOCK_TYPE_FROM_API, "общие"),
      condition: mapFromApi(
        applied.stock_condition,
        CONDITION_FROM_API,
        "больше",
      ),
      value: applied.stock_value || "0",
    },
    shelfLife: {
      condition: mapFromApi(
        applied.shelf_life_condition,
        SHELF_LIFE_CONDITION_FROM_API,
        "истекает в течение",
      ),
      value: applied.shelf_life_value || "0",
    },
    productChanges: {
      condition: mapFromApi(
        applied.changes_condition,
        CONDITION_FROM_API,
        "изменялся в течение",
      ),
      value: applied.changes_value || "0",
    },
    sellability: {
      condition: mapFromApi(
        applied.sellability_condition,
        SELLABILITY_CONDITION_FROM_API,
        "продавался в течение",
      ),
      value: applied.sellability_value || "0",
    },
  };
};
