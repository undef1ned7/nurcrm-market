import { Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import "./CashierPage.scss";
import { useCashierPage } from "./hooks/useCashierPage";
import { CashierPageHeader } from "./components/CashierPageHeader";
import { CashierProductsPanel } from "./components/CashierProductsPanel";
import { CashierCartPanel } from "./components/CashierCartPanel";
import { CashierPageModals } from "./components/CashierPageModals";
import { CashierSubPages } from "./components/CashierSubPages";

export default function CashierPage() {
  const { t } = useTranslation();
  const vm = useCashierPage();

  if (
    vm.showShiftPage ||
    vm.showOpenShiftPage ||
    vm.showCloseShiftPage ||
    vm.showPaymentPage
  ) {
    return <CashierSubPages vm={vm} />;
  }

  const {
    cartFull,
    contentRef,
    setMobileProductsList,
    handleDesktopResizeStart,
  } = vm;

  return (
    <div className={`cashier-page ${cartFull ? "cashier-page--cart-full" : ""}`}>
      <CashierPageHeader vm={vm} />

      <div className="cashier-page__content" ref={contentRef}>
        <CashierProductsPanel vm={vm} />
        <Button
          className="min-[769px]:hidden!"
          onClick={() => setMobileProductsList(true)}
          color="info"
        >
          {t("crm.cashier.addProduct")}
        </Button>
        <div
          className="cashier-page__splitter"
          onMouseDown={handleDesktopResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label={t("crm.cashier.resizePanels")}
        />
        <CashierCartPanel vm={vm} />
      </div>

      <CashierPageModals vm={vm} />
    </div>
  );
}
