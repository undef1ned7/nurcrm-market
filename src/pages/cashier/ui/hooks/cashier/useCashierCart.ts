import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useStore } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
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


export function useCashierCart(b: any) {
  const {
    dispatch, openShiftId, ensureActiveSaleId, getSelectedSaleId, getCartLineSaleId,
    preferredWholesaleMode, refreshSaleFromStore, multiCart, multiCartRef,
    cart, setCart, cartRef, cartOrderRef, products,
    resolveProductWithPackages, resolveCartLineProduct, openPieceSaleChoice,
    requestCartQuantityFocus, showAlert, canMarketDeleteCartItem, ensureDeleteCode,
    canMarketEditPrice, canMarketDiscount, discountLimitPercent,
    cartQuantities, setCartQuantities, cartPrices, setCartPrices,
    cartDiscounts, setCartDiscounts, cartDiscountModes, setCartDiscountModes,
    cartDiscountModesRef, debouncedQtyApiByLine, debouncedDiscountApiByLine,
    cancelDebouncedQtyApiByLine, pendingQtyLineInputRef, pendingDiscountLineRef,
    pendingPricePatchRef, pendingDiscountPatchRef, cancelPendingDiscountLineInput,
    qtyInputFocusRef, suppressQtyBlurUpdateRef, priceInputFocusRef,
    shouldSyncQuantityToApiWhileTyping, pieceSaleModal, setPieceSaleModal,
    closePieceSaleModal, barcodeAmbiguity, setBarcodeAmbiguity,
    setBarcodeAmbiguityLoading, getSaleIdFromUrl, store, currentSale, refreshSale,
    addToCartRef, commitFocusedQuantityInputRef, updateCustomQuantityByDelta,
    removeCustomFromCart, updateCustomQuantityDirect,
  } = b;

  const addToCartWithPackage = async (
    product: any,
    salePackageId: any = null,
    quantityOverride: any = null,
  ) => {
    // Для весовых товаров при остатке < 1 добавляем весь остаток.
    // Если остаток 0/минус/некорректный — подставляем 1.
    const availableQuantity = normalizeQuantity(product?.quantity);
    const defaultQty =
      salePackageId != null
        ? 1
        : availableQuantity > 0 && availableQuantity < 1
          ? availableQuantity
          : 1;
    const qtyToAdd = normalizeQuantity(
      quantityOverride != null ? quantityOverride : defaultQty,
    );

    try {
      // Проверяем наличие открытой смены перед добавлением товара
      if (!openShiftId) {
        showAlert(
          "warning",
          "Нет открытой смены",
          "Для работы с кассой необходимо начать смену",
        );
        return;
      }

      let saleId;
      try {
        saleId = await ensureActiveSaleId(openShiftId);
      } catch (error: any) {
        const message = validateResErrors(
          error,
          "Не удалось создать продажу",
        );
        showAlert("error", "Ошибка", message);
        return;
      }

      if (!saleId) {
        showAlert("error", "Ошибка", "Не удалось получить ID продажи");
        return;
      }

      // Проверяем, есть ли товар уже в корзине.
      // Используем локальную корзину (cart), т.к. raw items из sale/start
      // могут не содержать корректный sale_package сразу после добавления.
      const existingCartLine = (cartRef.current || []).find(
        (line: any) =>
          !line.isCustom &&
          String(line.productId) === String(product.id) &&
          String(line.salePackage ?? "") === String(salePackageId ?? ""),
      );

      if (existingCartLine?.itemId) {
        const currentQty = normalizeQuantity(existingCartLine.quantity);
        const newQuantity = normalizeQuantity(currentQty + qtyToAdd);
        // Обновляем количество
        await dispatch(
          updateManualFilling({
            id: saleId,
            productId: existingCartLine.itemId,
            quantity: newQuantity,
            ...(existingCartLine.salePackage
              ? { salePackageId: existingCartLine.salePackage }
              : {}),
          }),
        ).unwrap();
        requestCartQuantityFocus({
          itemId: existingCartLine.itemId,
          productId: product.id,
          salePackage: salePackageId ?? null,
        });
      } else {
        // Добавляем новый товар
        const res = await dispatch(
          manualFilling({
            id: saleId,
            productId: product.id,
            quantity: qtyToAdd,
            ...(salePackageId ? { salePackageId } : {}),
          }),
        ).unwrap();
        requestCartQuantityFocus({
          productId: product.id,
          salePackage: salePackageId ?? null,
        });
        // Некоторые бэки возвращают не строку корзины, а sale без items.
        // Тогда принудительно обновляем активную продажу, иначе новая позиция не появится в UI.
        const payload = res;
        const hasItemsInResponse =
          Array.isArray(payload?.items) || Array.isArray(payload?.cart?.items);
        const hasCartsInResponse = Array.isArray(payload?.carts) || payload?.sale;
        if (payload && !hasItemsInResponse && !hasCartsInResponse) {
          try {
            await multiCartRef.current?.refreshActiveSale?.();
          } catch (refreshErr: any) {
            console.warn("Не удалось обновить продажу после добавления:", refreshErr);
          }
        }
      }
    } catch (error: any) {
      console.error("Ошибка при добавлении товара в корзину:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при добавлении товара: " +
          (error.message || "Неизвестная ошибка"),
      );
    }
  };

  const addToCart = async (product: any) => {
    return addToCartWithPackage(product, null);
  };

  // Фолбэк сканирования по доп. штрих-кодам вызывает addToCart через ref:
  // сама функция объявлена ниже по файлу.
  useEffect(() => {
    addToCartRef.current = addToCart;
  });

  const handleAmbiguousCashierProductSelect = async (match: any) => {
    const saleId =
      barcodeAmbiguity?.saleId ||
      multiCartRef.current?.getActiveSaleId?.() ||
      getSaleIdFromUrl();
    if (!saleId || !match?.id) return;

    setBarcodeAmbiguityLoading(true);
    try {
      await dispatch(
        manualFilling({
          id: saleId,
          productId: match.id,
          quantity: 1,
        }),
      ).unwrap();
      await dispatch(getSale({ id: saleId })).unwrap();
      setBarcodeAmbiguity(null);
    } catch (error: any) {
      showAlert(
        "error",
        "Ошибка",
        validateResErrors(error, "Не удалось добавить выбранный товар"),
      );
    } finally {
      setBarcodeAmbiguityLoading(false);
    }
  };

  const revertScanPackLine = async (cartItemId: any) => {
    if (!cartItemId) return;
    const saleId = getSelectedSaleId();
    if (!saleId) return;
    const items =
      store.getState().sale?.start?.items ||
      store.getState().sale?.start?.cart?.items ||
      currentSale?.items ||
      currentSale?.cart?.items ||
      [];
    const line = items.find((item: any) => item.id === cartItemId);
    if (!line || line.sale_package) return;

    const currentQty = normalizeQuantity(line.quantity);
    if (currentQty <= 1) {
      await dispatch(
        deleteProductInCart({
          id: saleId,
          productId: cartItemId,
        }),
      );
      return;
    }
    await dispatch(
      updateManualFilling({
        id: saleId,
        productId: cartItemId,
        quantity: normalizeQuantity(currentQty - 1),
      }),
    );
  };

  const handlePieceSaleChoosePack = async (product: any, source: any) => {
    closePieceSaleModal();
    if (source === "scan") return;
    await addToCart(product);
  };

  const handlePieceSaleConfirmPieces = async (product: any, salePackageId: any, qty: any) => {
    const pkg = getDefaultPackage(product);
    if (!pkg || !salePackageId) return;

    const items = currentSale?.items || currentSale?.cart?.items || [];
    const otherConsume = calcTotalConsumeForProduct(items, product.id, products);
    const maxQty = maxPiecesAvailable(
      product.quantity,
      otherConsume,
      pkg,
    );

    if (maxQty > 0 && qty > maxQty) {
      showAlert(
        "warning",
        "Недостаточно товара",
        `Доступно не более ${maxQty} ${pkg.unit || "шт."}`,
      );
      return;
    }

    const modalSource = pieceSaleModal?.source;
    const scanCartItemId = pieceSaleModal?.scanCartItemId;
    closePieceSaleModal();

    if (modalSource === "scan" && scanCartItemId) {
      await revertScanPackLine(scanCartItemId);
    }

    await addToCartWithPackage(product, salePackageId, qty);
  };

  const updateQuantity = async (item: any, delta: any) => {
    const saleId = getCartLineSaleId(item);
    if (!saleId) return;
    if (item?.id != null) {
      debouncedQtyApiByLine.cancel(String(item.id));
      pendingQtyLineInputRef.current.delete(String(item.id));
      cancelPendingDiscountLineInput(item.id);
    }

    try {
      if (!item?.itemId || !item?.productId) return;

      // startSale возвращает items напрямую, а не cart.items
      const items = currentSale?.items || currentSale?.cart?.items || [];
      const existingItem = items.find((el) => el.id === item.itemId);

      if (!existingItem) return;

      const currentQty = normalizeQuantity(existingItem.quantity);
      const newQuantity = normalizeQuantity(Math.max(0, currentQty + delta));

      if (newQuantity === 0) {
        if (!canMarketDeleteCartItem) {
          showAlert(
            "warning",
            "Нет доступа",
            "У вас нет доступа на удаление позиций из корзины",
          );
          return;
        }
        if (!(await ensureDeleteCode())) return;
        // Удаляем товар из корзины
        await dispatch(
          deleteProductInCart({
            id: saleId,
            productId: item.itemId,
          }),
        ).unwrap();
        // Удаляем товар из сохраненного порядка
        cartOrderRef.current = cartOrderRef.current.filter(
          (id) => id !== item.id,
        );
        // Удаляем из локальных значений количества
        setCartQuantities((prev: any) => {
          const newQuantities = { ...prev };
          delete newQuantities[item.id];
          return newQuantities;
        });
        // Обновляем продажу после успешного удаления
        // await refreshSale();
      } else {
        // Обновляем количество
        await dispatch(
          updateManualFilling({
            id: saleId,
            productId: item.itemId,
            quantity: newQuantity,
            ...(item.salePackage ? { salePackageId: item.salePackage } : {}),
          }),
        ).unwrap();
        // Обновляем локальное значение количества
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: String(newQuantity),
        }));
        // Обновляем продажу после успешного обновления
        // await refreshSale();
      }
    } catch (error: any) {
      console.error("Ошибка при обновлении количества:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при обновлении количества: " +
          (error.message || "Неизтвестная ошибка"),
      );
    }
  };

  const removeFromCart = useCallback(async (item: any) => {
    const saleId = getCartLineSaleId(item);
    if (!saleId) return;

    cancelDebouncedQtyApiByLine(String(item.id));
    pendingQtyLineInputRef.current.delete(String(item.id));
    cancelPendingDiscountLineInput(item.id);

    if (!canMarketDeleteCartItem) {
      showAlert(
        "warning",
        "Нет доступа",
        "У вас нет доступа на удаление позиций из корзины",
      );
      return;
    }

    if (!(await ensureDeleteCode())) {
      setCartQuantities((prev: any) => ({
        ...prev,
        [item.id]: formatQuantity(item.quantity || 0),
      }));
      return;
    }

    try {
      if (!item?.itemId) return;
      // Удаляем товар из корзины
      await dispatch(
        deleteProductInCart({
          id: saleId,
          productId: item.itemId,
        }),
      ).unwrap();
      // Удаляем товар из сохраненного порядка
      cartOrderRef.current = cartOrderRef.current.filter(
        (id) => id !== item.id,
      );
      // Удаляем из локальных значений количества, цены и скидки
      setCartQuantities((prev: any) => {
        const newQuantities = { ...prev };
        delete newQuantities[item.id];
        return newQuantities;
      });
      setCartPrices((prev: any) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setCartDiscounts((prev: any) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      // Обновляем продажу после успешного удаления
      // await refreshSale();
    } catch (error: any) {
      console.error("Ошибка при удалении товара:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при удалении товара: " +
          (error.message || "Неизвестная ошибка"),
      );
    }
  }, [
    getCartLineSaleId,
    cancelDebouncedQtyApiByLine,
    cancelPendingDiscountLineInput,
    canMarketDeleteCartItem,
    ensureDeleteCode,
    dispatch,
  ]);

  // Функция для обновления количества напрямую (без дельты)
  const updateQuantityDirect = useCallback(async (item: any, newQuantity: any) => {
    const saleId = getCartLineSaleId(item);
    if (!saleId) return;
    cancelPendingDiscountLineInput(item.id);

    try {
      if (!item?.itemId || !item?.productId) return;
      // Находим товар в списке продуктов для проверки наличия.
      // Товара может не быть на текущей странице каталога (например, после
      // скана) — тогда догружаем его; если не вышло, локальные проверки
      // пропускаем и полагаемся на валидацию сервера, но количество
      // обязательно отправляем (иначе итог молча не пересчитается).
      const product = await resolveCartLineProduct(item.productId);

      const qtyNum = normalizeQuantity(
        Math.max(0, parseFloat(newQuantity) || 0),
      );
      const availableQuantity = product ? parseFloat(product.quantity || 0) : 0;

      // Проверяем наличие (услуги — без ограничения по остатку)
      if (
        product &&
        !isMarketWarehouseServiceProduct(product) &&
        !item.salePackage
      ) {
        if (
          !Number.isFinite(availableQuantity) ||
          availableQuantity <= 0 ||
          qtyNum > availableQuantity
        ) {
          showAlert(
            "warning",
            availableQuantity > 0 ? "Недостаточно товара" : "Товар отсутствует",
            availableQuantity > 0
              ? `Доступно только ${availableQuantity} ${product.unit || "шт"}`
              : "Товар отсутствует в наличии",
          );
          return;
        }
      } else if (
        product &&
        item.salePackage &&
        !isMarketWarehouseServiceProduct(product)
      ) {
        if (!(availableQuantity > 0)) {
          showAlert(
            "warning",
            "Товар отсутствует",
            "Товар отсутствует в наличии",
          );
          return;
        }
        const items = currentSale?.items || currentSale?.cart?.items || [];
        const currentItem = items.find((el) => el.id === item.itemId);
        const currentQty = normalizeQuantity(currentItem?.quantity || 0);
        const qip = Number(
          product?.packages?.find((p: any) => p.id === item.salePackage)
            ?.quantity_in_package,
        );
        if (!(qip > 0)) {
          showAlert(
            "error",
            "Ошибка упаковки",
            "Для поштучной продажи не найдена корректная упаковка товара",
          );
          return;
        }
        // Передаём именно resolved-товар: его может не быть в products
        // (текущая страница каталога), а без packages расход считается неверно.
        const totalConsume = calcTotalConsumeForProduct(items, item.productId, [
          product,
        ]);
        const newTotalConsume = totalConsume - currentQty / qip + qtyNum / qip;
        if (newTotalConsume > availableQuantity) {
          showAlert(
            "warning",
            "Недостаточно товара",
            `Доступно только ${availableQuantity} ${product.unit || "шт"}`,
          );
          return;
        }
      }

      if (qtyNum === 0) {
        if (!canMarketDeleteCartItem) {
          showAlert(
            "warning",
            "Нет доступа",
            "У вас нет доступа на удаление позиций из корзины",
          );
          setCartQuantities((prev: any) => ({
            ...prev,
            [item.id]: formatQuantity(item.quantity || 0),
          }));
          return;
        }
        await removeFromCart(item);
      } else {
        // Обновляем количество
        await dispatch(
          updateManualFilling({
            id: saleId,
            productId: item.itemId,
            quantity: qtyNum,
            ...(item.salePackage ? { salePackageId: item.salePackage } : {}),
          }),
        );
        // Обновляем локальное значение количества
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: String(qtyNum),
        }));
        // Обновляем продажу после успешного обновления
        await refreshSale();
      }
    } catch (error: any) {
      console.error("Ошибка при обновлении количества:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при обновлении количества: " +
          (error.message || "Неизвестная ошибка"),
      );
    }
  }, [
    getCartLineSaleId,
    cancelPendingDiscountLineInput,
    resolveCartLineProduct,
    currentSale?.items,
    currentSale?.cart?.items,
    canMarketDeleteCartItem,
    removeFromCart,
    dispatch,
    refreshSale,
  ]);

  const flushPendingQuantityLine = useCallback(
    async (lineId: any) => {
      const idKey = String(lineId);
      const pendingRaw = pendingQtyLineInputRef.current.get(idKey);
      if (pendingRaw === undefined) return;
      if (!shouldSyncQuantityToApiWhileTyping(pendingRaw)) {
        return;
      }

      const item = cart.find((c: any) => String(c.id) === idKey);
      if (!item) {
        pendingQtyLineInputRef.current.delete(idKey);
        return;
      }

      const qtyNum = normalizeQuantity(
        Math.max(0, parseDecimalInput(pendingRaw) || 0),
      );
      pendingQtyLineInputRef.current.delete(idKey);

      if (qtyNum === normalizeQuantity(item.quantity || 0)) {
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: formatQuantity(item.quantity || 0),
        }));
        return;
      }

      if (item.isCustom) {
        await updateCustomQuantityDirect(item, qtyNum);
      } else {
        await updateQuantityDirect(item, qtyNum);
      }
    },
    [cart, updateCustomQuantityDirect, updateQuantityDirect, shouldSyncQuantityToApiWhileTyping],
  );

  const commitCartLineQuantityInput = useCallback(
    async (item: any, rawInput: any) => {
      if (!item) return;

      const lineKey = String(item.id);
      cancelDebouncedQtyApiByLine(lineKey);
      pendingQtyLineInputRef.current.delete(lineKey);

      let value = String(rawInput ?? "").trim();
      if (value === "" || value === "-") {
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: formatQuantity(item.quantity || 0),
        }));
        qtyInputFocusRef.current = { itemId: null, prevValue: "" };
        return;
      }
      if (value === "." || value === ",") {
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: formatQuantity(item.quantity || 0),
        }));
        qtyInputFocusRef.current = { itemId: null, prevValue: "" };
        return;
      }
      if (/[.,]$/.test(value)) {
        value = value.slice(0, -1);
      }
      const qtyNum = normalizeQuantity(
        Math.max(0, parseDecimalInput(value) || 0),
      );

      if (!item.isCustom && !item.salePackage) {
        const product = products.find((p: any) => p.id === item.productId);
        if (
          product &&
          !isMarketWarehouseServiceProduct(product)
        ) {
          const availableQuantity = parseFloat(product.quantity || 0);
          if (
            !Number.isFinite(availableQuantity) ||
            availableQuantity <= 0 ||
            qtyNum > availableQuantity
          ) {
            showAlert(
              "warning",
              availableQuantity > 0
                ? "Недостаточно товара"
                : "Товар отсутствует",
              availableQuantity > 0
                ? `Доступно только ${availableQuantity} ${product.unit || "шт"}`
                : "Товар отсутствует в наличии",
            );
            setCartQuantities((prev: any) => ({
              ...prev,
              [item.id]: formatQuantity(item.quantity || 0),
            }));
            qtyInputFocusRef.current = { itemId: null, prevValue: "" };
            return;
          }
        }
      }

      if (qtyNum === 0) {
        if (item.isCustom) {
          await removeCustomFromCart(item);
        } else {
          await removeFromCart(item);
        }
      } else if (
        qtyNum !== normalizeQuantity(item.quantity || 0)
      ) {
        if (item.isCustom) {
          await updateCustomQuantityDirect(item, qtyNum);
        } else {
          await updateQuantityDirect(item, qtyNum);
        }
      } else {
        setCartQuantities((prev: any) => ({
          ...prev,
          [item.id]: formatQuantity(item.quantity || 0),
        }));
      }
      qtyInputFocusRef.current = { itemId: null, prevValue: "" };
    },
    [
      products,
      removeCustomFromCart,
      removeFromCart,
      updateCustomQuantityDirect,
      updateQuantityDirect,
      cancelDebouncedQtyApiByLine,
    ],
  );

  const commitFocusedQuantityInput = useCallback(
    async (itemOverride, rawValueOverride) => {
      const active = document.activeElement;
      let item = itemOverride;
      let rawValue = rawValueOverride;

      if (!item) {
        if (!(active instanceof HTMLInputElement)) return;
        if (
          !active.classList.contains("cashier-page__cart-item-quantity-input")
        ) {
          return;
        }
        const lineKey = active.dataset?.cartItemId;
        if (!lineKey) return;
        item = cartRef.current.find((c: any) => String(c.id) === String(lineKey));
        rawValue = rawValue ?? active.value;
      }

      if (!item) return;
      await commitCartLineQuantityInput(item, rawValue);
    },
    [commitCartLineQuantityInput],
  );

  useEffect(() => {
    commitFocusedQuantityInputRef.current = commitFocusedQuantityInput;
  }, [commitFocusedQuantityInput]);

  // PATCH: только unit_price (MARKET_POS_CART — цена и скидка меняются независимо).
  // Без скидки по строке — цена не может быть ниже закупочной; при наличии скидки — можно.
  const patchCartItemPrice = async (item: any, value: any) => {
    const saleId = getCartLineSaleId(item);
    if (!saleId) return;
    cancelPendingDiscountLineInput(item.id);
    if (!canMarketEditPrice) {
      showAlert("warning", "Нет доступа", "У вас нет доступа на изменение цены");
      setCartPrices((prev: any) => ({
        ...prev,
        [item.id]: formatPrice(item.price ?? 0),
      }));
      return;
    }
    const cartItemId = item.itemId;
    const lineKey = String(item.id);
    const num = normalizePrice(parseFloat(value) || 0);
    const hasDiscount = parseFloat(item.discountTotal ?? 0) > 0;
    pendingPricePatchRef.current.add(lineKey);
    setCartPrices((prev: any) => ({ ...prev, [item.id]: formatPrice(num) }));
    setCart((prev: any) =>
      prev.map((c: any) =>
        String(c.id) === lineKey ? { ...c, price: num } : c,
      ),
    );
    if (!item.isCustom && item.productId && !hasDiscount) {
      const product = products.find((p: any) => p.id === item.productId);
      const purchasePrice = product ? parseFloat(product.purchase_price) : NaN;
      if (!isNaN(purchasePrice) && num < purchasePrice) {
        showAlert(
          "warning",
          "Закупочная цена",
          `Цена не может быть ниже закупочной (${formatPrice(purchasePrice)} сом). При необходимости используйте скидку.`,
        );
        setCartPrices((prev: any) => ({
          ...prev,
          [item.id]: formatPrice(item.price ?? 0),
        }));
        setCart((prev: any) =>
          prev.map((c: any) =>
            String(c.id) === lineKey ? { ...c, price: item.price ?? 0 } : c,
          ),
        );
        pendingPricePatchRef.current.delete(lineKey);
        return;
      }
    }
    try {
      await dispatch(
        updateProductInCart({
          id: saleId,
          productId: cartItemId,
          data: { unit_price: String(num.toFixed(2)) },
        }),
      ).unwrap();
      if (cartDiscountModesRef.current[lineKey] === "percent") {
        const lineTotal = num * (item.quantity || 0);
        const discountSom = parseFloat(item.discountTotal ?? 0);
        setCartDiscounts((prev: any) => ({
          ...prev,
          [item.id]: formatDiscountPercentFromLine(discountSom, lineTotal),
        }));
      }
    } catch (err: any) {
      console.error("Ошибка при изменении цены:", err);
      showAlert("error", "Ошибка", err?.message || "Не удалось изменить цену");
      setCartPrices((prev: any) => ({
        ...prev,
        [item.id]: formatPrice(item.price ?? 0),
      }));
      setCart((prev: any) =>
        prev.map((c: any) =>
          String(c.id) === lineKey ? { ...c, price: item.price ?? 0 } : c,
        ),
      );
    } finally {
      pendingPricePatchRef.current.delete(lineKey);
    }
  };

  // PATCH: только discount_total (MARKET_POS_CART — цена и скидка меняются независимо).
  // API хранит line_discount (сумма); в запросе — discount_total. Итог по строке: (unit_price × quantity) - line_discount.
  // Скидка не может превышать сумму строки (итог не уходит в минус).
  const patchCartItemDiscount = async (item: any, value: any, options: any = {}) => {
    const { mode = "amount" } = options;
    let displayValue = options.displayValue;
    const saleId = getCartLineSaleId(item);
    if (!saleId) return;
    if (!canMarketDiscount) {
      showAlert("warning", "Нет доступа", "У вас нет доступа на применение скидки");
      setCartDiscounts((prev: any) => ({
        ...prev,
        [item.id]: formatPrice(item.discountTotal ?? 0),
      }));
      return;
    }
    const cartItemId = item.itemId;
    const lineTotal = (item.price || 0) * (item.quantity || 0);
    let num = Math.max(0, normalizePrice(parseFloat(value) || 0));
    if (num > lineTotal) {
      num = lineTotal;
      showAlert(
        "warning",
        "Скидка",
        `Скидка не может быть больше суммы по строке (${formatPrice(lineTotal)} сом). Установлено ${formatPrice(lineTotal)} сом.`,
      );
    }
    // Ограничение максимальной скидки для сотрудников (настройка кассы).
    if (discountLimitPercent != null && lineTotal > 0) {
      const maxDiscountSom = normalizePrice((lineTotal * discountLimitPercent) / 100);
      if (num > maxDiscountSom) {
        num = maxDiscountSom;
        if (mode === "percent") {
          displayValue = stripTrailingZerosAfterDecimal(discountLimitPercent);
        }
        showAlert(
          "warning",
          "Скидка",
          `Максимальная скидка — ${stripTrailingZerosAfterDecimal(discountLimitPercent)}%. Установлено ${formatPrice(maxDiscountSom)} сом.`,
        );
      }
    }
    const data = { discount_total: String(num.toFixed(2)) };
    const lineKey = String(item.id);
    pendingDiscountPatchRef.current.add(lineKey);
    try {
      await dispatch(
        updateProductInCart({
          id: saleId,
          productId: cartItemId,
          data,
        }),
      ).unwrap();
      setCartDiscounts((prev: any) => {
        // В режиме процентов сохраняем именно введённое значение (проценты),
        // в режиме суммы — форматированную сумму.
        if (mode === "percent" && displayValue !== undefined) {
          return {
            ...prev,
            [item.id]: displayValue,
          };
        }
        return { ...prev, [item.id]: formatPrice(num) };
      });
      setCart((prev: any) =>
        prev.map((c: any) =>
          String(c.id) === String(item.id) ? { ...c, discountTotal: num } : c,
        ),
      );
    } catch (err: any) {
      console.error("Ошибка при изменении скидки:", err);
      showAlert(
        "error",
        "Ошибка",
        err?.message || "Не удалось изменить скидку",
      );
      setCartDiscounts((prev: any) => ({
        ...prev,
        [item.id]: formatPrice(item.discountTotal ?? 0),
      }));
    } finally {
      pendingDiscountPatchRef.current.delete(lineKey);
    }
  };

  /** Синхронизация скидки строки с полем ввода (сом или %). */
  const applyDiscountFromRawInput = async (item: any, v: any) => {
    const mode = cartDiscountModesRef.current[item.id] || "amount";
    const num = parseFloat(v);
    const current = parseFloat(item.discountTotal ?? 0);
    const lineTotal = (item.price || 0) * (item.quantity || 0);

    if (v === "") {
      if (current !== 0) {
        await patchCartItemDiscount(item, 0, { mode, displayValue: "" });
      } else {
        setCartDiscounts((prev: any) => ({ ...prev, [item.id]: "" }));
      }
      return;
    }
    if (isNaN(num) || num < 0) return;

    if (mode === "percent") {
      if (lineTotal <= 0) return;
      let discountSom = (lineTotal * Math.max(0, num)) / 100;
      if (discountSom > lineTotal) discountSom = lineTotal;
      if (discountSom !== current) {
        await patchCartItemDiscount(item, discountSom, {
          mode: "percent",
          displayValue: v,
        });
      }
    } else if (num !== current) {
      await patchCartItemDiscount(item, v);
    }
  };

  const flushPendingDiscountLine = async (lineId: any) => {
    const key = String(lineId);
    const v = pendingDiscountLineRef.current.get(key);
    if (v === undefined) return;
    if (!shouldSyncDecimalFieldWhileTyping(v)) return;
    pendingDiscountLineRef.current.delete(key);
    const line = cartRef.current.find((c: any) => String(c.id) === key);
    if (!line?.itemId || !getCartLineSaleId(line)) return;
    await applyDiscountFromRawInput(line, v);
  };

  addToCartRef.current = addToCart;

  Object.assign(b, {
    addToCartWithPackage, addToCart, handleAmbiguousCashierProductSelect,
    revertScanPackLine, handlePieceSaleChoosePack, handlePieceSaleConfirmPieces,
    updateQuantity, removeFromCart, updateQuantityDirect,
    flushPendingQuantityLine, commitCartLineQuantityInput, commitFocusedQuantityInput,
    patchCartItemPrice, patchCartItemDiscount, applyDiscountFromRawInput,
    flushPendingDiscountLine,
  });
  return b;
}
