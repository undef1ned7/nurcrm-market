
export type LabelSizeKey = "30x20" | "58x40" | "58x30" | "custom";

export type BarcodePrintSettingsState = {
  labelSize: LabelSizeKey;
  customWidthMm: number;
  customHeightMm: number;
  fontId: string;
  textScale: number;
  copies: number;
  barcodeHeight: number;
  barcodeBarWidth: number;
  didTouchTextScale: boolean;
  didTouchBarcodeSize: boolean;
  showName: boolean;
  showPrice: boolean;
  barcodeById: Record<string, string>;
  copiesById: Record<string, number>;
};

export type BarcodePrintPageState = {
  searchTerm: string;
  page: number;
};

export type PrintSettings = {
  fontId: string;
  textScale: number | string;
  copies: number | string;
  lineGap: number;
  gapAfterTitle: number;
  gapAfterPrice: number;
  barcodeRaise: number;
  barcodeHeight: number;
  barcodeBarWidth: number;
};

export type LabelDimensions = {
  widthMm: number;
  heightMm: number;
};

export type FontOption = {
  value: string;
  label: string;
};

export type PreviewLayout = {
  widthDots: number;
  heightDots: number;
  widthPx: number;
  heightPx: number;
  scale: number;
  text: {
    x: number;
    y: number;
    lineGap: number;
    size: number;
  };
  barcode: {
    x: number;
    height: number;
  };
  border: {
    margin: number;
    thick: number;
  };
};

export type PreviewPositions = {
  priceY: number | null;
  barcodeY: number;
  textX: number;
  priceX: number;
  barcodeX: number;
  textY: number;
  textW: number;
};

export type BarcodePrintTabProps = {
  products: unknown[];
  loading?: boolean;
  searchTerm?: string;
  onSearchChange?: (e: unknown) => void;
  page?: number;
  totalPages?: number;
  count?: number;
  _pageSize?: number;
  onPageChange?: (page: number) => void;
};
