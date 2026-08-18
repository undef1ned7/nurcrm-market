import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
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
import { getCashBoxes } from "@entities/cash";
import api from "@shared/api";
import { productMatchesBarcode } from "@shared/lib/tools/productBarcode";
import { isMarketWarehouseServiceProduct } from "@shared/lib/tools/marketWarehouseFilters";
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


export function useCashierShifts(b: any) {
  const alert = useAlert();
  const showAlert = (...args: any[]) => (b.showAlert ? b.showAlert(...args) : (alert as any)(...args));
  const confirm = useConfirm();
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const store = useStore();
  // Узкие селекторы: чтобы не ререндерить кассу из-за обновлений "лишних" полей slice.
  const products = useSelector((s: any) => s.product.list);
  const count = useSelector((s: any) => s.product.count);
  const next = useSelector((s: any) => s.product.next);
  const previous = useSelector((s: any) => s.product.previous);
  const productsLoading = useSelector((s: any) => s.product.loading);

  const clients = useSelector((s: any) => s.client.list);

  const currentSale = useSelector((s: any) => s.sale.start);
  const saleLoading = useSelector((s: any) => s.sale.loading);
  const startSaleLoading = useSelector((s: any) => s.sale.startSaleLoading);

  const shifts = useSelector((s: any) => s.shifts.shifts);

  const currentUser = useSelector((s: any) => s.user.currentUser);
  const profile = useSelector((s: any) => s.user.profile);
  const userId = useSelector((s: any) => s.user.userId);
  const cashierId = useMemo(
    () => resolveCashierId({ currentUser, userId, profile }),
    [currentUser, userId, profile],
  );
  const cashierFullName = useMemo(() => {
    const src = profile || currentUser || {};
    const fullName = String(src?.full_name || "").trim();
    if (fullName) return fullName;
    const firstName = String(src?.first_name || "").trim();
    const lastName = String(src?.last_name || "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
    return String(src?.username || src?.email || "Пользователь");
  }, [profile, currentUser]);
  const [openShiftState, setOpenShiftState] = useState<Record<
    string,
    unknown
  > | null>(null);

  /** Не синхронизируем с API, пока дробь не дописана */
  const shouldSyncQuantityToApiWhileTyping = useCallback((rawValue) => {
    if (isIncompleteDecimalInput(rawValue)) return false;
    const num = parseDecimalInput(rawValue);
    return Number.isFinite(num) && num > 0;
  }, []);

  const findOpenShift = useCallback(async () => {
    try {
      const ownShift = await fetchOwnOpenShift(api, cashierId);
      if (ownShift) {
        setOpenShiftState(ownShift);
        return ownShift;
      }
      setOpenShiftState((prev) =>
        prev && isOwnOpenShift(prev, cashierId) ? prev : null,
      );
      return null;
    } catch (error: any) {
      console.error("Ошибка при поиске открытой смены:", error);
      setOpenShiftState((prev) =>
        prev && isOwnOpenShift(prev, cashierId) ? prev : null,
      );
      return null;
    }
  }, [cashierId]);

  // Получаем текущую открытую смену (мемоизируем, чтобы избежать лишних пересчетов)
  // Используем локальное состояние, если оно есть, иначе ищем в загруженных сменах
  const openShift = React.useMemo(() => {
    if (openShiftState && isOwnOpenShift(openShiftState, cashierId)) {
      return openShiftState;
    }
    return findOwnOpenShiftInList(shifts, cashierId);
  }, [shifts, openShiftState, cashierId]);
  const openShiftId = openShift?.id;
  const openShiftIdRef = useRef(openShiftId);
  const preferredWholesaleModeRef = useRef(false);

  useEffect(() => {
    openShiftIdRef.current = openShiftId;
  }, [openShiftId]);
  const [preferredWholesaleMode, setPreferredWholesaleMode] = useState(() => {
    try {
      return localStorage.getItem(MARKET_CASHIER_WHOLESALE_MODE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const isWholesaleMode =
    currentSale?.is_wholesale !== undefined && currentSale?.is_wholesale !== null
      ? Boolean(currentSale.is_wholesale)
      : Boolean(preferredWholesaleMode);

  useEffect(() => {
    preferredWholesaleModeRef.current = preferredWholesaleMode;
  }, [preferredWholesaleMode]);

  const multiCart = useMarketCashierMultiCart({
    shiftId: openShiftId,
    dispatch,
    preferredWholesaleMode,
  });
  const multiCartRef = useRef(multiCart);
  useEffect(() => {
    multiCartRef.current = multiCart;
  }, [multiCart]);

  const waitForStartSaleIdle = useCallback(
    async (maxMs = 4000) => {
      const started = Date.now();
      while (Date.now() - started < maxMs) {
        const saleState = (store as any).getState().sale;
        if (!saleState.startSaleLoading) {
          return saleState.start ?? null;
        }
        await sleep(50);
      }
      return (store as any).getState().sale?.start ?? null;
    },
    [store],
  );

  const getSaleIdFromUrl = useCallback(() => {
    try {
      return new URLSearchParams(window.location.search).get(
        MARKET_CASHIER_SALE_ID_PARAM,
      );
    } catch {
      return null;
    }
  }, []);

  const getSelectedSaleId = useCallback(() => {
    const saleState = (store as any).getState().sale;
    const id =
      multiCartRef.current?.getActiveSaleId?.() ||
      saleState?.activeSaleId ||
      saleState?.start?.id ||
      getSaleIdFromUrl();
    return id ? String(id) : null;
  }, [getSaleIdFromUrl, store]);

  const getCartLineSaleId = useCallback(
    (item) => (item?.saleId ? String(item.saleId) : getSelectedSaleId()),
    [getSelectedSaleId],
  );

  const ensureActiveSaleId = useCallback(
    async (shiftId) => {
      if (!shiftId) return null;

      const urlSaleId = getSaleIdFromUrl();
      const stateSale = (store as any).getState().sale?.start ?? null;
      const activeId = multiCartRef.current?.getActiveSaleId?.();
      const targetId =
        activeId ||
        (stateSale?.id && String(getSaleShiftId(stateSale)) === String(shiftId)
          ? stateSale.id
          : null) ||
        multiCartRef.current?.resolveTargetSaleId(urlSaleId);

      if (targetId) {
        const current = (store as any).getState().sale?.start ?? null;
        if (
          String(current?.id) === String(targetId) &&
          String(getSaleShiftId(current)) === String(shiftId)
        ) {
          return current.id;
        }
        try {
          const loaded = await dispatch(getSale({ id: targetId })).unwrap();
          if (String(getSaleShiftId(loaded)) === String(shiftId)) return loaded.id;
        } catch {
          // создадим новую продажу ниже
        }
      }

      const readSale = () => (store as any).getState().sale?.start ?? null;
      let sale = readSale();
      if (sale?.id && String(getSaleShiftId(sale)) === String(shiftId)) {
        return sale.id;
      }

      try {
        const result = await dispatch(
          startSale({
            discount_total: 0,
            shift: shiftId,
            is_wholesale: Boolean(preferredWholesaleModeRef.current),
          }),
        ).unwrap();
        return result?.id ?? null;
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        if (!msg.includes("condition callback returning false")) {
          throw e;
        }

        sale = await waitForStartSaleIdle();
        if (sale?.id && String(getSaleShiftId(sale)) === String(shiftId)) {
          return sale.id;
        }

        if ((store as any).getState().sale.startSaleLoading) {
          sale = await waitForStartSaleIdle();
          if (sale?.id && String(getSaleShiftId(sale)) === String(shiftId)) {
            return sale.id;
          }
        }

        const retry = await dispatch(
          startSale({
            discount_total: 0,
            shift: shiftId,
            is_wholesale: Boolean(preferredWholesaleModeRef.current),
          }),
        ).unwrap();
        return retry?.id ?? null;
      }
    },
    [dispatch, store, waitForStartSaleIdle, getSaleIdFromUrl],
  );

  /** Подтянуть активную корзину (GET sale) или fallback startSale */
  const refreshSaleFromStore = useCallback(
    async (shiftId, saleId = null) => {
      if (!shiftId) return;
      const targetSaleId = saleId ? String(saleId) : getSelectedSaleId();
      try {
        await multiCartRef.current?.refreshCartsFromStart?.(
          targetSaleId ? { sale_id: targetSaleId } : {},
        );
      } catch (e: any) {
        const msg = String(e?.message || e || "");
        if (!msg.includes("condition callback returning false")) {
          throw e;
        }
        await waitForStartSaleIdle();
      }
    },
    [getSelectedSaleId, waitForStartSaleIdle],
  );

  const handleSwitchSaleMode = useCallback(
    async (nextWholesale) => {
      try {
        if (!openShiftId) {
          showAlert("warning", "Смена не открыта", "Сначала откройте смену");
          return;
        }

        const nextMode = Boolean(nextWholesale);
        const saleId = getSelectedSaleId();
        setPreferredWholesaleMode(nextMode);
        await dispatch(
          startSale({
            ...(saleId ? { sale_id: saleId } : {}),
            shift: openShiftId,
            is_wholesale: nextMode,
          }),
        ).unwrap();
      } catch (_e) {
        showAlert("error", "Ошибка", "Не удалось переключить режим продажи");
      }
    },
    [dispatch, getSelectedSaleId, openShiftId],
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        MARKET_CASHIER_WHOLESALE_MODE_KEY,
        String(Boolean(preferredWholesaleMode)),
      );
    } catch {
      // ignore localStorage issues
    }
  }, [preferredWholesaleMode]);

  useEffect(() => {
    if (currentSale?.is_wholesale === undefined || currentSale?.is_wholesale === null)
      return;
    setPreferredWholesaleMode(Boolean(currentSale.is_wholesale));
  }, [currentSale?.is_wholesale]);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSaleId = searchParams.get(MARKET_CASHIER_SALE_ID_PARAM);
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    if (!urlSaleId || !openShiftId) return;
    if (String(currentSale?.id) === String(urlSaleId)) return;
    multiCart.switchToCart(urlSaleId).catch(() => {});
  }, [urlSaleId, openShiftId, currentSale?.id, multiCart]);

  useEffect(() => {
    if (!currentSale?.id || !openShiftId) return;
    if (searchParams.get(MARKET_CASHIER_SALE_ID_PARAM)) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set(MARKET_CASHIER_SALE_ID_PARAM, String(currentSale.id));
        return p;
      },
      { replace: true },
    );
  }, [currentSale?.id, openShiftId, searchParams, setSearchParams]);

  const handleSelectCashierCart = useCallback(
    async (saleId) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set(MARKET_CASHIER_SALE_ID_PARAM, String(saleId));
          return p;
        },
        { replace: true },
      );
      await multiCart.switchToCart(saleId);
    },
    [multiCart, setSearchParams],
  );

  const handleNewCashierCart = useCallback(async () => {
    try {
      const newId = await multiCart.parkAndNewCart();
      if (!newId) return;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set(MARKET_CASHIER_SALE_ID_PARAM, String(newId));
          return p;
        },
        { replace: true },
      );
    } catch (e: any) {
      alert(validateResErrors(e, "Не удалось создать новую корзину"), true);
    }
  }, [multiCart, setSearchParams, alert]);

  const normalizeMgmtRole = (raw) => {
    const l = String(raw || "").trim().toLowerCase();
    if (["owner", "владелец"].includes(l)) return "owner";
    if (["admin", "administrator", "админ", "администратор"].includes(l))
      return "admin";
    return l;
  };
  const permissionsSource = profile || currentUser || {};
  const mgmtRole = normalizeMgmtRole(permissionsSource?.role);
  const isPrivilegedRole = mgmtRole === "owner" || mgmtRole === "admin";
  const canMarketDiscount =
    isPrivilegedRole || permissionsSource?.can_view_market_discount === true;
  const canMarketEditPrice =
    isPrivilegedRole || permissionsSource?.can_view_market_edit_price === true;
  const canMarketDeleteCartItem =
    isPrivilegedRole ||
    permissionsSource?.can_view_market_delete_cart_item === true;

  // Настройки кассы: код на удаление из корзины и максимальная скидка.
  // Владелец/админ их задают и сами под ограничения не попадают.
  const {
    deleteCodeRequired,
    maxDiscountPercent,
    verifyDeleteCode,
  } = useMarketCashierSettings();
  const requireDeleteCode = deleteCodeRequired && !isPrivilegedRole;
  const discountLimitPercent =
    !isPrivilegedRole && maxDiscountPercent != null ? maxDiscountPercent : null;

  const [deleteCodePrompt, setDeleteCodePrompt] =
    useState<DeleteCodePromptState>(null);
  const deleteCodeResolveRef = useRef<any>(null);

  const closeDeleteCodePrompt = useCallback((granted) => {
    setDeleteCodePrompt(null);
    const resolve = deleteCodeResolveRef.current;
    deleteCodeResolveRef.current = null;
    resolve?.(Boolean(granted));
  }, []);

  /**
   * Спрашивает код подтверждения перед удалением. Если код не задан
   * (или роль привилегированная) — удаление проходит без запроса.
   */
  const ensureDeleteCode = useCallback(
    (options: any = {}) => {
      if (!requireDeleteCode) return Promise.resolve(true);
      // Предыдущий запрос кода (если остался) отменяем.
      deleteCodeResolveRef.current?.(false);
      return new Promise((resolve) => {
        deleteCodeResolveRef.current = resolve;
        setDeleteCodePrompt({
          title: options.title || "Удаление из корзины",
          description:
            options.description ||
            "Введите код подтверждения, чтобы удалить позицию из корзины.",
        });
      });
    },
    [requireDeleteCode],
  );

  const handleDeleteCodeConfirm = useCallback(
    async (code) => {
      const ok = await verifyDeleteCode(code);
      if (ok) closeDeleteCodePrompt(true);
      return ok;
    },
    [verifyDeleteCode, closeDeleteCodePrompt],
  );

  const handleDeleteCashierCart = useCallback(
    async (saleId) => {
      if (!saleId) return;
      // Удаление корзины целиком доступно только при праве на удаление позиций.
      if (!canMarketDeleteCartItem) {
        showAlert(
          "warning",
          "Нет доступа",
          "У вас нет доступа на удаление корзины",
        );
        return;
      }
      confirm("Удалить эту корзину?", async (ok) => {
        if (!ok) return;

        const codeAccepted = await ensureDeleteCode({
          title: "Удаление корзины",
          description:
            "Введите код подтверждения, чтобы удалить корзину целиком.",
        });
        if (!codeAccepted) return;

        try {
          const deletingActiveCart =
            String(saleId) === String(currentSale?.id) ||
            String(saleId) === String(urlSaleId);
          if (deletingActiveCart) {
            setSearchParams(
              (prev) => {
                const p = new URLSearchParams(prev);
                p.delete(MARKET_CASHIER_SALE_ID_PARAM);
                return p;
              },
              { replace: true },
            );
          }
          const nextId = await multiCart.deleteCart(saleId);
          setSearchParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              if (nextId) {
                p.set(MARKET_CASHIER_SALE_ID_PARAM, String(nextId));
              } else {
                p.delete(MARKET_CASHIER_SALE_ID_PARAM);
              }
              return p;
            },
            { replace: true },
          );
          showAlert("success", "Успех", "Корзина удалена");
        } catch (e: any) {
          showAlert(
            "error",
            "Ошибка",
            validateResErrors(e, "Не удалось удалить корзину"),
          );
        }
      });
    },
    [
      confirm,
      currentSale?.id,
      multiCart,
      setSearchParams,
      urlSaleId,
      canMarketDeleteCartItem,
      ensureDeleteCode,
    ],
  );

  Object.assign(b, {
    alert, confirm, navigate, dispatch, store,
    products, count, next, previous, productsLoading,
    clients, currentSale, saleLoading, startSaleLoading, shifts,
    currentUser, profile, userId, cashierId, cashierFullName,
    openShiftState, setOpenShiftState,
    shouldSyncQuantityToApiWhileTyping, findOpenShift,
    openShift, openShiftId, openShiftIdRef,
    preferredWholesaleModeRef, preferredWholesaleMode, setPreferredWholesaleMode,
    isWholesaleMode, multiCart, multiCartRef,
    waitForStartSaleIdle, getSaleIdFromUrl, getSelectedSaleId, getCartLineSaleId,
    ensureActiveSaleId, refreshSaleFromStore, handleSwitchSaleMode,
    searchParams, setSearchParams, urlSaleId, pageFromUrl,
    handleSelectCashierCart, handleNewCashierCart,
    canMarketDiscount, canMarketEditPrice, canMarketDeleteCartItem,
    requireDeleteCode, discountLimitPercent,
    deleteCodePrompt, setDeleteCodePrompt, deleteCodeResolveRef,
    closeDeleteCodePrompt, ensureDeleteCode,
    handleDeleteCodeConfirm, handleDeleteCashierCart,
  });
  return b;
}
