/**
 * Вид магазина компании (`company.market_sphere`): продукты, одежда или услуги.
 *
 * От вида зависит только набор экранов и кнопок — данные (товары, размеры,
 * продажи) не трогаются. Пустое/неизвестное значение = «Продукты»: так сайт
 * ведёт себя как раньше для компаний, у которых вид не выбран.
 *
 * Матрица — ТЗ фронтенда «Сайт перестраивается по виду магазина» (06.10.2026), раздел 3.
 */

export const MARKET_SPHERES = ["grocery", "clothing", "services"] as const;

export type MarketSphere = (typeof MARKET_SPHERES)[number];

export const DEFAULT_MARKET_SPHERE: MarketSphere = "grocery";

export const normalizeMarketSphere = (value: unknown): MarketSphere => {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return (MARKET_SPHERES as readonly string[]).includes(s)
    ? (s as MarketSphere)
    : DEFAULT_MARKET_SPHERE;
};

export type MarketSphereFeatures = {
  /** Весовые поля карточки товара: «Весовой», PLU, срок годности. */
  weightFields: boolean;
  /** «Размеры и цвета» в карточке товара и выбор размера при продаже. */
  variants: boolean;
  /** Консультант в оплате. */
  consultant: boolean;
  /** «Обмен» по чеку. */
  exchange: boolean;
  /** Срок обмена (14 дней) и категории «без обмена» в возврате/обмене. */
  exchangeTerm: boolean;
  /** Раздел «Прокат». */
  rentals: boolean;
  /** Каталог кассы открывается на «Услугах», новая позиция — услуга. */
  servicesFirst: boolean;
  /** Мастер в строке продажи. */
  performer: boolean;
  /** Запись клиентов. */
  appointments: boolean;
  /** Заказ-наряды (ремонт). */
  workOrders: boolean;
};

const FEATURES: Record<MarketSphere, MarketSphereFeatures> = {
  grocery: {
    weightFields: true,
    variants: false,
    consultant: false,
    exchange: false,
    exchangeTerm: false,
    rentals: false,
    servicesFirst: false,
    performer: false,
    appointments: false,
    workOrders: false,
  },
  clothing: {
    weightFields: false,
    variants: true,
    consultant: true,
    exchange: true,
    exchangeTerm: true,
    rentals: true,
    servicesFirst: false,
    performer: false,
    appointments: false,
    workOrders: false,
  },
  services: {
    weightFields: false,
    variants: false,
    consultant: false,
    exchange: false,
    exchangeTerm: false,
    rentals: true,
    servicesFirst: true,
    performer: true,
    appointments: true,
    workOrders: true,
  },
};

export const getMarketSphereFeatures = (sphere: unknown): MarketSphereFeatures =>
  FEATURES[normalizeMarketSphere(sphere)];

/** Блоки формы товара (FormBlock id), скрытые видом магазина. */
export const sphereHiddenProductBlocks = (sphere: unknown): string[] =>
  getMarketSphereFeatures(sphere).weightFields ? [] : ["weight", "plu", "expiry"];

/** Кто может менять вид магазина (сервер кассиру ответит 403). */
export const canEditMarketSphere = (profile: any): boolean => {
  const role = String(profile?.role ?? "")
    .trim()
    .toLowerCase();
  return role === "owner" || role === "admin";
};
