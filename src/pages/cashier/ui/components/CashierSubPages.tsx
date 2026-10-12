import { fetchProductsAsync } from "@entities/product";
import { fetchShiftsAsync } from "@entities/shift";
import { resetPosSale } from "@entities/sale";
import { EMPTY_CONSULTANT_DRAFT } from "@entities/sale";
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
    consultantBySaleId,
    setConsultantBySaleId,
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
          // Полный GET /shifts/ без фильтров на проде отвечает дольше таймаута (20с) —
          // берём только открытые и не ждём его: смену ищем сразу (status=open).
          dispatch((fetchShiftsAsync as any)({ status: "open" }));
          findOpenShift();
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
          dispatch((fetchShiftsAsync as any)({ status: "open" }));
          // Очищаем корзину и текущую продажу (после закрытия смены она невалидна)
          dispatch(resetPosSale());
          setCart([]);
          cartOrderRef.current = [];
          setSelectedCustomer(null);
          setConsultantBySaleId({});
          setDiscountValue("");
        }}
        shift={openShift}
      />
    );
  }

  if (showPaymentPage) {
    const saleKey = currentSale?.id != null ? String(currentSale.id) : "";
    return (
      <PaymentPage
        cart={cart}
        total={total}
        customer={selectedCustomer}
        consultantDraft={
          (saleKey && consultantBySaleId[saleKey]) || EMPTY_CONSULTANT_DRAFT
        }
        onConsultantDraftChange={(draft) => {
          if (!saleKey) return;
          setConsultantBySaleId((prev) => ({ ...prev, [saleKey]: draft }));
        }}
        onBack={() => setShowPaymentPage(false)}
        onSelectCustomer={(customer: unknown) => {
          setSelectedCustomer(customer);
        }}
        onComplete={async () => {
          if (saleKey) multiCart.markSaleJustCheckedOut(saleKey);
          setShowPaymentPage(false);
          setCart([]);
          cartOrderRef.current = [];
          setSelectedCustomer(null);
          if (saleKey) {
            setConsultantBySaleId((prev) => {
              const next = { ...prev };
              delete next[saleKey];
              return next;
            });
          }
          setDiscountValue("");
          if (openShiftId) {
            // Убираем sale_id только что оплаченной продажи из URL ДО того,
            // как начнём создавать новую корзину — иначе в промежуточном
            // рендере currentSale.id (уже новый, из Redux) не совпадёт с
            // urlSaleId (ещё старый), и эффект синхронизации URL/Redux в
            // useCashierShifts.ts попытается "переключиться" на только что
            // оплаченную продажу — GET на неё вернёт 404.
            // См. docs/sale-flow-bugs.md, пункт 12.
            setSearchParams(
              (prev) => {
                const p = new URLSearchParams(prev);
                p.delete(MARKET_CASHIER_SALE_ID_PARAM);
                return p;
              },
              { replace: true },
            );
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
        shiftId={openShiftId}
        customers={clients}
        sale={currentSale}
      />
    );
  }

  return null;
}
