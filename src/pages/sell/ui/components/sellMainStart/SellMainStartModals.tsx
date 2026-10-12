import AlertModal from "@shared/ui/AlertModal/AlertModal";
import BarcodeAmbiguityModal from "@shared/ui/BarcodeAmbiguityModal/BarcodeAmbiguityModal";
import ClientModal from "../ClientModal";
import DebtModal from "../DebtModal";
import {
  PaymentChoiceModal,
  CashModal,
  ReceiptChoiceModal,
} from "../PaymentModals";
import DiscountModal from "../DiscountModal";
import CustomServiceModal from "../CustomServiceModal";
import type { SellMainStartVm } from "../../hooks/useSellMainStart";

type Props = {
  vm: SellMainStartVm;
};

export default function SellMainStartModals({ vm }: Props) {
  const {
    showNewClientModal,
    setShowNewClientModal,
    form,
    setForm,
    touched,
    setTouched,
    errors,
    setErrors,
    submitTried,
    setSubmitTried,
    setAlert,
    alert,
    showDebtModal,
    setShowDebtModal,
    currentTotal,
    clientId,
    setClientId,
    setSelectClient,
    filterClient,
    company,
    state,
    onChange2,
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    handleSaveDebt,
    showCustomServiceModal,
    setShowCustomServiceModal,
    customService,
    setCustomService,
    handleAddCustomService,
    showDiscountModal,
    setShowDiscountModal,
    discountValue,
    setDiscountValue,
    currentSubtotal,
    onDiscountChange,
    showCashModal,
    setShowCashModal,
    cashReceived,
    setCashReceived,
    cashPaymentConfirmed,
    setCashPaymentConfirmed,
    setPaymentMethod,
    handleCashPayment,
    showPaymentChoiceModal,
    setShowPaymentChoiceModal,
    paymentChoice,
    setPaymentChoice,
    handleConfirmPaymentChoice,
    showReceiptChoiceModal,
    setShowReceiptChoiceModal,
    receiptWithCheck,
    setReceiptWithCheck,
    paymentMethod,
    setPendingCheckout,
    barcodeAmbiguity,
    barcodeAmbiguityLoading,
    selectAmbiguousProduct,
    closeAmbiguity,
  } = vm;

  return (
    <>
      <ClientModal
        show={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        form={form}
        setForm={setForm}
        touched={touched}
        setTouched={setTouched}
        errors={errors}
        setErrors={setErrors}
        submitTried={submitTried}
        setSubmitTried={setSubmitTried}
        setAlert={setAlert}
      />

      <DebtModal
        show={showDebtModal}
        onClose={() => setShowDebtModal(false)}
        currentTotal={currentTotal}
        clientId={clientId}
        setClientId={setClientId}
        setSelectClient={setSelectClient}
        filterClient={filterClient}
        company={company}
        state={state}
        onChange2={onChange2}
        debt={debt}
        setDebt={setDebt}
        amount={amount}
        setAmount={setAmount}
        debtMonths={debtMonths}
        setDebtMonths={setDebtMonths}
        onSave={handleSaveDebt}
      />

      <CustomServiceModal
        show={showCustomServiceModal}
        onClose={() => setShowCustomServiceModal(false)}
        customService={customService}
        setCustomService={setCustomService}
        onAdd={handleAddCustomService}
      />

      <DiscountModal
        show={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        currentSubtotal={currentSubtotal}
        onApply={(discount) =>
          onDiscountChange({ target: { value: discount } })
        }
      />

      <CashModal
        show={showCashModal}
        onClose={() => setShowCashModal(false)}
        currentTotal={currentTotal}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        cashPaymentConfirmed={cashPaymentConfirmed}
        setCashPaymentConfirmed={setCashPaymentConfirmed}
        setPaymentMethod={setPaymentMethod}
        onPay={handleCashPayment}
        setAlert={setAlert}
      />

      <PaymentChoiceModal
        show={showPaymentChoiceModal}
        onClose={() => setShowPaymentChoiceModal(false)}
        paymentChoice={paymentChoice}
        setPaymentChoice={setPaymentChoice}
        onConfirm={handleConfirmPaymentChoice}
      />

      <ReceiptChoiceModal
        show={showReceiptChoiceModal}
        onClose={() => {
          setShowReceiptChoiceModal(false);
          setCashPaymentConfirmed(false);
        }}
        receiptWithCheck={receiptWithCheck}
        setReceiptWithCheck={setReceiptWithCheck}
        paymentMethod={paymentMethod}
        onConfirm={() => {
          setPendingCheckout({
            withReceipt: receiptWithCheck,
            paymentType: paymentMethod || "card",
          });
          setShowReceiptChoiceModal(false);
          setCashPaymentConfirmed(false);
        }}
      />

      <AlertModal
        open={alert.open}
        type={alert.type}
        title=""
        message={alert.message}
        okText="Ok"
        onClose={() => setAlert((a: any) => ({ ...a, open: false }))}
      />

      <BarcodeAmbiguityModal
        open={Boolean(barcodeAmbiguity)}
        message={barcodeAmbiguity?.message}
        matches={barcodeAmbiguity?.matches}
        loading={barcodeAmbiguityLoading}
        onSelect={selectAmbiguousProduct}
        onClose={closeAmbiguity}
      />
    </>
  );
}
