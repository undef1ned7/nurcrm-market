import { useCallback, useMemo, useRef, useState } from "react";
import { deleteSale, getSale, startSale } from "@entities/sale";
import { useSale } from "@entities/sale";
import {
  buildPosStartPayload,
  normalizePosStartResponse,
} from "@shared/lib/tools/posSaleCarts";

export const MARKET_CASHIER_SALE_ID_PARAM = "sale_id";

/**
 * Мультикорзины маркет-кассы: список с бэка (POST /start/), переключение через getSale + refresh start.
 */
export function useMarketCashierMultiCart({
  shiftId,
  dispatch,
  preferredWholesaleMode,
}: any) {
  const {
    start: currentSale,
    posCarts = [],
    activeSaleId: storeActiveSaleId,
  } = useSale();
  const [switching, setSwitching] = useState(false);
  const switchingTargetRef = useRef<any>(null);

  const carts = useMemo(() => posCarts, [posCarts]);

  const activeSaleId =
    storeActiveSaleId || currentSale?.id || carts[0]?.saleId || null;

  const mainSaleId = useMemo(() => {
    const main = carts.find((c) => c.isMain);
    return main?.saleId ?? carts[0]?.saleId ?? null;
  }, [carts]);

  const baseStartArgs = useCallback(
    (extra = {}) =>
      buildPosStartPayload({
        shift: shiftId,
        is_wholesale: Boolean(preferredWholesaleMode),
        ...extra,
      }),
    [shiftId, preferredWholesaleMode],
  );

  const refreshCartsFromStart = useCallback(
    async (extra = {}) => {
      if (!shiftId) return null;
      return dispatch(startSale(baseStartArgs(extra) as any) as any).unwrap();
    },
    [shiftId, dispatch, baseStartArgs],
  );

  const getActiveSaleId = useCallback(
    () => switchingTargetRef.current || activeSaleId,
    [activeSaleId],
  );

  const resolveTargetSaleId = useCallback(
    (urlSaleId) => {
      if (switchingTargetRef.current) return switchingTargetRef.current;
      const fromUrl = urlSaleId ? String(urlSaleId).trim() : "";
      if (fromUrl) return fromUrl;
      if (activeSaleId) return String(activeSaleId);
      if (mainSaleId) return String(mainSaleId);
      return null;
    },
    [activeSaleId, mainSaleId],
  );

  const switchToCart = useCallback(
    async (saleId) => {
      if (!saleId || !shiftId) return;
      const id = String(saleId);
      if (switchingTargetRef.current === id) {
        return;
      }
      if (String(activeSaleId) === id && String(currentSale?.id) === id) {
        return;
      }
      const requestId = id;
      switchingTargetRef.current = requestId;
      setSwitching(true);
      try {
        await dispatch(getSale({ id: requestId } as any) as any).unwrap();
        await refreshCartsFromStart({ sale_id: requestId });
      } finally {
        // Не сбрасываем флаг, если уже ушли на другой target
        if (switchingTargetRef.current === requestId) {
          switchingTargetRef.current = null;
          setSwitching(false);
        }
      }
    },
    [shiftId, activeSaleId, currentSale?.id, dispatch, refreshCartsFromStart],
  );

  const parkAndNewCart = useCallback(async () => {
    if (!shiftId) return null;
    setSwitching(true);
    try {
      const data = await refreshCartsFromStart({ is_new: true });
      const { activeSaleId: newId } = normalizePosStartResponse(data);
      return newId;
    } finally {
      setSwitching(false);
    }
  }, [shiftId, refreshCartsFromStart]);

  const deleteCart = useCallback(
    async (saleId) => {
      if (!saleId || !shiftId) return null;
      setSwitching(true);
      try {
        await dispatch(deleteSale(String(saleId) as any) as any).unwrap();
        const data = await refreshCartsFromStart({});
        const { activeSaleId: nextId } = normalizePosStartResponse(data);
        return nextId;
      } finally {
        setSwitching(false);
      }
    },
    [shiftId, dispatch, refreshCartsFromStart],
  );

  const refreshActiveSale = useCallback(async () => {
    if (!shiftId) return null;
    const id = activeSaleId;
    if (id) {
      await dispatch(getSale({ id }) as any).unwrap();
    }
    return refreshCartsFromStart(
      id ? { sale_id: id } : {},
    );
  }, [shiftId, activeSaleId, dispatch, refreshCartsFromStart]);

  const removeCartFromSession = useCallback(() => {
    // Список корзин обновляется через start после checkout на бэке
  }, []);

  const registerMainSale = useCallback(() => {}, []);

  const clearSession = useCallback(() => {}, []);

  return {
    carts,
    activeSaleId,
    mainSaleId,
    switching,
    registerMainSale,
    switchToCart,
    parkAndNewCart,
    deleteCart,
    removeCartFromSession,
    getActiveSaleId,
    resolveTargetSaleId,
    refreshActiveSale,
    refreshCartsFromStart,
    clearSession,
  };
};
