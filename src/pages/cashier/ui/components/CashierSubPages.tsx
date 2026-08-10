import { fetchProductsAsync } from "@entities/product";
import { fetchShiftsAsync } from "@entities/shift";
import { resetPosSale } from "@entities/sale";
import { MARKET_CASHIER_SALE_ID_PARAM } from "@features/create-sale/model/useMarketCashierMultiCart";
import type { ReactElement } from "react";
import CloseShiftPage from "../CloseShiftPage";
import OpenShiftPage from "../OpenShiftPage";
import PaymentPage from "../PaymentPage";
import ShiftPage from "../ShiftPage";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

/** Early-return sub-pages (Shift / Open / Close / Payment). Returns null if main cashier UI should render. */
export function CashierSubPages({ vm }: Props): ReactElement | null {
  const {
    showShiftPage,
    setShowShiftPage,
    showOpenShiftPage,
    setShowOpenShiftPage,
    showCloseShiftPage,
    setShowCloseShiftPage,
    showPaymentPage,
    setShowPaymentPage,
    findOpenShift,
    dispatch,
    openShift,
    setOpenShiftState,
    setCart,
    cartOrderRef,
    setSelectedCustomer,
    setDiscountValue,
    cart,
    total,
    selectedCustomer,
    multiCart,
    store,
    setSearchParams,
    openShiftId,
    currentSale,
    clients,
  } = vm;

  if (showShiftPage) {
    return <ShiftPage onBack={() => setShowShiftPage(false)} />;
  }

  if (showOpenShiftPage) {
    return (
      <OpenShiftPage
        onBack={() => {
          setShowOpenShiftPage(false);
          // Обновляем список смен после возврата
          dispatch((fetchShiftsAsync as any)()).then(() => {
            // После обновления списка ищем открытую смену
            findOpenShift();
          });
        }}
      />
    );
  }

  if (showCloseShiftPage) {
    return (
      <CloseShiftPage
        onBack={() => {
          setShowCloseShiftPage(false);
          // Сбрасываем состояние открытой смены
          setOpenShiftState(null);
          // Обновляем список смен после возврата
          dispatch((fetchShiftsAsync as any)());
          // Очищаем корзину и текущую продажу (после закрытия смены она невалидна)
          dispatch(resetPosSale());
          setCart([]);
          cartOrderRef.current = [];
          setSelectedCustomer(null);
          setDiscountValue("");
        }}
        shift={openShift}
      />
    );
  }

  if (showPaymentPage) {
    return (
      <PaymentPage
        cart={cart}
        total={total}
        customer={selectedCustomer}
        onBack={() => setShowPaymentPage(false)}
        onSelectCustomer={(customer: unknown) => {
          setSelectedCustomer(customer);
        }}
        onComplete={async () => {
          setShowPaymentPage(false);
          setCart([]);
          cartOrderRef.current = [];
          setSelectedCustomer(null);
          setDiscountValue("");
          if (openShiftId) {
            try {
              await multiCart.refreshCartsFromStart();
            } catch (e: any) {
              console.error("Не удалось обновить список корзин:", e);
            }
            const activeId =
              (store.getState() as { sale?: { activeSaleId?: string | number; start?: { id?: string | number } } })
                .sale?.activeSaleId ??
              (store.getState() as { sale?: { start?: { id?: string | number } } }).sale?.start?.id;
            if (activeId) {
              setSearchParams(
                (prev) => {
                  const p = new URLSearchParams(prev);
                  p.set(MARKET_CASHIER_SALE_ID_PARAM, String(activeId));
                  return p;
                },
                { replace: true },
              );
            }
          }
          // После завершения продажи обновляем список товаров (остатки)
          try {
            await dispatch(fetchProductsAsync({ page: 1 })).unwrap();
          } catch (e: any) {
            console.error(
              "Не удалось обновить список товаров после продажи:",
              e,
            );
          }
        }}
        saleId={currentSale?.id}
        customers={clients}
        sale={currentSale}
      />
    );
  }

  return null;
}
