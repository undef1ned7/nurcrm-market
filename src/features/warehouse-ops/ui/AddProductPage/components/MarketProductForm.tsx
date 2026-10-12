import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { fetchProductsAsync } from "@entities/product";
import { MARKET_WAREHOUSE_KIND } from "@shared/lib/tools/marketWarehouseFilters";
import ProductTypeSelector from "./ProductTypeSelector";
import ProductBasicInfo from "./ProductBasicInfo";
import ProductImagesSection from "./ProductImagesSection";
import PackagingSection from "./PackagingSection";
import PromotionRulesEditor from "./PromotionRulesEditor";
import {
  BrandCategorySection,
  PluCodeSection,
  CharacteristicsSection,
  ProductWarehouseSection,
  ServicePricingSection,
  KitCompositionSection,
  MarketFormActions,
  VariantsSection,
} from "./sections";
import { useMarketSphere } from "@entities/user";
import { AddFieldsSheet, CustomizeBar, FormBlock } from "../formLayout";
import { useAppDispatch } from "@app/store";
import {
  filterKitCompositionCandidates,
  filterKitPickerList,
} from "../utils/kitPickerUtils";

const sanitizePriceTo3DecimalsLocal = (val) => {
  const s = String(val ?? "").replace(",", ".");
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join("").slice(0, 3);
};

