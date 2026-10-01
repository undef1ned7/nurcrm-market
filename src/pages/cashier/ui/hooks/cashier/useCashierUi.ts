import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useStore } from "react-redux";
import { useNavigate, useSearchParams } from "react-router";
import useScanDetection from "@shared/hooks/useScanDetection";
import { useDebounce, useDebounceByKey } from "@shared/hooks/useDebounce";
import { useCashierQtyScanGuard } from "@shared/hooks/useCashierQtyScanGuard";
import { fetchClientsAsync } from "@entities/client";
import { fetchProductsAsync } from "@entities/product";
import { fetchProductsApi } from "@entities/product/api/products";
import {
  addCustomItem,
  deleteProductInCart,
  getSale,
  manualFilling,
  sendBarCode,
  startSale,
  updateManualFilling,
  updateProductInCart,
} from "@entities/sale";
import { fetchShiftsAsync } from "@entities/shift";
import { getCashBoxes, useCash } from "@entities/cash";
import api from "@shared/api";
import { productMatchesBarcode } from "@shared/lib/tools/productBarcode";
import { isMarketWarehouseServiceProduct } from "@shared/lib/tools/marketWarehouseFilters";
import { toMoney } from "@shared/lib/tools/money";
import { useClient } from "@entities/client";
import { useProducts } from "@entities/product";
import { useSale } from "@entities/sale";
import { useShifts } from "@entities/shift";
import { useUser } from "@entities/user";
import sleep from "@shared/lib/tools/sleep";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  MARKET_CASHIER_SALE_ID_PARAM,
  useMarketCashierMultiCart,
} from "@features/create-sale/model/useMarketCashierMultiCart";
import { useMarketCashierSettings } from "@features/create-sale/model/useMarketCashierSettings";
import {
  getDefaultPackage,
  maxPiecesAvailable,
  supportsPieceFromPack,
} from "@shared/lib/tools/marketPackPieceSale";
import {
  fetchOwnOpenShift,
  findOwnOpenShiftInList,
  isOwnOpenShift,
  resolveCashierId,
} from "@shared/lib/tools/cashierOpenShift";
import {
  getBarcodeAmbiguity,
  isBarcodeNotFoundError,
} from "@shared/lib/tools/barcodeAmbiguity";
import {
  CART_LINE_PRODUCT_TTL_MS,
  MARKET_CASHIER_WHOLESALE_MODE_KEY,
} from "../../cashierPage.constants";
import {
  calcTotalConsumeForProduct,
  formatDiscountPercentFromLine,
  formatPrice,
  formatQuantity,
  getSaleShiftId,
  isIncompleteDecimalInput,
  isSameCartLine,
  isShiftNotOpenApiError,
  mergeChangedMap,
  normalizeCompactProductsResponse,
  normalizeHotkeyGroup,
  normalizePrice,
  normalizeQuantity,
  parseDecimalInput,
  setNativeInputValue,
  shouldSyncDecimalFieldWhileTyping,
  stripTrailingZerosAfterDecimal,
} from "../../cashierPage.utils";
import type {
  CartDiscountMode,
  CartLine,
  CashierProduct,
  DeleteCodePromptState,
  PieceSaleModalState,
} from "../../cashierPage.types";


