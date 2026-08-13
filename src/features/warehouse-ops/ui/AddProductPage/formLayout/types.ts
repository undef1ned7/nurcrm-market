export const PRODUCT_FORM_BLOCK_IDS = [
  "code",
  "barcode",
  "alternateBarcodes",
  "article",
  "hotkey",
  "images",
  "category",
  "brand",
  "unit",
  "pieceSale",
  "weight",
  "adult",
  "packaging",
  "markup",
  "wholesale",
  "discount",
  "supplier",
  "debt",
  "minStock",
  "country",
  "expiry",
  "promotion",
  "characteristics",
  "description",
  "plu",
] as const;

export type ProductFormBlockId = (typeof PRODUCT_FORM_BLOCK_IDS)[number];

export type ProductFormLayout = {
  hidden: ProductFormBlockId[];
};

export type ProductFormLayoutValues = {
  itemType?: string;
  newItemData?: Record<string, any>;
  marketData?: Record<string, any>;
  images?: any[];
  showDebtForm?: boolean;
};

export type ProductFormBlockMeta = {
  id: ProductFormBlockId;
  label: string;
  description: string;
  group: string;
};