const MarketProductForm = ({
  editingProductId = "",
  itemType,
  setItemType,
  forceProductOnly = false,
  newItemData,
  setNewItemData,
  marketData,
  handleMarketDataChange,
  onAdultEnabled,
  handlePromotionStockChange,
  handleChange,
  brands,
  categories,
  products,
  filterClient,
  handleSubmit,
  creating,
  _navigate,
  handleReturn,
  generateBarcode,
  addProductToKit,
  removeProductFromKit,
  recalculateKitPrice,
  handleUpdateKitProductQuantity,
  showKitRecalculateTooltip,
  setShowKitRecalculateTooltip,
  images,
  _setImages,
  fileInputRef,
  addImages,
  imageCropper = null,
  removeImage,
  setPrimaryImage,
  isEditMode = false,
  fieldErrors = {},
  showBrandInputs,
  setShowBrandInputs,
  newBrand,
  setNewBrand,
  onSubmitBrand,
  isBrandNameTaken = false,
  showCategoryInputs,
  setShowCategoryInputs,
  newCategory,
  setNewCategory,
  onSubmitCategory,
  isCategoryNameTaken = false,
  showInputs,
  setShowInputs,
  state,
  setState,
  onSubmit,
  debt,
  setDebt,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  showDebtForm,
  setShowDebtForm,
  debtState,
  _setDebtState,
  onChangeDebt,
  _pickSupplier,
  company,
}: any) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { features: sphereFeatures } = useMarketSphere();
  const brandOptions = useMemo(
    () =>
      (brands || [])
        .filter((b) => b?.name)
        .map((b) => ({ value: b.name, label: b.name })),
    [brands],
  );
  const categoryOptions = useMemo(
    () =>
      (categories || [])
        .filter((c) => c?.name)
        .map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const [kitPickerOpen, setKitPickerOpen] = useState(false);
  const [kitPickerSearch, setKitPickerSearch] = useState("");
  const [kitPickerCategory, setKitPickerCategory] = useState("");
  const [kitPickerSelected, setKitPickerSelected] = useState(() => new Set());
  const [kitPickerLoading, setKitPickerLoading] = useState(false);

  const kitAlreadyInKitIds = useMemo(
    () => (marketData.kitProducts || []).map((p) => p.id),
    [marketData.kitProducts],
  );

  const kitPickerCandidates = useMemo(
    () =>
      filterKitCompositionCandidates(products, {
        excludeProductId: editingProductId,
        alreadyInKitIds: kitAlreadyInKitIds,
      }),
    [products, editingProductId, kitAlreadyInKitIds],
  );

  const kitPickerList = useMemo(
    () =>
      filterKitPickerList(kitPickerCandidates, {
        search: kitPickerSearch,
        categoryId: kitPickerCategory,
        categories,
      }),
    [kitPickerCandidates, kitPickerSearch, kitPickerCategory, categories],
  );

  const isAllKitPickerSelected =
    kitPickerList.length > 0 &&
    kitPickerList.every((item) => kitPickerSelected.has(item.id));

  const openKitPicker = useCallback(async () => {
    setKitPickerOpen(true);
    setKitPickerSearch("");
    setKitPickerCategory("");
    setKitPickerSelected(new Set());
    try {
      setKitPickerLoading(true);
      await dispatch(
        fetchProductsAsync({
          page_size: 500,
          kind: MARKET_WAREHOUSE_KIND.product,
        }),
      ).unwrap();
    } catch (error: any) {
      console.error("Ошибка загрузки товаров для комплекта:", error);
    } finally {
      setKitPickerLoading(false);
    }
  }, [dispatch]);

  const toggleKitPickerItem = (id) => {
    setKitPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleKitPickerSelectAll = () => {
    const ids = kitPickerList.map((item) => item.id);
    if (isAllKitPickerSelected) {
      setKitPickerSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setKitPickerSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const applyKitPickerSelection = () => {
    if (kitPickerSelected.size === 0) return;
    kitPickerList
      .filter((item) => kitPickerSelected.has(item.id))
      .forEach((item) => addProductToKit(item.product));
    setKitPickerOpen(false);
    setKitPickerSelected(new Set());
  };

  const handleAddPackaging = () => {
    const packaging = {
      id: Date.now(),
      name: "",
      quantity: "1",
      pieceUnitPrice: "",
    };
    const currentPackagings = marketData.packagings || [];
    handleMarketDataChange("packagings", [...currentPackagings, packaging]);
  };

  const handleUpdatePackaging = (id, field, value) => {
    const currentPackagings = marketData.packagings || [];
    const normalizedValue =
      field === "pieceUnitPrice" || field === "piece_unit_price"
        ? sanitizePriceTo3DecimalsLocal(value)
        : value;
    const updatedPackagings = currentPackagings.map((p) =>
      p.id === id ? { ...p, [field]: normalizedValue } : p,
    );
    handleMarketDataChange("packagings", updatedPackagings);
  };

  const handleRemovePackaging = (id) => {
    const currentPackagings = marketData.packagings || [];
    handleMarketDataChange(
      "packagings",
      currentPackagings.filter((p) => p.id !== id),
    );
  };

  const handleTogglePieceSale = (enabled) => {
    handleMarketDataChange("enablePieceSale", enabled);
    if (!enabled) {
      handleMarketDataChange("packagings", []);
    }
  };

  useEffect(() => {
    if (itemType === "kit") {
      if (marketData.kitProducts.length > 0) {
        const totalCost = marketData.kitProducts.reduce((sum, item) => {
          const itemPrice = parseFloat(item.price || item.purchase_price || 0);
          const itemQuantity = parseFloat(item.quantity || 1);
          return sum + itemPrice * itemQuantity;
        }, 0);
        const calculatedPrice = Math.round(totalCost * 100) / 100;
        setNewItemData((prev) => ({
          ...prev,
          price: calculatedPrice.toString(),
        }));
      } else {
        setNewItemData((prev) => ({
          ...prev,
          price: "",
        }));
      }
    }
  }, [marketData.kitProducts, itemType, setNewItemData]);

  const [isPriceManuallyChanged, setIsPriceManuallyChanged] = useState(false);
  // Закупку/наценку трогал пользователь. Без этого открытие товара без закупочной
  // цены стирало загруженную цену продажи (закупка 0 и наценка 0 → цена "").
  const pricingTouchedRef = useRef(false);

  useEffect(() => {
    if (itemType === "product" && !isPriceManuallyChanged) {
      const purchasePrice = parseFloat(newItemData.purchase_price) || 0;
      const markup = parseFloat(marketData.markup) || 0;

      if (purchasePrice > 0 && markup >= 0) {
        const sellingPrice = purchasePrice * (1 + markup / 100);
        const calculatedPrice = Math.round(sellingPrice * 100) / 100;
        setNewItemData((prev) => ({
          ...prev,
          price: calculatedPrice.toString(),
        }));
      } else if (purchasePrice === 0 && markup === 0 && pricingTouchedRef.current) {
        setNewItemData((prev) => ({
          ...prev,
          price: "",
        }));
      }
    }
  }, [
    newItemData.purchase_price,
    marketData.markup,
    itemType,
    isPriceManuallyChanged,
    setNewItemData,
  ]);

  const handlePurchasePriceChange = (e) => {
    pricingTouchedRef.current = true;
    if (itemType === "product") setIsPriceManuallyChanged(false);
    handleChange(e);
  };
  const handleMarkupFieldChange = (e) => {
    pricingTouchedRef.current = true;
    if (itemType === "product") setIsPriceManuallyChanged(false);
    handleMarketDataChange("markup", e.target.value);
  };

  const handlePriceChange = (e) => {
    const { value } = e.target;
    setIsPriceManuallyChanged(true);
    handleChange(e);

    if (itemType === "product") {
      const purchasePrice = parseFloat(newItemData.purchase_price) || 0;
      const sellingPrice = parseFloat(value) || 0;

      if (purchasePrice > 0 && sellingPrice > 0) {
        const markupPercent = (sellingPrice / purchasePrice - 1) * 100;
        const roundedMarkup = Math.round(markupPercent * 100) / 100;
        handleMarketDataChange("markup", roundedMarkup.toString());
      }
    }
  };

  return (
    <div className="market-product-form">
      <CustomizeBar variant="entry" />

      {!forceProductOnly && (
        <ProductTypeSelector
          itemType={itemType}
          setItemType={setItemType}
          isEditMode={isEditMode}
        />
      )}

      <ProductBasicInfo
        newItemData={newItemData}
        handleChange={handleChange}
        marketData={marketData}
        handleMarketDataChange={handleMarketDataChange}
        generateBarcode={generateBarcode}
        fieldErrors={fieldErrors}
        itemType={itemType}
      />

      <ProductImagesSection
        images={images}
        fileInputRef={fileInputRef}
        onImageAdd={addImages}
        onImageRemove={removeImage}
        onSetPrimary={setPrimaryImage}
        imageCropper={imageCropper}
      />

      <BrandCategorySection
        newItemData={newItemData}
        handleChange={handleChange}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        showCategoryInputs={showCategoryInputs}
        setShowCategoryInputs={setShowCategoryInputs}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        onSubmitCategory={onSubmitCategory}
        isCategoryNameTaken={isCategoryNameTaken}
        showBrandInputs={showBrandInputs}
        setShowBrandInputs={setShowBrandInputs}
        newBrand={newBrand}
        setNewBrand={setNewBrand}
        onSubmitBrand={onSubmitBrand}
        isBrandNameTaken={isBrandNameTaken}
      />

      <PackagingSection
        itemType={itemType}
        marketData={marketData}
        newItemData={newItemData}
        handleMarketDataChange={handleMarketDataChange}
        handleChange={handleChange}
        handleTogglePieceSale={handleTogglePieceSale}
        handleAddPackaging={handleAddPackaging}
        handleUpdatePackaging={handleUpdatePackaging}
        handleRemovePackaging={handleRemovePackaging}
        fieldErrors={fieldErrors}
        onAdultEnabled={onAdultEnabled}
      />

      {/* «Одежда»: вместо весовых полей — размеры и цвета */}
      {sphereFeatures.variants && itemType === "product" && (
        <VariantsSection
          productId={editingProductId || null}
          productName={newItemData.name}
          productPrice={newItemData.price}
        />
      )}

      {itemType === "product" && (
        <FormBlock id="promotion">
        <div className="market-product-form__section">
          <h3 className="market-product-form__section-title">
            {t("crm.warehouse.addProduct.promotionTitle")}
          </h3>
          <PromotionRulesEditor
              compact={false as any}
            stock={marketData.stock}
            onStockChange={handlePromotionStockChange}
            tiers={marketData.promotionRules || []}
            onTiersChange={(next) =>
              handleMarketDataChange("promotionRules", next)
            }
            errorText={fieldErrors.promotion_rules}
          />
        </div>
        </FormBlock>
      )}

      <PluCodeSection
        itemType={itemType}
        marketData={marketData}
        handleMarketDataChange={handleMarketDataChange}
      />

      <CharacteristicsSection
        marketData={marketData}
        handleMarketDataChange={handleMarketDataChange}
      />

      {itemType === "product" && (
        <ProductWarehouseSection
          marketData={marketData}
          handleMarketDataChange={handleMarketDataChange}
          newItemData={newItemData}
          fieldErrors={fieldErrors}
          handleChange={handleChange}
          handlePurchasePriceChange={handlePurchasePriceChange}
          handleMarkupFieldChange={handleMarkupFieldChange}
          handlePriceChange={handlePriceChange}
          filterClient={filterClient}
          showInputs={showInputs}
          setShowInputs={setShowInputs}
          state={state}
          setState={setState}
          onSubmit={onSubmit}
          showDebtForm={showDebtForm}
          setShowDebtForm={setShowDebtForm}
          company={company}
          onChangeDebt={onChangeDebt}
          debtState={debtState}
          debt={debt}
          setDebt={setDebt}
          amount={amount}
          setAmount={setAmount}
          debtMonths={debtMonths}
          setDebtMonths={setDebtMonths}
        />
      )}

      {itemType === "service" && (
        <ServicePricingSection
          newItemData={newItemData}
          marketData={marketData}
          handleChange={handleChange}
          handleMarketDataChange={handleMarketDataChange}
        />
      )}

      {itemType === "kit" && (
        <KitCompositionSection
          marketData={marketData}
          handleMarketDataChange={handleMarketDataChange}
          handleUpdateKitProductQuantity={handleUpdateKitProductQuantity}
          removeProductFromKit={removeProductFromKit}
          openKitPicker={openKitPicker}
          kitPickerOpen={kitPickerOpen}
          setKitPickerOpen={setKitPickerOpen}
          kitPickerSearch={kitPickerSearch}
          setKitPickerSearch={setKitPickerSearch}
          kitPickerCategory={kitPickerCategory}
          setKitPickerCategory={setKitPickerCategory}
          categories={categories}
          kitPickerList={kitPickerList}
          kitPickerSelected={kitPickerSelected}
          toggleKitPickerItem={toggleKitPickerItem}
          toggleKitPickerSelectAll={toggleKitPickerSelectAll}
          isAllKitPickerSelected={isAllKitPickerSelected}
          applyKitPickerSelection={applyKitPickerSelection}
          kitPickerLoading={kitPickerLoading}
          kitPickerCandidates={kitPickerCandidates}
          newItemData={newItemData}
          handleChange={handleChange}
          recalculateKitPrice={recalculateKitPrice}
          showKitRecalculateTooltip={showKitRecalculateTooltip}
          setShowKitRecalculateTooltip={setShowKitRecalculateTooltip}
        />
      )}

      <CustomizeBar variant="edit" />
      <AddFieldsSheet />

      <MarketFormActions
        handleReturn={handleReturn}
        handleSubmit={handleSubmit}
        creating={creating}
        isEditMode={isEditMode}
      />
    </div>
  );
};

export default MarketProductForm;
