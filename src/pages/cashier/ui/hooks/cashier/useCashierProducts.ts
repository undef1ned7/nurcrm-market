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


export function useCashierProducts(b: any) {
  const {
    dispatch, openShiftId, openShiftIdRef, ensureActiveSaleId, refreshSaleFromStore,
    preferredWholesaleMode, preferredWholesaleModeRef, canMarketDiscount, discountLimitPercent,
    pageFromUrl, getSelectedSaleId, multiCartRef, products,
    currentSale, deleteCodePrompt,
  } = b;

  // Forwarders for handlers defined later in useCashierCart
  const addToCart = async (...args) => b.addToCart?.(...args);
  const addToCartWithPackage = async (...args) => b.addToCartWithPackage?.(...args);
  const handleAmbiguousCashierProductSelect = async (...args) =>
    b.handleAmbiguousCashierProductSelect?.(...args);
  const revertScanPackLine = async (...args) => b.revertScanPackLine?.(...args);
  const updateQuantityDirect = async (...args) => b.updateQuantityDirect?.(...args);
  const commitCartLineQuantityInput = (...args) => b.commitCartLineQuantityInput?.(...args);

  // Filled by useCashierBarcode
  const barcodeProcessingRef = {
    get current() { return b.barcodeProcessingRef?.current ?? false; },
    set current(v) { if (b.barcodeProcessingRef) b.barcodeProcessingRef.current = v; },
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(pageFromUrl || 1);
  const debounceTimerRef = React.useRef<any>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartRef = useRef<CartLine[]>([]);
  const cartOrderRef = React.useRef<(string | number)[]>([]);
  const [cartQuantities, setCartQuantities] = useState<Record<string, string>>({});
  const [cartPrices, setCartPrices] = useState<Record<string, string>>({});
  const [cartDiscounts, setCartDiscounts] = useState<Record<string, string>>({});
  const [cartDiscountModes, setCartDiscountModes] = useState<
    Record<string, CartDiscountMode>
  >({});
  const cartDiscountModesRef = useRef<any>({});
  const lastSearchInputTime = React.useRef(0); // Время последнего ввода в поле поиска (для защиты от открытия страницы оплаты при сканировании)
  const searchInputRef = React.useRef<any>(null); // Ref для поля поиска
  const lastScanTimeRef = React.useRef(0); // Время последнего сканирования (как в SellMainStart.jsx)
  const isScanningRef = React.useRef(false); // Флаг, указывающий что идет или недавно было сканирование
  const lastScannedBarcodeRef = React.useRef(""); // Последний отсканированный штрих-код
  const searchClearedAfterScanRef = React.useRef(false); // Флаг, что поле поиска было очищено после сканирования
  const productsGridRef = React.useRef<any>(null);
  const scanKeysRef = React.useRef({ count: 0, lastTime: 0 }); // Отслеживание быстрого набора символов для детекции сканера
  const qtyInputFocusRef = React.useRef({ itemId: null, prevValue: "" });
  const suppressQtyBlurUpdateRef = React.useRef<any>({});
  const commitFocusedQuantityInputRef = React.useRef<any>(null);
  const cartQtyInputRefs = React.useRef(new Map()); // item.id -> input
  const pendingQtyFocusRef = React.useRef<any>(null); // { itemId?, productId?, salePackage? }
  /** Последнее значение из инпута количества, для которого запланирован debounced API */
  const pendingQtyLineInputRef = React.useRef(new Map());
  const priceInputFocusRef = React.useRef({ itemId: null });
  const pendingPricePatchRef = React.useRef(new Set());
  const pendingDiscountPatchRef = React.useRef(new Set());
  const debouncedQtyApiByLine = useDebounceByKey(500);
  const cancelDebouncedQtyApiByLine = debouncedQtyApiByLine.cancel;
  const debouncedDiscountApiByLine = useDebounceByKey(500);
  const cancelDiscountApiByLine = debouncedDiscountApiByLine.cancel;
  const pendingDiscountLineRef = useRef(new Map());

  const cancelPendingDiscountLineInput = useCallback((lineId) => {
    if (lineId == null) return;
    const k = String(lineId);
    cancelDiscountApiByLine(k);
    pendingDiscountLineRef.current.delete(k);
  }, [cancelDiscountApiByLine]);

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [showShiftPage, setShowShiftPage] = useState(false);
  const [showOpenShiftPage, setShowOpenShiftPage] = useState(false);
  const [showCloseShiftPage, setShowCloseShiftPage] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [showDeletionsLogModal, setShowDeletionsLogModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showHotkeyProductsModal, setShowHotkeyProductsModal] = useState(false);
  const [hotkeyProductsGroup, setHotkeyProductsGroup] = useState("");
  const [hotkeyProducts, setHotkeyProducts] = useState<CashierProduct[]>([]);
  const [hotkeyProductsLoading, setHotkeyProductsLoading] = useState(false);
  const [hotkeyProductsError, setHotkeyProductsError] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountMode, setDiscountMode] = useState("amount"); // "amount" | "percent"
  const [customService, setCustomService] = useState({
    name: "",
    price: "",
    quantity: "1",
  });
  const requestCartQuantityFocus = useCallback((target) => {
    pendingQtyFocusRef.current = target || null;
  }, []);
  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const [pieceSaleModal, setPieceSaleModal] = useState<PieceSaleModalState>(null);
  const [mobileProductsList, setMobileProductsList] = useState(false);
  // Полноэкранный режим корзины: скрываем каталог и шапку, корзина на весь экран
  const [cartFull, setCartFull] = useState(() => {
    try {
      return localStorage.getItem("market_cashier_cart_full") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("market_cashier_cart_full", cartFull ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [cartFull]);
  const [favoriteOverrides, setFavoriteOverrides] = useState<
    Record<string, boolean>
  >({});
  const [favoriteLoadingMap, setFavoriteLoadingMap] = useState<
    Record<string, boolean>
  >({});
  const hotkeyProductsRequestIdRef = React.useRef(0);

  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => window.innerWidth > 768,
  );
  const [desktopProductsWidth, setDesktopProductsWidth] = useState(() => {
    try {
      const raw = Number(localStorage.getItem("market_cashier_products_width_pct"));
      if (Number.isFinite(raw)) return Math.min(80, Math.max(40, raw));
    } catch {
      /* ignore */
    }
    return 64;
  });
  const contentRef = React.useRef<any>(null);
  const isResizingRef = React.useRef(false);
  const cartWidthPercent = 100 - desktopProductsWidth;
  const isCompactCart = isDesktopLayout && cartWidthPercent <= 34;
  // Функция для показа AlertModal
  const showAlert = (type: any, title: any, message: any) => {
    setAlertModal({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, open: false }));
  };

  const getProductFavorite = useCallback(
    (product) => {
      if (!product?.id) return false;
      if (Object.prototype.hasOwnProperty.call(favoriteOverrides, product.id)) {
        return Boolean(favoriteOverrides[product.id]);
      }
      return Boolean(product?.is_favorite);
    },
    [favoriteOverrides],
  );

  const toggleFavorite = async (product, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const productId = product?.id;
    if (!productId || favoriteLoadingMap[productId]) return;

    const current = getProductFavorite(product);
    const next = !current;
    setFavoriteLoadingMap((prev) => ({ ...prev, [productId]: true }));
    setFavoriteOverrides((prev) => ({ ...prev, [productId]: next }));

    try {
      await api.post(`/main/products/${productId}/favorite/`, {
        is_favorite: next,
      });
    } catch (_error) {
      setFavoriteOverrides((prev) => ({ ...prev, [productId]: current }));
      showAlert(
        "error",
        "Ошибка",
        "Не удалось обновить избранное. Попробуйте еще раз.",
      );
    } finally {
      setFavoriteLoadingMap((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleDesktopResizeStart = (e) => {
    if (window.innerWidth <= 768) return;
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onResize = () => setIsDesktopLayout(window.innerWidth > 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizingRef.current || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      if (!rect.width) return;
      const relativeX = e.clientX - rect.left;
      const nextPct = (relativeX / rect.width) * 100;
      setDesktopProductsWidth(Math.min(80, Math.max(40, nextPct)));
    };

    const onUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(
          "market_cashier_products_width_pct",
          String(desktopProductsWidth),
        );
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [desktopProductsWidth]);

  const resolveProductWithPackages = useCallback(
    async (productId, fallbackProduct = null) => {
      const local =
        products.find((item) => item.id === productId) || fallbackProduct;
      if (local && supportsPieceFromPack(local)) return local;
      if (local && Array.isArray(local.packages)) return local;
      try {
        const { data } = await api.get(`/main/products/${productId}/`);
        return data || local;
      } catch {
        return local;
      }
    },
    [products],
  );

  const cartLineProductCacheRef = React.useRef(new Map());

  /**
   * `products` — только текущая страница каталога (PAGE_SIZE), поэтому товара,
   * добавленного сканером, в списке может не быть. Догружаем карточку по id,
   * чтобы проверки остатка не «съедали» изменение количества.
   * Вернёт null, если товар недоступен — тогда остаток валидирует сервер.
   */
  const resolveCartLineProduct = useCallback(
    async (productId) => {
      if (!productId) return null;
      const local = products.find((p) => p.id === productId);
      if (local) return local;
      // Ввод количества летит через debounce — короткий TTL склеивает серию
      // правок в один запрос, но остаток не устаревает надолго.
      const cached = cartLineProductCacheRef.current.get(productId);
      if (cached && Date.now() - cached.at < CART_LINE_PRODUCT_TTL_MS) {
        return cached.product;
      }
      try {
        const { data } = await api.get(`/main/products/${productId}/`);
        const product = data || null;
        cartLineProductCacheRef.current.set(productId, {
          product,
          at: Date.now(),
        });
        return product;
      } catch {
        return null;
      }
    },
    [products],
  );

  const openPieceSaleChoice = useCallback((product, source = "click", extra = {}) => {
    if (!supportsPieceFromPack(product)) return false;
    setPieceSaleModal({
      product,
      step: "choice",
      source,
      ...extra,
    });
    return true;
  }, []);

  const closePieceSaleModal = useCallback(() => {
    setPieceSaleModal(null);
  }, []);

  const handleProductCardClick = async (product, event) => {
    const timeSinceLastScan = Date.now() - lastScanTimeRef.current;

    // Некоторые сканеры отправляют завершающий Enter/клик, из-за чего
    // товар под курсором может случайно добавиться в корзину.
    // Игнорируем такие клики во время сканирования и сразу после него.
    if (
      barcodeProcessingRef.current ||
      isScanningRef.current ||
      timeSinceLastScan < 700
    ) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return;
    }

    if (openPieceSaleChoice(product, "click")) return;
    await addToCart(product);
  };

  const refreshSale = useCallback(async () => {
    if (getSelectedSaleId() && openShiftId) {
      try {
        await multiCartRef.current?.refreshActiveSale?.();
      } catch (error: any) {
        console.error("Ошибка при обновлении продажи:", error);
      }
    }
  }, [getSelectedSaleId, openShiftId]);

  const debouncedDiscount = useDebounce((payload) => {
    const saleId = getSelectedSaleId();
    if (!saleId || !openShiftId) return;
    dispatch(
      startSale({
        ...payload,
        sale_id: saleId,
        shift: openShiftId,
        is_wholesale: Boolean(preferredWholesaleMode),
      }),
    );
  }, 600);

  const handleDiscountChange = (discount, mode = "amount") => {
    let num = Math.max(0, parseFloat(discount) || 0);

    // Ограничение максимальной скидки для сотрудников (настройка кассы).
    if (discountLimitPercent != null) {
      const limitLabel = stripTrailingZerosAfterDecimal(discountLimitPercent);
      if (mode === "percent") {
        if (num > discountLimitPercent) {
          num = discountLimitPercent;
          showAlert(
            "warning",
            "Скидка",
            `Максимальная скидка — ${limitLabel}%. Установлено ${limitLabel}%.`,
          );
        }
      } else {
        const subtotal = parseFloat(currentSale?.subtotal || 0) || 0;
        const maxDiscountSom = normalizePrice(
          (subtotal * discountLimitPercent) / 100,
        );
        if (subtotal > 0 && num > maxDiscountSom) {
          num = maxDiscountSom;
          showAlert(
            "warning",
            "Скидка",
            `Максимальная скидка — ${limitLabel}% (${formatPrice(maxDiscountSom)} сом). Установлено ${formatPrice(maxDiscountSom)} сом.`,
          );
        }
      }
    }

    if (mode === "percent") {
      // В процентах отправляем order_discount_percent
      debouncedDiscount({
        order_discount_percent: num,
      });
    } else {
      // В сомах отправляем order_discount_total
      debouncedDiscount({
        order_discount_total: normalizePrice(num),
      });
    }
  };

  // Функция для добавления доп. услуги
  const handleAddCustomService = async () => {
    try {
      if (!customService.name.trim()) {
        showAlert("error", "Ошибка", "Введите название услуги");
        return;
      }
      if (!customService.price.trim() || Number(customService.price) <= 0) {
        showAlert("error", "Ошибка", "Введите корректную цену услуги");
        return;
      }
      const saleId = getSelectedSaleId() || (await ensureActiveSaleId(openShiftId));
      if (!saleId) {
        showAlert(
          "error",
          "Ошибка",
          "Корзина не инициализирована. Пожалуйста, подождите...",
        );
        return;
      }
      await dispatch(
        addCustomItem({
          id: saleId,
          name: customService.name.trim(),
          price: normalizePrice(customService.price.trim()),
          quantity: normalizeQuantity(Number(customService.quantity) || 1),
        }),
      ).unwrap();
      await refreshSale();
      setCustomService({ name: "", price: "", quantity: "1" });
      setShowCustomServiceModal(false);
      showAlert("success", "Успех", "Дополнительная услуга успешно добавлена!");
    } catch (error: any) {
      console.error("Ошибка при добавлении дополнительной услуги:", error);
      showAlert(
        "error",
        "Ошибка",
        error?.data?.detail ||
          error?.message ||
          "Ошибка при добавлении дополнительной услуги",
      );
    }
  };

  const openHotkeyProductsModal = useCallback(async (group) => {
    const normalizedGroup = normalizeHotkeyGroup(group);
    if (!normalizedGroup) return;

    const requestId = hotkeyProductsRequestIdRef.current + 1;
    hotkeyProductsRequestIdRef.current = requestId;

    setHotkeyProductsGroup(normalizedGroup);
    setShowHotkeyProductsModal(true);
    setHotkeyProducts([]);
    setHotkeyProductsError("");
    setHotkeyProductsLoading(true);

    try {
      const { data } = await api.get("/main/products/list/", {
        params: { group: normalizedGroup },
      });

      if (hotkeyProductsRequestIdRef.current !== requestId) return;
      setHotkeyProducts(normalizeCompactProductsResponse(data));
    } catch (error: any) {
      if (hotkeyProductsRequestIdRef.current !== requestId) return;
      console.error("Ошибка при загрузке hotkey-товаров:", error);
      setHotkeyProducts([]);
      setHotkeyProductsError("Не удалось загрузить товары для выбранной клавиши");
    } finally {
      if (hotkeyProductsRequestIdRef.current === requestId) {
        setHotkeyProductsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleHotkeyGroupKeydown = (event) => {
      const group = normalizeHotkeyGroup(event.key);
      if (!group) return;

      if (
        showPaymentPage ||
        showShiftPage ||
        showOpenShiftPage ||
        showCloseShiftPage ||
        showMenuModal ||
        showCustomerModal ||
        showDebtModal ||
        showDeletionsLogModal ||
        showReceiptsModal ||
        showCustomServiceModal ||
        showDiscountModal ||
        deleteCodePrompt
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void openHotkeyProductsModal(group);
    };

    window.addEventListener("keydown", handleHotkeyGroupKeydown, true);
    return () =>
      window.removeEventListener("keydown", handleHotkeyGroupKeydown, true);
  }, [
    openHotkeyProductsModal,
    showCloseShiftPage,
    showCustomServiceModal,
    showCustomerModal,
    showDebtModal,
    showDeletionsLogModal,
    showReceiptsModal,
    showDiscountModal,
    showMenuModal,
    showOpenShiftPage,
    showPaymentPage,
    showShiftPage,
    deleteCodePrompt,
  ]);

  // Защита кнопок +/- от потока символов сканера.
  // В сами поля цены/скидки/количества на keydown мы НЕ вмешиваемся — это ломало
  // ручное редактирование (стирание, выделение, перезапись, дробные веса).
  // «Утёкшие» в поле символы штрих-кода убираются позже, в onComplete сканера.
  // А кнопки +/- нажимать с клавиатуры кассир не должен: одиночный печатный
  // символ или Enter, пришедшие на сфокусированную кнопку, — это поток сканера,
  // поэтому снимаем фокус, чтобы скан её не «нажимал».
  useEffect(() => {
    const isQtyStepButton = (el) =>
      el instanceof HTMLButtonElement &&
      el.classList.contains("cashier-page__cart-item-btn");

    const handleKeyDownCapture = (event) => {
      const el = event.target;
      if (!isQtyStepButton(el)) return;
      if (event.key === "Enter" || (event.key && event.key.length === 1)) {
        el.blur();
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDownCapture, true);
    return () =>
      window.removeEventListener("keydown", handleKeyDownCapture, true);
  }, []);

  // Автодобавление товара по сканеру штрих-кода
  // Отслеживаем сканирование напрямую для автоматического создания продажи
  Object.assign(b, {
    searchTerm, setSearchTerm, debouncedSearchTerm, setDebouncedSearchTerm,
    currentPage, setCurrentPage, debounceTimerRef,
    cart, setCart, cartRef, cartOrderRef,
    cartQuantities, setCartQuantities, cartPrices, setCartPrices,
    cartDiscounts, setCartDiscounts, cartDiscountModes, setCartDiscountModes,
    cartDiscountModesRef,
    lastSearchInputTime, searchInputRef, lastScanTimeRef, isScanningRef,
    lastScannedBarcodeRef, searchClearedAfterScanRef, productsGridRef, scanKeysRef,
    qtyInputFocusRef, suppressQtyBlurUpdateRef, commitFocusedQuantityInputRef,
    cartQtyInputRefs, pendingQtyFocusRef, pendingQtyLineInputRef,
    priceInputFocusRef, pendingPricePatchRef, pendingDiscountPatchRef,
    debouncedQtyApiByLine, cancelDebouncedQtyApiByLine,
    debouncedDiscountApiByLine, cancelDiscountApiByLine, pendingDiscountLineRef,
    cancelPendingDiscountLineInput,
    showMenuModal, setShowMenuModal, showCustomerModal, setShowCustomerModal,
    showPaymentPage, setShowPaymentPage, showShiftPage, setShowShiftPage,
    showOpenShiftPage, setShowOpenShiftPage, showCloseShiftPage, setShowCloseShiftPage,
    showDebtModal, setShowDebtModal, showReceiptsModal, setShowReceiptsModal,
    showDeletionsLogModal, setShowDeletionsLogModal,
    selectedCustomer, setSelectedCustomer,
    showCustomServiceModal, setShowCustomServiceModal,
    showDiscountModal, setShowDiscountModal,
    showHotkeyProductsModal, setShowHotkeyProductsModal,
    hotkeyProductsGroup, setHotkeyProductsGroup,
    hotkeyProducts, setHotkeyProducts, hotkeyProductsLoading, setHotkeyProductsLoading,
    hotkeyProductsError, setHotkeyProductsError,
    discountValue, setDiscountValue, discountMode, setDiscountMode,
    customService, setCustomService, requestCartQuantityFocus,
    alertModal, setAlertModal, pieceSaleModal, setPieceSaleModal,
    mobileProductsList, setMobileProductsList, cartFull, setCartFull,
    favoriteOverrides, setFavoriteOverrides, favoriteLoadingMap, setFavoriteLoadingMap,
    hotkeyProductsRequestIdRef, isDesktopLayout, setIsDesktopLayout,
    desktopProductsWidth, setDesktopProductsWidth, contentRef, isResizingRef,
    cartWidthPercent, isCompactCart,
    showAlert, closeAlert, getProductFavorite, toggleFavorite, handleDesktopResizeStart,
    resolveProductWithPackages, cartLineProductCacheRef, resolveCartLineProduct,
    openPieceSaleChoice, closePieceSaleModal, handleProductCardClick, refreshSale,
    debouncedDiscount, handleDiscountChange, handleAddCustomService, openHotkeyProductsModal,
  });
  return b;
}
