import { ArrowLeft, Menu, Monitor } from "lucide-react";
import {
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
} from "@features/customer-display";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

export function CashierPageHeader({ vm }: Props) {
  const {
    navigate,
    openShiftId,
    cashierFullName,
    isWholesaleMode,
    handleSwitchSaleMode,
    openShift,
    handleCloseShift,
    handleStartShift,
    setShowMenuModal,
    f3AwaitingDigit,
  } = vm;

  return (
          <div className="cashier-page__header">
            <div className="cashier-page__header-left">
              <button
                className="cashier-page__back-btn"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="cashier-page__title">Касса</h1>
                <p className="cashier-page__subtitle">
                  {openShiftId ? (
                    cashierFullName
                  ) : (
                    "Нет открытой смены"
                  )}
                </p>
              </div>
            </div>
            <div className="cashier-page__header-right">
              {f3AwaitingDigit ? (
                <div className="cashier-page__f3-hint" role="status">
                  F3: нажмите 0–9
                </div>
              ) : null}
              {isCustomerDisplayEnabled() ? (
                <button
                  type="button"
                  className="cashier-page__display-btn"
                  onClick={() => openCustomerDisplayWindow()}
                >
                  <Monitor size={16} />
                  Второй экран
                </button>
              ) : null}
              <div
                className="cashier-page__mode-toggle"
                role="group"
                aria-label="Режим продажи"
              >
                <button
                  type="button"
                  className={`cashier-page__mode-btn${
                    !isWholesaleMode ? " cashier-page__mode-btn--active" : ""
                  }`}
                  onClick={() => handleSwitchSaleMode(false)}
                >
                  Розница
                </button>
                <button
                  type="button"
                  className={`cashier-page__mode-btn${
                    isWholesaleMode ? " cashier-page__mode-btn--active" : ""
                  }`}
                  onClick={() => handleSwitchSaleMode(true)}
                >
                  Опт
                </button>
              </div>
              {openShiftId && openShift?.status === "open" ? (
                <button
                  type="button"
                  className="cashier-page__close-shift-btn"
                  onClick={handleCloseShift}
                >
                  Завершить смену
                </button>
              ) : (
                <button
                  type="button"
                  className="cashier-page__close-shift-btn cashier-page__close-shift-btn--start"
                  onClick={handleStartShift}
                >
                  Начать смену
                </button>
              )}
              <button
                type="button"
                className="cashier-page__menu-btn"
                onClick={() => setShowMenuModal(true)}
                aria-label="Меню кассы"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
  );
}