export function useCashierUi(b) {
  const {
    currentSale, cart, setShowMenuModal, setShowShiftPage, setShowDebtModal,
    setShowReceiptsModal, setShowDeletionsLogModal, openShift, setShowCloseShiftPage,
    setShowOpenShiftPage, products, getProductFavorite, hotkeyProducts,
  } = b;

  // currentSale?.total из API — источник истины (учитывает скидки). toMoney
  // возвращает NaN, а не 0, когда данных нет — поэтому честный нулевой итог
  // (100% скидка, бесплатный товар) не подменяется несконтованной суммой
  // корзины через ||. См. docs/sale-flow-bugs.md, пункты 3 и 10.
  const parsedServerTotal = toMoney(currentSale?.total);
  const total = Number.isFinite(parsedServerTotal)
    ? parsedServerTotal
    : cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const handleMenuAction = (action) => {
    setShowMenuModal(false);
    if (action === "shifts") {
      setShowShiftPage(true);
    } else if (action === "debt") {
      setShowDebtModal(true);
    } else if (action === "receipts") {
      setShowReceiptsModal(true);
    } else if (action === "deletions") {
      setShowDeletionsLogModal(true);
    } else if (action === "quick-slots") {
      b.setShowQuickSlotsModal?.(true);
    }
  };

  const handleCloseShift = () => {
    if (!openShift?.id) return;
    // Показываем экран закрытия смены
    setShowCloseShiftPage(true);
  };

  // Функция для открытия смены
  const handleStartShift = () => {
    // Показываем экран открытия смены
    setShowOpenShiftPage(true);
  };

  const filteredProducts = useMemo(() => {
    const items = currentSale?.items || currentSale?.cart?.items || [];
    return products
      .map((el) => {
        const qty = parseFloat(el.quantity);
        const cartQty = calcTotalConsumeForProduct(items, el.id, products);
        const primaryImg = el.images.find((el) => el.is_primary);
        return {
          ...el,
          quantity: qty,
          isCart: !!cartQty,
          cartQty,
          img:
            primaryImg?.image_url ??
            el.images[0]?.image_url ??
            "/images/placeholder.avif",
          isFavorite: getProductFavorite(el),
        };
      })
      .filter(
        (el) =>
          isMarketWarehouseServiceProduct(el) || !!el.quantity || el.isCart,
      )
      .map((el, index) => ({ ...el, __orderIndex: index }))
      .sort((a, b) => {
        const favDelta = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
        if (favDelta !== 0) return favDelta;
        return a.__orderIndex - b.__orderIndex;
      });
  }, [products, currentSale, getProductFavorite]);

  const hotkeyFilteredProducts = useMemo(() => {
    const items = currentSale?.items || currentSale?.cart?.items || [];
    const enrichedProducts = hotkeyProducts.map((product) => {
      const fallbackProduct = products.find((item) => item.id === product.id);
      return fallbackProduct
        ? {
            ...fallbackProduct,
            ...product,
            images:
              Array.isArray(product?.images) && product.images.length > 0
                ? product.images
                : Array.isArray(fallbackProduct?.images)
                  ? fallbackProduct.images
                  : [],
            packages:
              Array.isArray(product?.packages) && product.packages.length > 0
                ? product.packages
                : Array.isArray(fallbackProduct?.packages)
                  ? fallbackProduct.packages
                  : [],
          }
        : {
            ...product,
            images: Array.isArray(product?.images) ? product.images : [],
            packages: Array.isArray(product?.packages) ? product.packages : [],
          };
    });

    return enrichedProducts
      .map((mergedProduct, index) => {
        const qty = parseFloat(mergedProduct.quantity);
        const cartQty = calcTotalConsumeForProduct(
          items,
          mergedProduct.id,
          enrichedProducts,
        );
        const primaryImg = mergedProduct.images.find((item) => item.is_primary);

        return {
          ...mergedProduct,
          quantity: qty,
          isCart: !!cartQty,
          cartQty,
          img:
            mergedProduct.primary_image_url ??
            primaryImg?.image_url ??
            mergedProduct.images[0]?.image_url ??
            "/images/placeholder.avif",
          isFavorite: getProductFavorite(mergedProduct),
          __orderIndex: index,
        };
      })
      .filter(
        (product) =>
          isMarketWarehouseServiceProduct(product) ||
          normalizeQuantity(product.quantity) > 0,
      )
      .sort((a, b) => {
        const favDelta =
          Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
        if (favDelta !== 0) return favDelta;
        return a.__orderIndex - b.__orderIndex;
      });
  }, [currentSale, getProductFavorite, hotkeyProducts, products]);

  Object.assign(b, {
    total, handleMenuAction, handleCloseShift, handleStartShift,
    filteredProducts, hotkeyFilteredProducts,
  });
  return b;
}
