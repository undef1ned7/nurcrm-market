import React, { useCallback, useState } from "react";
import useScanDetection from "@shared/hooks/useScanDetection";
import { fetchProductsApi } from "@entities/product/api/products";
import { getSale, sendBarCode } from "@entities/sale";
import { fetchShiftsAsync } from "@entities/shift";
import { productMatchesBarcode } from "@shared/lib/tools/productBarcode";
import {
  getBarcodeAmbiguity,
  isBarcodeNotFoundError,
} from "@shared/lib/tools/barcodeAmbiguity";
import {
  getDefaultPackage,
  maxPiecesAvailable,
  supportsPieceFromPack,
} from "@shared/lib/tools/marketPackPieceSale";
import {
  calcTotalConsumeForProduct,
  setNativeInputValue,
  isShiftNotOpenApiError,
} from "../../cashierPage.utils";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";

export function useCashierBarcode(b: any) {
  const {
    products, openShiftIdRef, ensureActiveSaleId, refreshSaleFromStore,
    multiCartRef, openPieceSaleChoice, productsGridRef, searchInputRef,
    lastScanTimeRef, isScanningRef, lastScannedBarcodeRef, searchClearedAfterScanRef,
    setSearchTerm, setDebouncedSearchTerm, showAlert, cartRef, setCartQuantities, requestCartQuantityFocus,
    preferredWholesaleModeRef, dispatch, setCart,
    showCloseShiftPage, showOpenShiftPage, showPaymentPage, showShiftPage,
    showMenuModal, showCustomerModal, showDebtModal, showDeletionsLogModal,
    showReceiptsModal, showHotkeyProductsModal, showCustomServiceModal,
    showDiscountModal, deleteCodePrompt, commitFocusedQuantityInputRef,
    getSaleIdFromUrl, resolveProductWithPackages, findOpenShift,
  } = b;

  const [_scannedBarcode, setScannedBarcode] = useState("");
  const barcodeProcessingRef = React.useRef(false);
  const [barcodeAmbiguity, setBarcodeAmbiguity] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [barcodeAmbiguityLoading, setBarcodeAmbiguityLoading] = useState(false);

  /**
   * Поиск товара по любому его штрих-коду (основной + `alternate_barcodes`).
   * Сначала по загруженной странице каталога, затем через поиск на бэке.
   */
  const findProductByAnyBarcode = useCallback(
    async (barcode: any) => {
      const code = String(barcode || "").trim();
      if (!code) return null;

      const local = products.find((p: any) => productMatchesBarcode(p, code));
      if (local) return local;

      try {
        const data = await fetchProductsApi({
          search: code,
          page: 1,
          page_size: 50,
        });
        const list = Array.isArray(data) ? data : data?.results || [];
        return list.find((p: any) => productMatchesBarcode(p, code)) || null;
      } catch {
        return null;
      }
    },
    [products],
  );

  const addToCartRef = React.useRef<any>(null);

  /**
   * Фолбэк сканирования: POS-эндпоинт ищет товар только по основному
   * штрих-коду, поэтому при «товар не найден» пробуем добавить позицию по
   * дополнительному штрих-коду сами. Возвращает true, если товар добавлен.
   */
  const addProductByAlternateBarcode = useCallback(
    async (barcode: any) => {
      const product = await findProductByAnyBarcode(barcode);
      if (!product) return false;
      if (openPieceSaleChoice(product, "click")) return true;
      await addToCartRef.current?.(product);
      return true;
    },
    [findProductByAnyBarcode, openPieceSaleChoice],
  );

  useScanDetection({
    minLength: 3,
    onComplete: async (barcode: any) => {
      if (!barcode || barcode.length < 3) return;
      if (barcodeProcessingRef.current) return;

      // ВАЖНО: во время под-экранов (закрытие/открытие смены, оплата и т.д.)
      // не обрабатываем "сканирование", иначе быстрый ввод цифр (например сумма)
      // может быть принят за штрих-код и показать "Нет открытой смены".
      if (
        showCloseShiftPage ||
        showOpenShiftPage ||
        showPaymentPage ||
        showShiftPage ||
        showMenuModal ||
        showCustomerModal ||
        showDebtModal ||
        showDeletionsLogModal ||
        showReceiptsModal ||
        showHotkeyProductsModal ||
        showCustomServiceModal ||
        showDiscountModal ||
        deleteCodePrompt ||
        barcodeAmbiguity
      ) {
        return;
      }

      // Валидация штрих-кода: проверяем, что он не содержит служебные символы
      // Сканер не должен отправлять Backspace, Delete и другие служебные клавиши
      const invalidPatterns = [
        "Backspace",
        "Delete",
        "Enter",
        "Tab",
        "Escape",
        "Arrow",
        "Control",
        "Alt",
        "Meta",
        "Shift",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Insert",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
      ];

      // Проверяем наличие служебных символов в штрих-коде
      const hasInvalidPattern = invalidPatterns.some((pattern) =>
        barcode.includes(pattern),
      );

      // Проверяем, что штрих-код содержит только допустимые символы
      // Допустимые: буквы (латиница, кириллица), цифры, дефисы, подчеркивания, точки
      const isValidFormat = /^[a-zA-Zа-яА-ЯёЁ0-9\-_.]+$/.test(barcode);

      if (hasInvalidPattern || !isValidFormat) {
        // Это не валидный штрих-код, игнорируем
        console.warn(
          "Некорректный штрих-код (содержит служебные символы):",
          barcode,
        );
        return;
      }

      // Сканер не должен оставлять код в текстовом поиске или позволять
      // запоздалому search-запросу подменить сетку товаров.
      setSearchTerm("");
      setDebouncedSearchTerm("");

      // Запоминаем время сканирования и устанавливаем флаги
      const scanTime = Date.now();
      lastScanTimeRef.current = scanTime;
      isScanningRef.current = true;
      lastScannedBarcodeRef.current = barcode;
      setScannedBarcode(barcode);

      const shiftId = openShiftIdRef.current;
      if (!shiftId) {
        showAlert(
          "warning",
          "Нет открытой смены",
          "Для работы с кассой необходимо начать смену",
        );
        isScanningRef.current = false;
        return;
      }

      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement
      ) {
        const cls = String(activeEl.className || "");
        const isSearch =
          activeEl === searchInputRef.current ||
          cls.includes("cashier-page__search-input");
        const isQty = cls.includes("cashier-page__cart-item-quantity-input");
        const isPriceOrDiscount = cls.includes(
          "cashier-page__cart-item-price-input",
        );

        if (isQty || isPriceOrDiscount) {
          // Символы штрих-кода «утекли» в сфокусированное поле. Отрезаем хвост со
          // штрих-кодом, чтобы зафиксировать только введённое кассиром значение,
          // и продолжаем обработку скана. Если хвост не совпал (нестандартный
          // штрих-код) — безопасно откатываем поле.
          const raw = activeEl.value;
          const recovered =
            barcode && raw.endsWith(barcode)
              ? raw.slice(0, -barcode.length)
              : "";
          if (isQty) {
            const item = cartRef.current.find(
              (c: any) => String(c.id) === String((activeEl as any).dataset?.cartItemId),
            );
            if (item) {
              await commitFocusedQuantityInputRef.current?.(item, recovered);
            }
          } else {
            // Цена/скидка: возвращаем значение кассира и фиксируем через blur.
            setNativeInputValue(activeEl as any, recovered);
          }
          activeEl.blur();
          searchInputRef.current?.focus();
        } else if (!isSearch) {
          return;
        }
      }

      barcodeProcessingRef.current = true;
      let targetSaleIdForScan = null;

      try {
        const productsScrollTop = productsGridRef.current?.scrollTop ?? 0;
        const scanSaleId =
          multiCartRef.current?.getActiveSaleId?.() || getSaleIdFromUrl() || null;
        const saleId = scanSaleId || (await ensureActiveSaleId(shiftId));
        targetSaleIdForScan = saleId;

        if (!saleId) {
          showAlert("error", "Ошибка", "Не удалось создать продажу");
          barcodeProcessingRef.current = false;
          return;
        }

        const res = await dispatch(
          sendBarCode({
            barcode,
            id: saleId,
            sale_id: scanSaleId,
          }),
        ).unwrap();
        if (res?.error) {
          const msg =
            typeof res.error === "string"
              ? res.error
              : "Товар с таким штрих-кодом не найден";
          // Возможно, отсканирован дополнительный штрих-код — пробуем сами.
          if (
            isBarcodeNotFoundError({ message: msg }) &&
            (await addProductByAlternateBarcode(barcode))
          ) {
            lastScanTimeRef.current = Date.now();
            return;
          }
          showAlert("error", "Ошибка сканирования", msg);
          return;
        }

        const scanItems = res?.items ?? res?.cart?.items;
        const scanReturnedSale =
          Array.isArray(scanItems) || Array.isArray(res?.carts) || Boolean(res?.sale);
        if (!scanReturnedSale) {
          await dispatch(getSale({ id: saleId })).unwrap();
        }
        if (Array.isArray(scanItems) && scanItems.length > 0) {
          for (let i = scanItems.length - 1; i >= 0; i--) {
            const it = scanItems[i];
            const pid = it.product ?? it.product_id;
            const p = products.find((x: any) => x.id === pid);
            const matchesScan =
              (p && productMatchesBarcode(p, barcode)) ||
              (!p && pid && !it.sale_package);
            if (matchesScan) {
              requestCartQuantityFocus({
                itemId: it.id,
                productId: pid,
                salePackage: it.sale_package ?? null,
              });
              if (!it.sale_package) {
                const resolved = await resolveProductWithPackages(pid, p);
                if (supportsPieceFromPack(resolved)) {
                  const totalConsume = calcTotalConsumeForProduct(
                    scanItems,
                    pid,
                    products,
                  );
                  const pkg = getDefaultPackage(resolved);
                  const otherConsume = Math.max(0, totalConsume - 1);
                  openPieceSaleChoice(resolved, "scan", {
                    scanCartItemId: it.id,
                    maxQuantity: pkg
                      ? maxPiecesAvailable(
                          resolved.quantity,
                          otherConsume,
                          pkg,
                        )
                      : null,
                  });
                }
              }
              break;
            }
          }
        }
        // Если scan уже вернул sale/cart, reducer обновит UI одним проходом.
        // Дополнительный /start/ делаем только как fallback, чтобы не дергать
        // весь список выбранных товаров при каждом скане.
        if (!scanReturnedSale) {
          try {
            await refreshSaleFromStore(shiftId, saleId);
          } catch (e: any) {
            const msg = String(e?.message || e || "");
            if (!msg.includes("condition callback returning false")) {
              throw e;
            }
          }
        }
        requestAnimationFrame(() => {
          if (productsGridRef.current) {
            productsGridRef.current.scrollTop = productsScrollTop;
          }
        });
        // Обновляем время последнего сканирования после успешного добавления
        // Это защитит от открытия страницы оплаты при Enter от сканера
        lastScanTimeRef.current = Date.now();
        // Убеждаемся, что флаг сканирования установлен
        isScanningRef.current = true;
      } catch (error: any) {
        console.error("Ошибка при сканировании:", error);
        const ambiguity = getBarcodeAmbiguity(error);
        if (ambiguity) {
          setBarcodeAmbiguity({
            ...ambiguity,
            barcode,
            saleId: targetSaleIdForScan,
          });
          return;
        }
        const message = validateResErrors(
          error,
          "Не удалось добавить товар по штрих-коду",
        );
        // Сервер ищет только по основному штрих-коду: если товар «не найден»,
        // пробуем добавить его по дополнительному (alternate_barcodes).
        if (
          isBarcodeNotFoundError(error) &&
          (await addProductByAlternateBarcode(barcode))
        ) {
          lastScanTimeRef.current = Date.now();
          return;
        }
        if (isShiftNotOpenApiError(error)) {
          await findOpenShift();
          dispatch(fetchShiftsAsync(undefined as any));
          showAlert(
            "warning",
            "Смена недоступна",
            `${message}. Обновите смену или откройте новую.`,
          );
        } else {
          showAlert("error", "Ошибка сканирования", message);
        }
      } finally {
        barcodeProcessingRef.current = false;
        setScannedBarcode("");
        // Обновляем время последнего сканирования в любом случае
        // для защиты от открытия страницы оплаты
        lastScanTimeRef.current = Date.now();
        // Помечаем, что поле поиска было очищено после сканирования
        searchClearedAfterScanRef.current = true;
        // Убеждаемся, что флаг сканирования установлен (на случай, если он был сброшен)
        isScanningRef.current = true;

        // Сбрасываем флаг сканирования с задержкой, чтобы Enter от сканера успел обработаться
        // Задержка 3 секунды гарантирует, что Enter от сканера будет обработан даже при медленном соединении
        setTimeout(() => {
          isScanningRef.current = false;
          searchClearedAfterScanRef.current = false;
        }, 3000);
      }
    },
  });


  Object.assign(b, {
    setScannedBarcode,
    barcodeProcessingRef,
    barcodeAmbiguity,
    setBarcodeAmbiguity,
    barcodeAmbiguityLoading,
    setBarcodeAmbiguityLoading,
    findProductByAnyBarcode,
    addToCartRef,
    addProductByAlternateBarcode,
  });
  return b;
}
