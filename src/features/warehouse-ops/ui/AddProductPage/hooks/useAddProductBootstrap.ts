import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { fetchClientsAsync } from "@entities/client";
import { getCashBoxes } from "@entities/cash";
import { fetchProductsAsync } from "@entities/product";
import * as utils from "../utils";
import { useAppDispatch } from "@app/store";

/**
 * Initial data loads, edit/duplicate hydration, cash sync, auto-generated codes.
 */
export const useAddProductBootstrap = ({
  isEditMode,
  productId,
  prefillSupplierId,
  setLoadingProduct,
  setItemType,
  setNewItemData,
  setMarketData,
  setImages,
  setInitialProductImageIds,
  showAlert,
  cashBoxes,
  selectCashBox,
  setSelectCashBox,
  setCashData,
  newItemData,
  itemType,
  marketData,
  count,
  weightProductsCount,
}: any) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isEditMode || !prefillSupplierId) return;
    setNewItemData((prev) => {
      if (String(prev.client || "").trim()) return prev;
      return { ...prev, client: prefillSupplierId };
    });
  }, [isEditMode, prefillSupplierId, setNewItemData]);

  useEffect(() => {
    dispatch(fetchClientsAsync({} as any) as any);
    dispatch(getCashBoxes({} as any) as any);
    const productsRequest = dispatch(fetchProductsAsync({ page_size: 100 }));
    return () => {
      productsRequest.abort();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && productId) {
      const loadProduct = async () => {
        try {
          setLoadingProduct(true);
          const response = await api.get(`/main/products/${productId}/`);
          const product = response.data;

          // Определяем тип товара на основе kind
          let detectedItemType = "product";
          if (product.kind === "service") {
            detectedItemType = "service";
          } else if (product.kind === "bundle") {
            detectedItemType = "kit";
          }
          setItemType(detectedItemType);

          // Заполняем основные данные
          // Форматируем цену до 3 знаков после запятой при загрузке для редактирования
          const formatPrice3Decimals = (v) => {
            if (v === null || v === undefined || v === "") return "";
            const n = Number(String(v).replace(",", "."));
            return Number.isFinite(n)
              ? (Math.round(n * 1000) / 1000).toString()
              : String(v);
          };
          setNewItemData({
            name: product.name || "",
            barcode: product.barcode || "",
            brand_name: product.brand_name || "",
            category_name: product.category_name || "",
            price: formatPrice3Decimals(product.price),
            wholesale_price: formatPrice3Decimals(product.wholesale_price),
            quantity: utils.stripTrailingZeros(product.quantity) || "",
            client: product.client || "",
            purchase_price: formatPrice3Decimals(product.purchase_price),
            plu: product.plu || "",
            scale_type: product.scale_type || "",
          });

          // Заполняем данные для маркета
          setMarketData({
            code: product.code || "",
            article: product.article || "",
            hotkeyGroup: product.hotkey_group || "",
            unit: product.unit || "шт",
            isWeightProduct: product.is_weight || false,
            isFractionalService: product.is_weight || false,
            plu: product.plu ? String(product.plu) : "",
            height: utils.stripTrailingZeros(product.characteristics?.height_cm) || "0",
            width: utils.stripTrailingZeros(product.characteristics?.width_cm) || "0",
            depth: utils.stripTrailingZeros(product.characteristics?.depth_cm) || "0",
            weight:
              utils.stripTrailingZeros(
                product.characteristics?.factual_weight_kg,
              ) || "0",
            description: product.characteristics?.description || "",
            country: product.country || "",
            purchasePrice: formatPrice3Decimals(product.purchase_price) || "",
            markup: utils.stripTrailingZeros(product.markup_percent) || "0",
            discount: utils.stripTrailingZeros(product.discount_percent) || "0",
            supplier: product.client || "",
            minStock: "0", // Нет в API
            expiryDate: product.expiration_date || "",
            kitProducts: [] as any[], // Будет загружено из packages
            kitSearchTerm: "",
            enablePieceSale: Boolean((product.packages || []).length),
            packagings: (product.packages || []).map((pkg, idx) => ({
              id: Date.now() + idx,
              name: pkg.name || "",
              quantity: utils.stripTrailingZeros(pkg.quantity_in_package) || "1",
              pieceUnitPrice: formatPrice3Decimals(pkg.piece_unit_price || ""),
            })),
            stock: Boolean(product.stock),
            promotionRules: utils.normalizePromotionRulesFromApi(
              product.promotion_rules || [],
            ),
            alternateBarcodesText: Array.isArray(product.alternate_barcodes)
              ? product.alternate_barcodes.filter(Boolean).join("\n")
              : "",
          });

          // Загружаем изображения используя хук
          if (product.images && product.images.length > 0) {
            const loadedImages = product.images.map((img) => ({
              file: null,
              alt: img.alt || "",
              is_primary: img.is_primary || false,
              preview: img.image_url || img.image || "",
              id: img.id,
            }));
            setImages(loadedImages);
            setInitialProductImageIds(
              product.images.map((img) => img.id).filter(Boolean),
            );
          } else {
            setInitialProductImageIds([]);
          }

          // Для комплекта загружаем состав из packages
          if (detectedItemType === "kit" && product.packages) {
            // Нужно найти товары по названиям из packages
            // Пока оставляем пустым, можно будет доработать
          }
        } catch (error: any) {
          console.error("Ошибка при загрузке товара:", error);
          const errorMessage = validateResErrors(
            error,
            "Ошибка при загрузке товара. ",
          );
          showAlert(errorMessage, "error", "Ошибка");
        } finally {
          setLoadingProduct(false);
        }
      };
      loadProduct();
    }
  }, [isEditMode, productId, setImages]);

  // Обработка дублирования товара
  useEffect(() => {
    const duplicateData = location.state?.duplicate
      ? location.state.productData
      : null;
    if (duplicateData && !isEditMode) {
      const product = duplicateData;

      // Определяем тип товара на основе kind
      let detectedItemType = "product";
      if (product.kind === "service") {
        detectedItemType = "service";
      } else if (product.kind === "bundle") {
        detectedItemType = "kit";
      }
      setItemType(detectedItemType);

      // Форматируем цену до 3 знаков при дублировании
      const formatPrice3DecimalsDup = (v) => {
        if (v === null || v === undefined || v === "") return "";
        const n = Number(String(v).replace(",", "."));
        return Number.isFinite(n)
          ? (Math.round(n * 1000) / 1000).toString()
          : String(v);
      };
      // Заполняем основные данные (очищаем ID, штрих-код и количество для нового товара)
      setNewItemData({
        name: product.name || "",
        barcode: "", // Очищаем штрих-код для нового товара
        brand_name: product.brand_name || "",
        category_name: product.category_name || "",
        price: formatPrice3DecimalsDup(product.price),
        wholesale_price: formatPrice3DecimalsDup(product.wholesale_price),
        quantity: "", // Очищаем количество для нового товара
        client: product.client || "",
        purchase_price: formatPrice3DecimalsDup(product.purchase_price),
        plu: product.plu || "",
        scale_type: product.scale_type || "",
      });

      // Заполняем данные для маркета
      setMarketData({
        code: product.code || "",
        article: product.article || "",
        hotkeyGroup: product.hotkey_group || "",
        unit: product.unit || "шт",
        isWeightProduct: product.is_weight || false,
        isFractionalService: product.is_weight || false,
        plu: product.plu ? String(product.plu) : "",
        height: utils.stripTrailingZeros(product.characteristics?.height_cm) || "0",
        width: utils.stripTrailingZeros(product.characteristics?.width_cm) || "0",
        depth: utils.stripTrailingZeros(product.characteristics?.depth_cm) || "0",
        weight:
          utils.stripTrailingZeros(product.characteristics?.factual_weight_kg) ||
          "0",
        description: product.characteristics?.description || "",
        country: product.country || "",
        purchasePrice: formatPrice3DecimalsDup(product.purchase_price) || "",
        markup: utils.stripTrailingZeros(product.markup_percent) || "0",
        discount: utils.stripTrailingZeros(product.discount_percent) || "0",
        supplier: product.client || "",
        minStock: "0",
        expiryDate: product.expiration_date || "",
        kitProducts: [] as any[], // Для комплекта можно будет доработать
        kitSearchTerm: "",
        enablePieceSale: Boolean((product.packages || []).length),
        packagings: (product.packages || []).map((pkg, idx) => ({
          id: Date.now() + idx,
          name: pkg.name || "",
          quantity: utils.stripTrailingZeros(pkg.quantity_in_package) || "1",
          pieceUnitPrice: formatPrice3DecimalsDup(pkg.piece_unit_price || ""),
        })),
        stock: Boolean(product.stock),
        promotionRules: utils.normalizePromotionRulesFromApi(
          product.promotion_rules || [],
        ),
        alternateBarcodesText: Array.isArray(product.alternate_barcodes)
          ? product.alternate_barcodes.filter(Boolean).join("\n")
          : "",
      });

      // Загружаем изображения (копируем ссылки, но не файлы); для нового товара не храним id для удаления
      if (product.images && product.images.length > 0) {
        const loadedImages = product.images.map((img) => ({
          file: null, // Файл не копируем, только URL для предпросмотра
          alt: img.alt || "",
          is_primary: img.is_primary || false,
          preview: img.image_url || img.image || "",
          id: img.id,
        }));
        setImages(loadedImages);
      }
      setInitialProductImageIds([]);

      // Очищаем state после использования, чтобы при возврате назад не дублировалось снова
      if (location.state) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, isEditMode, navigate, location.pathname, setImages]);

  // Автоматически выбираем первую кассу
  useEffect(() => {
    if (cashBoxes && cashBoxes.length > 0 && !selectCashBox) {
      const firstCashBox = cashBoxes[0];
      const firstCashBoxId = firstCashBox?.id || firstCashBox?.uuid || "";
      if (firstCashBoxId) {
        setSelectCashBox(firstCashBoxId);
      }
    }
  }, [cashBoxes, selectCashBox]);

  useEffect(() => {
    setCashData((prev) => ({
      ...prev,
      cashbox: selectCashBox,
      name: newItemData.name,
      amount: newItemData.price,
    }));
  }, [newItemData, selectCashBox]);

  // Генерируем EAN-13 штрих-код автоматически при загрузке (только для создания)
  useEffect(() => {
    if (!isEditMode && !newItemData.barcode) {
      const barcode = utils.generateEAN13Barcode();
      setNewItemData((prev) => ({
        ...prev,
        barcode: barcode,
      }));
    }
  }, [isEditMode, newItemData.barcode]);

  // Генерируем ПЛУ автоматически если пустой
  useEffect(() => {
    if (!newItemData.plu) {
      setNewItemData((prev) => ({
        ...prev,
        plu: "0001",
      }));
    }
  }, [newItemData.plu]);

  // Генерируем код товара на основе count из API (только для создания)
  // Всегда синхронизируем с count при изменении, чтобы после загрузки API (обновление страницы) код был правильным
  useEffect(() => {
    if (!isEditMode) {
      const newCode = String((count || 0) + 1).padStart(4, "0");
      setMarketData((prev) => {
        const articleUnchanged =
          prev.article === "" || prev.article === prev.code;
        return {
          ...prev,
          code: newCode,
          article: articleUnchanged ? newCode : prev.article,
        };
      });
    }
  }, [isEditMode, count]);

  // Автоматическая генерация PLU для весового товара или дробной услуги
  useEffect(() => {
    const isWeight =
      (itemType === "product" && marketData.isWeightProduct) ||
      (itemType === "service" && marketData.isFractionalService);

    // Генерируем PLU только если:
    // 1. Товар/услуга весовой/дробный
    // 2. PLU еще не заполнен вручную
    // 3. weightProductsCount доступен
    if (isWeight && (!marketData.plu || marketData.plu.trim() === "")) {
      const generatedPlu = weightProductsCount + 1;
      setMarketData((prev) => ({ ...prev, plu: String(generatedPlu) }));
    } else if (!isWeight && marketData.plu) {
      // Если весовой режим выключен, очищаем PLU
      setMarketData((prev) => ({ ...prev, plu: "" }));
    }
  }, [
    itemType,
    marketData.isWeightProduct,
    marketData.isFractionalService,
    weightProductsCount,
    marketData.plu,
  ]);
};
