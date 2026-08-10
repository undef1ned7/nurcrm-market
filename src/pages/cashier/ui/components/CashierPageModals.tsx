import AlertModal from "@shared/ui/AlertModal/AlertModal";
import BarcodeAmbiguityModal from "@shared/ui/BarcodeAmbiguityModal/BarcodeAmbiguityModal";
import CustomServiceModal from "@pages/sell/ui/components/CustomServiceModal";
import DiscountModal from "@pages/sell/ui/components/DiscountModal";
import CustomerModal from "./CustomerModal";
import DebtPaymentModal from "./DebtPaymentModal";
import DeletionsLogModal from "./DeletionsLogModal";
import HotkeyProductsModal from "./HotkeyProductsModal";
import MenuModal from "./MenuModal";
import ReceiptsModal from "./ReceiptsModal";
import DeleteCodeModal from "./DeleteCodeModal";
import PieceSaleModal from "./PieceSaleModal";
import { stripTrailingZerosAfterDecimal } from "../cashierPage.utils";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

export function CashierPageModals({ vm }: Props) {
  const {
    showMenuModal,
    setShowMenuModal,
    handleMenuAction,
    showCustomerModal,
    setShowCustomerModal,
    setSelectedCustomer,
    clients,
    showDebtModal,
    setShowDebtModal,
    showReceiptsModal,
    setShowReceiptsModal,
    pieceSaleModal,
    closePieceSaleModal,
    handlePieceSaleChoosePack,
    handlePieceSaleConfirmPieces,
    showHotkeyProductsModal,
    setShowHotkeyProductsModal,
    hotkeyProductsGroup,
    hotkeyFilteredProducts,
    hotkeyProductsLoading,
    hotkeyProductsError,
    openHotkeyProductsModal,
    openPieceSaleChoice,
    addToCart,
    addToCartWithPackage,
    showDeletionsLogModal,
    setShowDeletionsLogModal,
    deleteCodePrompt,
    handleDeleteCodeConfirm,
    closeDeleteCodePrompt,
    showCustomServiceModal,
    setShowCustomServiceModal,
    customService,
    setCustomService,
    handleAddCustomService,
    showDiscountModal,
    setShowDiscountModal,
    discountValue,
    setDiscountValue,
    currentSale,
    discountMode,
    setDiscountMode,
    discountLimitPercent,
    handleDiscountChange,
    barcodeAmbiguity,
    barcodeAmbiguityLoading,
    handleAmbiguousCashierProductSelect,
    setBarcodeAmbiguity,
    alertModal,
    closeAlert,
  } = vm;

  return (
    <>
            {showMenuModal && (
              <MenuModal
                onClose={() => setShowMenuModal(false)}
                onAction={handleMenuAction}
              />
            )}

            {showCustomerModal && (
              <CustomerModal
                onClose={() => setShowCustomerModal(false)}
                onSelect={(customer) => {
                  setSelectedCustomer(customer);
                  setShowCustomerModal(false);
                }}
                customers={clients}
              />
            )}

            {showDebtModal && (
              <DebtPaymentModal
                onClose={() => setShowDebtModal(false)}
                customers={clients}
              />
            )}

            {showReceiptsModal && (
              <ReceiptsModal onClose={() => setShowReceiptsModal(false)} />
            )}

            {pieceSaleModal?.product && (
              <PieceSaleModal
                product={pieceSaleModal.product}
                step={pieceSaleModal.step || "choice"}
                source={pieceSaleModal.source || "click"}
                maxQuantity={pieceSaleModal.maxQuantity ?? null}
                onClose={closePieceSaleModal}
                onChoosePack={handlePieceSaleChoosePack}
                onConfirmPieces={handlePieceSaleConfirmPieces}
              />
            )}

            {showHotkeyProductsModal && (
              <HotkeyProductsModal
                hotkeyGroup={hotkeyProductsGroup}
                products={hotkeyFilteredProducts}
                loading={hotkeyProductsLoading}
                error={hotkeyProductsError}
                onClose={() => setShowHotkeyProductsModal(false)}
                onSelectGroup={openHotkeyProductsModal}
                onAddProduct={(product) => {
                  if (!openPieceSaleChoice(product, "click")) {
                    void addToCart(product);
                  }
                }}
                onAddProductPiece={addToCartWithPackage}
              />
            )}

            {showDeletionsLogModal && (
              <DeletionsLogModal onClose={() => setShowDeletionsLogModal(false)} />
            )}

            {deleteCodePrompt && (
              <DeleteCodeModal
                title={deleteCodePrompt.title}
                description={deleteCodePrompt.description}
                onConfirm={handleDeleteCodeConfirm}
                onCancel={() => closeDeleteCodePrompt(false)}
              />
            )}

            {showCustomServiceModal && (
              <CustomServiceModal
                show={showCustomServiceModal}
                onClose={() => {
                  setShowCustomServiceModal(false);
                  setCustomService({ name: "", price: "", quantity: "1" });
                }}
                customService={customService}
                setCustomService={setCustomService}
                onAdd={handleAddCustomService}
              />
            )}

            {showDiscountModal && (
              <DiscountModal
                show={showDiscountModal}
                onClose={() => {
                  setShowDiscountModal(false);
                }}
                discountValue={discountValue}
                setDiscountValue={setDiscountValue}
                currentSubtotal={currentSale?.subtotal || 0}
                mode={discountMode}
                setMode={setDiscountMode}
                maxPercent={
                  discountLimitPercent != null
                    ? stripTrailingZerosAfterDecimal(discountLimitPercent)
                    : null
                }
                onApply={(discount) => {
                  handleDiscountChange(discount, discountMode);
                  setShowDiscountModal(false);
                }}
              />
            )}

            <BarcodeAmbiguityModal
              open={Boolean(barcodeAmbiguity)}
              message={barcodeAmbiguity?.message}
              matches={barcodeAmbiguity?.matches}
              loading={barcodeAmbiguityLoading}
              onSelect={handleAmbiguousCashierProductSelect}
              onClose={() => {
                if (!barcodeAmbiguityLoading) setBarcodeAmbiguity(null);
              }}
            />

            <AlertModal
              open={alertModal.open}
              type={alertModal.type}
              title={alertModal.title}
              message={alertModal.message}
              okText="ОК"
              onClose={closeAlert}
              onConfirm={closeAlert}
            />
    </>
  );
}
