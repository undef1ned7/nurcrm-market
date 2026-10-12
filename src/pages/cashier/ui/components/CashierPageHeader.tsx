import { ArrowLeft, Menu, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
} from "@features/customer-display";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

export function CashierPageHeader({ vm }: Props) {
  const { t } = useTranslation();
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
                <h1 className="cashier-page__title">{t("crm.cashier.pageTitle")}</h1>
                <p className="cashier-page__subtitle">
                  {openShiftId ? (
                    cashierFullName
                  ) : (
                    t("crm.cashier.noOpenShift")
                  )}
                </p>
              </div>
            </div>
            <div className="cashier-page__header-right">
              {f3AwaitingDigit ? (
                <div className="cashier-page__f3-hint" role="status">
                  {t("crm.cashier.f3Hint")}
                </div>
              ) : null}
              {isCustomerDisplayEnabled() ? (
                <button
                  type="button"
                  className="cashier-page__display-btn"
                  onClick={() => openCustomerDisplayWindow()}
                >
                  <Monitor size={16} />
                  {t("crm.cashier.secondScreen")}
                </button>
              ) : null}
              <div
                className="cashier-page__mode-toggle"
                role="group"
                aria-label={t("crm.cashier.saleModeLabel")}
              >
                <button
                  type="button"
                  className={`cashier-page__mode-btn${
                    !isWholesaleMode ? " cashier-page__mode-btn--active" : ""
                  }`}
                  onClick={() => handleSwitchSaleMode(false)}
                >
                  {t("crm.cashier.retail")}
                </button>
                <button
                  type="button"
                  className={`cashier-page__mode-btn${
                    isWholesaleMode ? " cashier-page__mode-btn--active" : ""
                  }`}
                  onClick={() => handleSwitchSaleMode(true)}
                >
                  {t("crm.cashier.wholesaleShort")}
                </button>
              </div>
              {openShiftId && openShift?.status === "open" ? (
                <button
                  type="button"
                  className="cashier-page__close-shift-btn"
                  onClick={handleCloseShift}
                >
                  {t("crm.cashier.finishShift")}
                </button>
              ) : (
                <button
                  type="button"
                  className="cashier-page__close-shift-btn cashier-page__close-shift-btn--start"
                  onClick={handleStartShift}
                >
                  {t("crm.cashier.startShift")}
                </button>
              )}
              <button
                type="button"
                className="cashier-page__menu-btn"
                onClick={() => setShowMenuModal(true)}
                aria-label={t("crm.cashier.cashierMenuLabel")}
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
  );
}
