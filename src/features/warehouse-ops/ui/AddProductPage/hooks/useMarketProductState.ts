import { useEffect, useState, useCallback } from "react";
import { useKitProducts } from "./useKitProducts";

/**
 * Market-specific product fields, item type, kit sync, promotion stock.
 */
export const useMarketProductState = ({
  products,
  forceProductOnly = false,
  defaultItemType = "product",
}: any) => {
  const [itemType, setItemType] = useState(
    forceProductOnly ? "product" : defaultItemType,
  );
  useEffect(() => {
    if (!forceProductOnly) return;
    setItemType("product");
  }, [forceProductOnly]);
  // Вид магазина мог догрузиться после открытия формы — подхватываем тип по умолчанию.
  useEffect(() => {
    if (forceProductOnly) return;
    setItemType((prev) =>
      prev === "product" || prev === "service" ? defaultItemType : prev,
    );
  }, [defaultItemType, forceProductOnly]);

  const [marketData, setMarketData] = useState({
    code: "",
    article: "",
    hotkeyGroup: "",
    unit: "шт",
    isWeightProduct: false,
    isAdult: false,
    isFractionalService: false,
    plu: "",
    height: "0",
    width: "0",
    depth: "0",
    weight: "0",
    description: "",
    country: "",
    purchasePrice: "",
    markup: "0",
    discount: "0",
    supplier: "",
    minStock: "0",
    expiryDate: "",
    shelfLifeValue: "",
    shelfLifeUnit: "days" as "days" | "months",
    kitProducts: [] as any[],
    kitSearchTerm: "",
    enablePieceSale: false,
    packagings: [] as any[],
    stock: false,
    promotionRules: [] as any[],
    alternateBarcodes: [] as any[],
  });

  const {
    kitProducts: kitProductsFromHook,
    addProductToKit: addProductToKitFromHook,
    removeProductFromKit: removeProductFromKitFromHook,
    updateKitProductQuantity: updateKitProductQuantityFromHook,
    recalculateKitPrice: recalculateKitPriceFromHook,
  } = useKitProducts(products);

  const handleMarketDataChange = useCallback((field: any, value: any) => {
    setMarketData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePromotionStockChange = useCallback((checked: any) => {
    setMarketData((prev) => ({
      ...prev,
      stock: checked,
      promotionRules:
        checked && (!prev.promotionRules || prev.promotionRules.length === 0)
          ? [
              {
                id: Date.now(),
                position: 0,
                min_amount: "",
                discount_percent: "",
                promo_quantity: "",
              },
            ]
          : checked
            ? prev.promotionRules
            : [],
    }));
  }, []);

  useEffect(() => {
    if (marketData.kitProducts !== kitProductsFromHook) {
      handleMarketDataChange("kitProducts", kitProductsFromHook);
    }
  }, [kitProductsFromHook, marketData.kitProducts, handleMarketDataChange]);

  const [showKitRecalculateTooltip, setShowKitRecalculateTooltip] =
    useState(false);

  return {
    itemType,
    setItemType,
    marketData,
    setMarketData,
    handleMarketDataChange,
    handlePromotionStockChange,
    showKitRecalculateTooltip,
    setShowKitRecalculateTooltip,
    addProductToKit: addProductToKitFromHook,
    removeProductFromKit: removeProductFromKitFromHook,
    handleUpdateKitProductQuantity: updateKitProductQuantityFromHook,
    recalculateKitPrice: recalculateKitPriceFromHook,
  };
};
