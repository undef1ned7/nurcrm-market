import { useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { useClient } from "@entities/client";
import { useProducts } from "@entities/product";
import { useMarketSphere, useUser } from "@entities/user";
import { useProductImages } from "./useProductImages";
import { useDebtForm } from "./useDebtForm";
import { useSupplierForm } from "./useSupplierForm";
import { useMarketProductState } from "./useMarketProductState";
import { useBrandCategoryDict } from "./useBrandCategoryDict";
import { useAddProductBootstrap } from "./useAddProductBootstrap";
import { useAddProductSubmitFlow } from "./useAddProductSubmitFlow";
import { sanitizePriceTo3Decimals } from "./addProductHelpers";
import {
  useRecordShiftDrawerOutflow,
  useShiftDrawerFundingTarget,
} from "@entities/shift";
import * as utils from "../utils";

/**
 * Composes AddProductPage state/handlers from domain hooks.
 */
export const useAddProductPage = ({
  embedded = false,
  embeddedPrefillSupplierId = "",
  embeddedReturnTo = "",
  onEmbeddedClose = null,
  onEmbeddedSaved = null,
  forceProductOnly = false,
}: any = {}) => {
  const { id: productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { list } = useClient();
  const {
    creating,
    updating,
    brands,
    brandsNext,
    brandsCount,
    brandsLoading,
    categories,
    categoriesNext,
    categoriesCount,
    categoriesLoading,
    scannedProduct,
    list: products,
    count,
    weightProductsCount,
  } = useProducts();
  const { company } = useUser();
  const returnToPath =
    (typeof embeddedReturnTo === "string" && embeddedReturnTo.trim()) ||
    (typeof location.state?.returnTo === "string" && location.state.returnTo.trim()) ||
    "/crm/sklad";
  const prefillSupplierId = String(
    embeddedPrefillSupplierId || location.state?.prefillSupplierId || "",
  ).trim();
  const handleReturn = useCallback(() => {
    if (embedded && typeof onEmbeddedClose === "function") {
      onEmbeddedClose();
      return;
    }
    navigate(returnToPath);
  }, [embedded, navigate, onEmbeddedClose, returnToPath]);

  const isEditMode = !!productId;
  const { features: sphereFeatures } = useMarketSphere();
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  // Товар для редактирования не загрузился — форму не показываем (иначе можно
  // «сохранить» пустую форму поверх товара)
  const [productLoadError, setProductLoadError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [productType, setProductType] = useState("piece");

  const {
    itemType,
    setItemType,
    marketData,
    setMarketData,
    handleMarketDataChange,
    handlePromotionStockChange,
    showKitRecalculateTooltip,
    setShowKitRecalculateTooltip,
    addProductToKit,
    removeProductFromKit,
    handleUpdateKitProductQuantity,
    recalculateKitPrice,
  } = useMarketProductState({
    products,
    forceProductOnly,
    // «Услуги»: новая позиция по умолчанию — услуга. В режиме правки тип
    // берётся из товара (useAddProductBootstrap).
    defaultItemType:
      !productId && sphereFeatures.servicesFirst ? "service" : "product",
  });

  const {
    images,
    setImages,
    fileInputRef,
    addImages,
    removeImage,
    setPrimaryImage,
    imageCropper,
  } = useProductImages();

  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });
  const showAlert = (message, type = "error", title = "") => {
    setAlertModal({ open: true, type, title, message });
  };

  const [newItemData, setNewItemData] = useState({
    name: "",
    barcode: "",
    brand_name: "",
    category_name: "",
    price: "",
    wholesale_price: "",
    quantity: "",
    client: "",
    purchase_price: "",
    plu: "",
    scale_type: "",
  });

  const {
    showInputs,
    setShowInputs,
    state,
    setState,
    onChange,
    onSubmit,
  } = useSupplierForm(setNewItemData, showAlert);

  const brandCategory = useBrandCategoryDict({
    brands,
    brandsNext,
    brandsCount,
    categories,
    categoriesNext,
    categoriesCount,
    setNewItemData,
    showAlert,
  });

  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [initialProductImageIds, setInitialProductImageIds] = useState<any[]>([]);
  // Остаток в момент загрузки товара для правки: если его не трогали, PATCH
  // уходит без quantity и не перезаписывает продажи, прошедшие пока форма открыта.
  const [loadedQuantity, setLoadedQuantity] = useState<string | null>(null);
  const [paidFromShiftDrawer, setPaidFromShiftDrawer] = useState(false);
  const shiftDrawerFundingTarget = useShiftDrawerFundingTarget();
  const recordShiftDrawerOutflow = useRecordShiftDrawerOutflow();

  const {
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    showDebtForm,
    setShowDebtForm,
    debtState,
    setDebtState,
    onChangeDebt,
    pickSupplier,
  } = useDebtForm(newItemData, list, company);

  useAddProductBootstrap({
    isEditMode,
    productId,
    prefillSupplierId,
    setLoadingProduct,
    setProductLoadError,
    setItemType,
    setNewItemData,
    setMarketData,
    setImages,
    setInitialProductImageIds,
    setLoadedQuantity,
    showAlert,
    newItemData,
    itemType,
    marketData,
    count,
    weightProductsCount,
    companyId: company?.id,
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue =
      type === "number" ? (value === "" ? "" : parseInt(value)) : value;
    if (name === "price" || name === "purchase_price") {
      finalValue = sanitizePriceTo3Decimals(value);
    }
    setNewItemData((prevData) => ({
      ...prevData,
      [name]: finalValue,
      scale_type:
        name === "scale_type"
          ? value
          : prevData.scale_type || productType === "piece"
            ? "piece"
            : "weight",
    }));
  };

  const { handleSubmit, submitting } = useAddProductSubmitFlow({
    newItemData,
    marketData,
    itemType,
    weightProductsCount,
    isEditMode,
    productId,
    images,
    initialProductImageIds,
    loadedQuantity,
    debt,
    debtMonths,
    amount,
    debtState,
    company,
    pickSupplier,
    embedded,
    onEmbeddedSaved,
    returnToPath,
    navigate,
    showAlert,
    setFieldErrors,
    setDebt,
    setAmount,
    setDebtMonths,
    setShowDebtForm,
    setDebtState,
    paidFromShiftDrawer,
    setPaidFromShiftDrawer,
    shiftDrawerFundingTarget,
    recordShiftDrawerOutflow,
  });

  const filterClient = list.filter((item) => item.type === "suppliers");
  const generateBarcode = () => {
    const barcode = utils.generateEAN13Barcode();
    setNewItemData((prev) => ({ ...prev, barcode }));
  };

  return {
    productId,
    isEditMode,
    loadingProduct,
    productLoadError,
    embedded,
    forceProductOnly,
    handleReturn,
    navigate,
    activeTab,
    setActiveTab,
    productType,
    setProductType,
    itemType,
    setItemType,
    list,
    brands,
    brandsNext,
    brandsCount,
    brandsLoading,
    categories,
    categoriesNext,
    categoriesCount,
    categoriesLoading,
    scannedProduct,
    products,
    count,
    weightProductsCount,
    company,
    creating: creating || submitting,
    updating,
    newItemData,
    setNewItemData,
    marketData,
    setMarketData,
    handleMarketDataChange,
    handlePromotionStockChange,
    handleChange,
    fieldErrors,
    images,
    setImages,
    fileInputRef,
    addImages,
    removeImage,
    setPrimaryImage,
    imageCropper,
    addProductToKit,
    removeProductFromKit,
    handleUpdateKitProductQuantity,
    recalculateKitPrice,
    showKitRecalculateTooltip,
    setShowKitRecalculateTooltip,
    alertModal,
    setAlertModal,
    showAlert,
    brandQuery: brandCategory.brandQuery,
    setBrandQuery: brandCategory.setBrandQuery,
    categoryQuery: brandCategory.categoryQuery,
    setCategoryQuery: brandCategory.setCategoryQuery,
    brandOptions: brandCategory.brandOptions,
    categoryOptions: brandCategory.categoryOptions,
    hasMoreBrands: brandCategory.hasMoreBrands,
    hasMoreCategories: brandCategory.hasMoreCategories,
    handleLoadMoreBrands: brandCategory.handleLoadMoreBrands,
    handleLoadMoreCategories: brandCategory.handleLoadMoreCategories,
    showBrandInputs: brandCategory.showBrandInputs,
    setShowBrandInputs: brandCategory.setShowBrandInputs,
    newBrand: brandCategory.newBrand,
    setNewBrand: brandCategory.setNewBrand,
    onSubmitBrand: brandCategory.onSubmitBrand,
    isBrandNameTaken: brandCategory.isBrandNameTaken,
    showCategoryInputs: brandCategory.showCategoryInputs,
    setShowCategoryInputs: brandCategory.setShowCategoryInputs,
    newCategory: brandCategory.newCategory,
    setNewCategory: brandCategory.setNewCategory,
    onSubmitCategory: brandCategory.onSubmitCategory,
    isCategoryNameTaken: brandCategory.isCategoryNameTaken,
    showInputs,
    setShowInputs,
    state,
    setState,
    onChange,
    onSubmit,
    filterClient,
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    showDebtForm,
    setShowDebtForm,
    debtState,
    setDebtState,
    onChangeDebt,
    pickSupplier,
    handleSubmit,
    generateBarcode,
    paidFromShiftDrawer,
    setPaidFromShiftDrawer,
    shiftDrawerFundingTarget,
  };
};
