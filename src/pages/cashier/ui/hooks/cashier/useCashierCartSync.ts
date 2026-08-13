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


export function useCashierCartSync(b: any) {
  const {
    searchParams, setSearchParams, currentPage, searchTerm,
    debouncedSearchTerm, setDebouncedSearchTerm, debounceTimerRef, setCurrentPage,
    dispatch, cartDiscountModes, cartDiscountModesRef, cart, cartRef,
    searchInputRef, setCartQuantities, commitFocusedQuantityInputRef,
    pendingQtyLineInputRef, suppressQtyBlurUpdateRef,
    shifts, cashierId, openShiftState, setOpenShiftState, findOpenShift,
    showShiftPage, openShift, setShowOpenShiftPage,
    currentSale, saleLoading, startSaleLoading, cartOrderRef,
    qtyInputFocusRef, priceInputFocusRef, pendingPricePatchRef, pendingDiscountPatchRef,
    setCartPrices, setCartDiscounts, setCartDiscountModes, setCart,
    pendingQtyFocusRef, qtyFocusGenRef, cartQtyInputRefs, getCartLineSaleId, debouncedQtyApiByLine,
    cancelDebouncedQtyApiByLine, refreshSale,
    cancelPendingDiscountLineInput, canMarketDeleteCartItem, showAlert, ensureDeleteCode,
    refreshSaleFromStore, multiCart, count, setShowPaymentPage, getSelectedSaleId,
    lastSearchInputTime, scanKeysRef, isScanningRef, lastScanTimeRef, barcodeProcessingRef,
    searchClearedAfterScanRef, showMenuModal, showCustomerModal, showPaymentPage,
    showOpenShiftPage, showCloseShiftPage, showDebtModal, showDeletionsLogModal,
    showReceiptsModal, showHotkeyProductsModal, showCustomServiceModal, showDiscountModal,
    deleteCodePrompt, openShiftId, preferredWholesaleMode,
  } = b;

  const commitCartLineQuantityInput = (...args) => b.commitCartLineQuantityInput?.(...args);
  const removeFromCart = async (...args) => b.removeFromCart?.(...args);
  const updateQuantity = async (...args) => b.updateQuantity?.(...args);

  // Обновление URL только при изменении страницы (без поиска)
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    const newSearchString = params.toString();
    const currentSearchString = searchParams.toString();
    // Обновляем URL только если параметры действительно изменились
    if (newSearchString !== currentSearchString) {
      setSearchParams(params, { replace: true });
    }
     
  }, [currentPage]);

  // Debounce для поиска
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Загрузка товаров с пагинацией и поиском
  useEffect(() => {
    const params: any = {
        page: currentPage,
    };
    if (debouncedSearchTerm && typeof debouncedSearchTerm === "string") {
      const trimmed = debouncedSearchTerm.trim();
      if (trimmed) {
        params.search = trimmed;
      }
    }
    dispatch(fetchProductsAsync(params));
  }, [dispatch, debouncedSearchTerm, currentPage]);

  // При изменении поиска возвращаемся на первую страницу
  useEffect(() => {
    if (debouncedSearchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    cartDiscountModesRef.current = cartDiscountModes;
  }, [cartDiscountModes]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useCashierQtyScanGuard({
    searchInputRef,
    cartRef,
    setCartQuantities,
    commitQuantityRef: commitFocusedQuantityInputRef,
    pendingQtyLineInputRef,
    suppressQtyBlurUpdateRef,
  });

  // Инициализация данных при первой загрузке
  useEffect(() => {
    dispatch(fetchClientsAsync(undefined as any));
    dispatch(fetchShiftsAsync(undefined as any));
    dispatch(getCashBoxes(undefined as any));
  }, [dispatch]);

  // Поиск открытой смены при загрузке и обновлении списка смен
  useEffect(() => {
    const foundInLoaded = findOwnOpenShiftInList(shifts, cashierId);

    if (foundInLoaded) {
      setOpenShiftState(foundInLoaded);
    } else if (!openShiftState || !isOwnOpenShift(openShiftState, cashierId)) {
      findOpenShift();
    } else {
      const shiftInLoaded = shifts.find((s) => s.id === openShiftState.id);
      if (shiftInLoaded && shiftInLoaded.status !== "open") {
        setOpenShiftState(null);
      }
    }
     
  }, [shifts, cashierId]);

  // Закрываем экран открытия смены, если смена открыта или пользователь на странице смены
  useEffect(() => {
    if (showShiftPage || openShift) {
      setShowOpenShiftPage(false);
    }
  }, [shifts, openShift, showShiftPage]);

  // Продажа создается только при добавлении товара в корзину, а не автоматически при загрузке страницы

  // Синхронизируем локальную корзину с данными из API, сохраняя порядок
  useEffect(() => {
    if (currentSale) {
      const rawItems = currentSale.items ?? currentSale.cart?.items;
      // Ответ /start/ может прийти без items — не сбрасываем корзину
      if (!Array.isArray(rawItems)) return;

      const isSaleRefreshing = saleLoading || startSaleLoading;
      const items = rawItems;

      if (items.length > 0) {
        // MARKET_POS_CART: unit_price — базовая цена, line_discount — скидка на строку (сумма).
        // line_total = (unit_price × quantity) - line_discount
        const apiCart = items.map((item) => {
          const qty = normalizeQuantity(parseFloat(item.quantity || 0));
          const price = normalizePrice(
            parseFloat(item.unit_price || item.price || 0),
          );
          const discountTotal = normalizePrice(
            parseFloat(item.line_discount || item.discount_total || 0),
          );
          const productId = item.product || item.product_id;
          const cartItemId = item.id;
          const isCustom = !productId;
          const salePackage = item.sale_package ?? item.sale_package_id ?? null;
          // Для обычных товаров ключ строим по itemId, чтобы не конфликтовали
          // строки одного и того же товара с разными sale_package.
          const localId = isCustom
            ? `custom-${cartItemId}`
            : `item-${cartItemId}`;
          return {
            id: localId, // ключ в UI (productId или custom-<cartItemId>)
            saleId: currentSale.id,
            itemId: cartItemId, // ID элемента в корзине (для API: DELETE/PATCH /items/<itemId>/)
            productId: productId ?? null, // ID товара (если это товар)
            isCustom: isCustom,
            isWeight: Boolean(item.is_weight),
            salePackage,
            name: item.product_name || item.display_name || item.name || "—",
            price: price,
            quantity: qty,
            discountTotal,
            unit: item.unit || "шт",
            promotionRules: Array.isArray(item.promotion_rules)
              ? item.promotion_rules
              : [],
            image:
              item.primary_image_url ||
              (item.images && item.images[0]?.image_url) ||
              null,
          };
        });

        // Сохраняем порядок элементов: используем сохраненный порядок
        // Убираем дубликаты по itemId (уникальный ID элемента в корзине)
        const seenItemIds = new Set();
        const uniqueApiCart = apiCart.filter((item) => {
          if (item.itemId && seenItemIds.has(item.itemId)) {
            return false; // Пропускаем дубликаты по itemId
          }
          if (item.itemId) {
            seenItemIds.add(item.itemId);
          }
          return true;
        });

        const orderedCart: any[] = [];
        const processedProductIds = new Set();

        // Если у нас есть сохраненный порядок, используем его
        if (cartOrderRef.current.length > 0) {
          // Сначала добавляем элементы в сохраненном порядке
          cartOrderRef.current.forEach((savedProductId) => {
            const item = uniqueApiCart.find(
              (cartItem) => cartItem.id === savedProductId,
            );
            if (item && !processedProductIds.has(item.id)) {
              orderedCart.push(item);
              processedProductIds.add(item.id);
            }
          });
        }

        // Затем добавляем новые элементы, которых нет в сохраненном порядке
        uniqueApiCart.forEach((item) => {
          if (!processedProductIds.has(item.id)) {
            orderedCart.push(item);
            processedProductIds.add(item.id);
          }
        });

        // Обновляем сохраненный порядок
        cartOrderRef.current = orderedCart.map((item) => item.id);

        // Обновляем локальные значения количества, цены и скидки
        const newQuantities = {};
        const newPrices = {};
        orderedCart.forEach((item) => {
          const lineKey = String(item.id);
          const isQtyFocused =
            String(qtyInputFocusRef.current.itemId) === lineKey;
          const hasPendingQty = pendingQtyLineInputRef.current.has(lineKey);
          if (!isQtyFocused && !hasPendingQty) {
            newQuantities[item.id] = formatQuantity(item.quantity || 0);
          }
          const isPriceFocused =
            String(priceInputFocusRef.current.itemId) === lineKey;
          const hasPendingPrice = pendingPricePatchRef.current.has(lineKey);
          if (!isPriceFocused && !hasPendingPrice) {
            newPrices[item.id] = formatPrice(item.price ?? 0);
          }
        });
        setCartQuantities((prev) => mergeChangedMap(prev, newQuantities));
        setCartPrices((prev) => mergeChangedMap(prev, newPrices));
        // Скидки: в сомах не затираем введённое; в % после смены кол-ва/цены пересчитываем из API (discount_total / строка).
        setCartDiscounts((prev) => {
          const next = { ...prev };
          const modes = cartDiscountModesRef.current || {};
          let changed = false;
          orderedCart.forEach((item) => {
            const lineKey = String(item.id);
            if (pendingDiscountPatchRef.current.has(lineKey)) return;
            const mode = modes[item.id] || "amount";
            const lineTotal = (item.price || 0) * (item.quantity || 0);
            if (mode === "percent") {
              const value = formatDiscountPercentFromLine(
                item.discountTotal ?? 0,
                lineTotal,
              );
              if (next[item.id] !== value) {
                next[item.id] = value;
                changed = true;
              }
            } else if (next[item.id] === undefined) {
              next[item.id] = formatPrice(item.discountTotal ?? 0);
              changed = true;
            }
          });
          return changed ? next : prev;
        });

        // Режим скидки по умолчанию — в сомах
        setCartDiscountModes((prev) => {
          const next = { ...prev };
          let changed = false;
          orderedCart.forEach((item) => {
            if (!next[item.id]) {
              next[item.id] = "amount";
              changed = true;
            }
          });
          return changed ? next : prev;
        });

        setCart((prev: any) => {
          const prevById = new Map(prev.map((item: any) => [item.id, item]));
          let changed = prev.length !== orderedCart.length;
          const next = orderedCart.map((item: any) => {
            const prevItem: any = prevById.get(item.id);
            const preservedSalePackage =
              prevItem?.salePackage &&
              (item.salePackage == null || item.salePackage === "")
                ? prevItem.salePackage
                : item.salePackage;
            const resolvedItem =
              preservedSalePackage !== item.salePackage
                ? { ...item, salePackage: preservedSalePackage }
                : item;
            if (isSameCartLine(prevItem as any, resolvedItem as any)) {
              return prevItem;
            }
            changed = true;
            return resolvedItem;
          });
          return changed ? next : prev;
        });
      } else if (!isSaleRefreshing) {
        setCart([]);
        cartOrderRef.current = [];
      }
    }
  }, [currentSale, saleLoading, startSaleLoading]);

  useEffect(() => {
    const pending = pendingQtyFocusRef.current;
    if (!pending || !cart.length) return;

    const targetItem =
      cart.find((item) => pending.itemId && String(item.itemId) === String(pending.itemId)) ||
      cart.find(
        (item) =>
          pending.productId &&
          String(item.productId) === String(pending.productId) &&
          String(item.salePackage ?? "") === String(pending.salePackage ?? ""),
      );

    if (!targetItem?.id) return;

    const input = cartQtyInputRefs.current.get(String(targetItem.id));
    if (!input) return;

    const gen = pending.gen;
    pendingQtyFocusRef.current = null;
    requestAnimationFrame(() => {
      if (qtyFocusGenRef?.current !== gen) return;
      input.focus();
      input.select();
    });
  }, [cart]);

  const updateCustomQuantityByDelta = async (cartItem, delta) => {
    const saleId = getCartLineSaleId(cartItem);
    if (!saleId) return;
    if (!cartItem?.itemId) return;

    debouncedQtyApiByLine.cancel(String(cartItem.id));
    pendingQtyLineInputRef.current.delete(String(cartItem.id));
    cancelPendingDiscountLineInput(cartItem.id);

    try {
      const currentQty = normalizeQuantity(cartItem.quantity);
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
        await dispatch(
          deleteProductInCart({
            id: saleId,
            productId: cartItem.itemId,
          }),
        );
        cartOrderRef.current = cartOrderRef.current.filter(
          (id) => id !== cartItem.id,
        );
        setCartQuantities((prev) => {
          const q = { ...prev };
          delete q[cartItem.id];
          return q;
        });
        setCartPrices((prev) => {
          const next = { ...prev };
          delete next[cartItem.id];
          return next;
        });
        setCartDiscounts((prev) => {
          const next = { ...prev };
          delete next[cartItem.id];
          return next;
        });
      } else {
        await dispatch(
          updateManualFilling({
            id: saleId,
            productId: cartItem.itemId,
            quantity: newQuantity,
          }),
        );
        setCartQuantities((prev) => ({
          ...prev,
          [cartItem.id]: String(newQuantity),
        }));
      }
    } catch (error: any) {
      console.error("Ошибка при обновлении количества доп. услуги:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при обновлении количества: " +
          (error.message || "Неизвестная ошибка"),
      );
    }
  };

  const removeCustomFromCart = useCallback(async (cartItem) => {
    const saleId = getCartLineSaleId(cartItem);
    if (!saleId) return;
    if (!cartItem?.itemId) return;

    cancelDebouncedQtyApiByLine(String(cartItem.id));
    pendingQtyLineInputRef.current.delete(String(cartItem.id));
    cancelPendingDiscountLineInput(cartItem.id);

    if (!canMarketDeleteCartItem) {
      showAlert(
        "warning",
        "Нет доступа",
        "У вас нет доступа на удаление позиций из корзины",
      );
      return;
    }

    if (!(await ensureDeleteCode())) {
      setCartQuantities((prev) => ({
        ...prev,
        [cartItem.id]: formatQuantity(cartItem.quantity || 0),
      }));
      return;
    }

    try {
      await dispatch(
        deleteProductInCart({
          id: saleId,
          productId: cartItem.itemId,
        }),
      );
      cartOrderRef.current = cartOrderRef.current.filter(
        (id) => id !== cartItem.id,
      );
      setCartPrices((prev) => {
        const next = { ...prev };
        delete next[cartItem.id];
        return next;
      });
      setCartDiscounts((prev) => {
        const next = { ...prev };
        delete next[cartItem.id];
        return next;
      });
      setCartQuantities((prev) => {
        const q = { ...prev };
        delete q[cartItem.id];
        return q;
      });
    } catch (error: any) {
      console.error("Ошибка при удалении доп. услуги:", error);
      showAlert(
        "error",
        "Ошибка",
        "Ошибка при удалении: " + (error.message || "Неизвестная ошибка"),
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

  const updateCustomQuantityDirect = useCallback(async (cartItem, newQuantity) => {
    const saleId = getCartLineSaleId(cartItem);
    if (!saleId) return;
    if (!cartItem?.itemId) return;
    cancelPendingDiscountLineInput(cartItem.id);

    try {
      const qtyNum = normalizeQuantity(
        Math.max(0, parseFloat(newQuantity) || 0),
      );

      if (qtyNum === 0) {
        if (!canMarketDeleteCartItem) {
          showAlert(
            "warning",
            "Нет доступа",
            "У вас нет доступа на удаление позиций из корзины",
          );
          setCartQuantities((prev) => ({
            ...prev,
            [cartItem.id]: formatQuantity(cartItem.quantity || 0),
          }));
          return;
        }
        await removeCustomFromCart(cartItem);
        return;
      }

      await dispatch(
        updateManualFilling({
          id: saleId,
          productId: cartItem.itemId,
          quantity: qtyNum,
        }),
      );
      setCartQuantities((prev) => ({
        ...prev,
        [cartItem.id]: String(qtyNum),
      }));
      await refreshSale();
    } catch (error: any) {
      console.error("Ошибка при обновлении количества доп. услуги:", error);
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
    canMarketDeleteCartItem,
    removeCustomFromCart,
    dispatch,
    refreshSale,
  ]);

  // Расчет пагинации
  // Используем фиксированный размер страницы
  // Если есть next или previous, значит есть еще страницы
  const PAGE_SIZE = 100; // Размер страницы для API
  // Если есть следующая страница, значит текущая не последняя
  // Если есть предыдущая страница, значит текущая не первая
  // Рассчитываем общее количество страниц на основе count и размера страницы
  const totalPages = count && PAGE_SIZE ? Math.ceil(count / PAGE_SIZE) : 1;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (totalPages && newPage > totalPages)) return;
    setCurrentPage(newPage);
  };

  // Объявляем handleCheckout до его использования в useEffect
  const handleCheckout = useCallback(() => {
    if (cart.length === 0 || !getSelectedSaleId()) return;
    setShowPaymentPage(true);
  }, [cart.length, getSelectedSaleId]);

  // Обновляем время последнего ввода в поле поиска при каждом изменении (для защиты от открытия страницы оплаты при сканировании)
  // Это делается в onChange поля поиска, но оставляем useEffect как дополнительную защиту
  useEffect(() => {
    if (searchTerm) {
      lastSearchInputTime.current = Date.now();
    }
  }, [searchTerm]);

  // Глобальный обработчик Enter для открытия страницы оплаты (с защитой от сканера)
  useEffect(() => {
    const handleGlobalEnter = (e) => {
      const now = Date.now();
      const target = e.target;

      // Проверяем, что фокус находится в поле поиска
      const isSearchInputFocused =
        target === searchInputRef.current ||
        target?.className?.includes("cashier-page__search-input");

      // Детекция сканера по скорости набора символов
      // Сканер работает ТОЛЬКО в поле поиска, поэтому учитываем это
      const isChar = e.key.length === 1 && /^[0-9A-Za-z]$/.test(e.key);

      if (isChar && isSearchInputFocused) {
        // Сканер: символы вводятся в поле поиска очень быстро
        const dt = now - scanKeysRef.current.lastTime;
        scanKeysRef.current.count = dt < 50 ? scanKeysRef.current.count + 1 : 1;
        scanKeysRef.current.lastTime = now;

        if (scanKeysRef.current.count >= 6) {
          isScanningRef.current = true;
          lastScanTimeRef.current = now;
        }
      } else if (isChar && !isSearchInputFocused) {
        // Ручной ввод вне поля поиска - сбрасываем счетчик
        scanKeysRef.current.count = 0;
      } else if (!isChar && !isSearchInputFocused) {
        // Любой другой символ вне поля поиска - сбрасываем счетчик
        scanKeysRef.current.count = 0;
      }

      // Enter сразу после быстрой последовательности В ПОЛЕ ПОИСКА — это почти наверняка Enter сканера
      if (
        e.key === "Enter" &&
        scanKeysRef.current.count >= 6 &&
        isSearchInputFocused
      ) {
        lastScanTimeRef.current = now;
        isScanningRef.current = true;
        scanKeysRef.current.count = 0;

        setTimeout(() => {
          isScanningRef.current = false;
        }, 3000);

        return; // НЕ открываем оплату
      }

      // Пропускаем, если нажатие было в поле ввода или textarea
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Если это поле поиска, не обрабатываем здесь (обрабатывается в onKeyDown)
        if (target.className?.includes("cashier-page__search-input")) {
          return;
        }
        // Если это поле количества, не обрабатываем здесь
        if (
          target.className?.includes("cashier-page__cart-item-quantity-input")
        ) {
          return;
        }
        return;
      }

      // Пропускаем, если открыты модальные окна или экраны
      if (
        showMenuModal ||
        showCustomerModal ||
        showPaymentPage ||
        showShiftPage ||
        showOpenShiftPage ||
        showCloseShiftPage ||
        showDebtModal ||
        showDeletionsLogModal ||
        showReceiptsModal ||
        showHotkeyProductsModal ||
        showCustomServiceModal ||
        showDiscountModal ||
        deleteCodePrompt
      ) {
        return;
      }

      // НОВАЯ НАДЕЖНАЯ ЛОГИКА: НЕ открываем страницу, если было недавнее сканирование
      const timeSinceLastScan = Date.now() - lastScanTimeRef.current;
      const timeSinceLastInput = Date.now() - lastSearchInputTime.current;

      // ПРИОРИТЕТ 1: Если идет обработка сканирования, НЕ открываем страницу
      if (barcodeProcessingRef.current) {
        return;
      }

      // ПРИОРИТЕТ 2: Если флаг сканирования установлен, НЕ открываем страницу
      // Это работает даже если обработка уже завершена, но Enter от сканера еще не обработан
      if (isScanningRef.current) {
        // Обновляем время при каждом Enter во время сканирования
        if (e.key === "Enter") {
          lastScanTimeRef.current = Date.now();
        }
        return;
      }

      // ПРИОРИТЕТ 3: Если было недавнее сканирование (в течение 2000мс), НЕ открываем страницу
      // Уменьшили время с 5000мс до 2000мс, чтобы не блокировать обычный Enter слишком долго
      if (timeSinceLastScan < 2000 && isScanningRef.current) {
        // Если Enter приходит очень быстро после последнего сканирования (в течение 500мс),
        // это точно Enter от сканера - обновляем время и не открываем страницу
        if (e.key === "Enter" && timeSinceLastScan < 500) {
          lastScanTimeRef.current = Date.now();
          isScanningRef.current = true; // Устанавливаем флаг на случай повторного Enter
          // Сбрасываем флаг через 2 секунды
          setTimeout(() => {
            isScanningRef.current = false;
          }, 2000);
          return;
        }

        // Если поле поиска было очищено после сканирования, это точно сканер
        if (searchClearedAfterScanRef.current && e.key === "Enter") {
          lastScanTimeRef.current = Date.now();
          isScanningRef.current = true;
          setTimeout(() => {
            isScanningRef.current = false;
            searchClearedAfterScanRef.current = false;
          }, 2000);
          return;
        }

        // Если флаг сканирования установлен и Enter приходит в течение 2 секунд после сканирования
        // это может быть Enter от сканера - не открываем страницу
        if (e.key === "Enter" && timeSinceLastScan < 2000) {
          // Но только если счетчик сканера был высоким (>= 6), иначе это может быть обычный Enter
          // Сбрасываем флаг через 2 секунды
          setTimeout(() => {
            isScanningRef.current = false;
          }, 2000);
          return;
        }
      }

      // Если флаг сканирования установлен, но прошло больше 2 секунд - сбрасываем его
      if (isScanningRef.current && timeSinceLastScan >= 2000) {
        isScanningRef.current = false;
        scanKeysRef.current.count = 0;
      }

      // ПРИОРИТЕТ 4: Если был недавний ввод в поле поиска (не сканирование), не открываем страницу
      if (isSearchInputFocused && timeSinceLastInput < 1000) {
        // Сбрасываем счетчик, так как это не сканер
        if (e.key === "Enter") {
          scanKeysRef.current.count = 0;
        }
        return; // Не открываем страницу оплаты, если недавно был ручной ввод в поле поиска
      }

      // Если корзина не пуста, открываем страницу оплаты
      if (cart.length > 0 && getSelectedSaleId() && e.key === "Enter") {
        // Сбрасываем счетчик, так как это обычный Enter (не от сканера)
        scanKeysRef.current.count = 0;
        e.preventDefault();
        handleCheckout();
      } else if (e.key === "Enter") {
        // Сбрасываем счетчик для любого другого Enter, который не открывает оплату
        scanKeysRef.current.count = 0;
      }
    };

    window.addEventListener("keydown", handleGlobalEnter);
    return () => {
      window.removeEventListener("keydown", handleGlobalEnter);
    };
  }, [
    cart.length,
    getSelectedSaleId,
    handleCheckout,
    showMenuModal,
    showCustomerModal,
    showPaymentPage,
    showShiftPage,
    showOpenShiftPage,
    showCloseShiftPage,
    showDebtModal,
    showDeletionsLogModal,
    showReceiptsModal,
    showHotkeyProductsModal,
    showCustomServiceModal,
    showDiscountModal,
    deleteCodePrompt,
  ]);

  useEffect(() => {
    if (!openShiftId) return;
    const saleId = getSelectedSaleId();
    dispatch(
      startSale({
        ...(saleId ? { sale_id: saleId } : {}),
        discount_total: 0,
        shift: openShiftId,
        is_wholesale: Boolean(preferredWholesaleMode),
      }),
    );
  }, [dispatch, getSelectedSaleId, openShiftId, preferredWholesaleMode]);

  Object.assign(b, {
    updateCustomQuantityByDelta, removeCustomFromCart, updateCustomQuantityDirect,
    PAGE_SIZE, totalPages, handlePageChange, handleCheckout,
  });
  return b;
}
