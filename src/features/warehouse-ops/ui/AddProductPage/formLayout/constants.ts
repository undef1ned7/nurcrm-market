import type { ProductFormBlockId, ProductFormBlockMeta } from "./types";
import { PRODUCT_FORM_BLOCK_IDS } from "./types";

export const PRODUCT_FORM_LAYOUT_URL = "/main/products/form-layout/";

export const PRODUCT_FORM_LAYOUT_STORAGE_PREFIX = "market_product_form_layout";

export const DEFAULT_PRODUCT_FORM_LAYOUT: { hidden: ProductFormBlockId[] } = {
  hidden: [],
};

export const PRODUCT_FORM_BLOCK_META: Record<
  ProductFormBlockId,
  ProductFormBlockMeta
> = {
  code: {
    id: "code",
    label: "Код товара",
    description: "Генерируется автоматически",
    group: "Основное",
  },
  barcode: {
    id: "barcode",
    label: "Штрих-код",
    description: "Основной штрихкод и генерация",
    group: "Основное",
  },
  alternateBarcodes: {
    id: "alternateBarcodes",
    label: "Дополнительные штрихкоды",
    description: "Несколько кодов на один товар",
    group: "Основное",
  },
  article: {
    id: "article",
    label: "Артикул",
    description: "Внутренний артикул",
    group: "Основное",
  },
  hotkey: {
    id: "hotkey",
    label: "Горячая клавиша",
    description: "F1–F12 на кассе",
    group: "Основное",
  },
  images: {
    id: "images",
    label: "Изображения",
    description: "Фото товара",
    group: "Основное",
  },
  category: {
    id: "category",
    label: "Категория",
    description: "Выбор и создание категории",
    group: "Классификация",
  },
  brand: {
    id: "brand",
    label: "Бренд",
    description: "Выбор и создание бренда",
    group: "Классификация",
  },
  unit: {
    id: "unit",
    label: "Единица измерения",
    description: "шт, кг, л и т.д.",
    group: "Единицы и флаги",
  },
  pieceSale: {
    id: "pieceSale",
    label: "Поштучная продажа",
    description: "Продажа по штукам из упаковки",
    group: "Единицы и флаги",
  },
  weight: {
    id: "weight",
    label: "Весовой товар / дробная услуга",
    description: "Вес или дробное количество",
    group: "Единицы и флаги",
  },
  adult: {
    id: "adult",
    label: "Товар 18+",
    description: "Проверка возраста на кассе",
    group: "Единицы и флаги",
  },
  packaging: {
    id: "packaging",
    label: "Упаковки",
    description: "Фасовка и цена за штуку",
    group: "Единицы и флаги",
  },
  markup: {
    id: "markup",
    label: "Наценка",
    description: "% от цены закупки",
    group: "Цены",
  },
  wholesale: {
    id: "wholesale",
    label: "Оптовая цена",
    description: "Отдельная цена для опта",
    group: "Цены",
  },
  discount: {
    id: "discount",
    label: "Скидка",
    description: "Скидка на товар в %",
    group: "Цены",
  },
  supplier: {
    id: "supplier",
    label: "Поставщик",
    description: "Выбор и создание поставщика",
    group: "Склад",
  },
  debt: {
    id: "debt",
    label: "Долг по товару",
    description: "Предоплата или долг поставщику",
    group: "Склад",
  },
  minStock: {
    id: "minStock",
    label: "Минимальный остаток",
    description: "Порог для закупок",
    group: "Склад",
  },
  country: {
    id: "country",
    label: "Страна",
    description: "Страна происхождения",
    group: "Склад",
  },
  expiry: {
    id: "expiry",
    label: "Срок годности",
    description: "Дата окончания срока",
    group: "Склад",
  },
  promotion: {
    id: "promotion",
    label: "Акция",
    description: "Правила скидки от количества",
    group: "Дополнительно",
  },
  characteristics: {
    id: "characteristics",
    label: "Характеристики",
    description: "Высота, ширина, глубина, вес",
    group: "Дополнительно",
  },
  description: {
    id: "description",
    label: "Описание",
    description: "Текстовое описание товара",
    group: "Дополнительно",
  },
  plu: {
    id: "plu",
    label: "PLU код",
    description: "Для весов с печатью этикетки",
    group: "Дополнительно",
  },
};

export const PRODUCT_FORM_BLOCK_GROUPS = [
  "Основное",
  "Классификация",
  "Единицы и флаги",
  "Цены",
  "Склад",
  "Дополнительно",
] as const;

export const ALL_PRODUCT_FORM_BLOCK_IDS: ProductFormBlockId[] = [
  ...PRODUCT_FORM_BLOCK_IDS,
];
