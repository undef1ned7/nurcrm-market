import "./PaymentPage.scss";
import { usePaymentPage } from "./hooks/usePaymentPage";
import { PaymentPageHeader } from "./components/PaymentPageHeader";
import { PaymentPageForm } from "./components/PaymentPageForm";
import { PaymentPageModals } from "./components/PaymentPageModals";
import type { PaymentPageProps } from "./paymentPage.types";

const PaymentPage = ({
  total,
  onBack,
  sale,
  ...rest
}: any) => {
  const vm = usePaymentPage({ total, onBack, sale, ...rest });

  return (
    <div className="payment-page">
      <PaymentPageHeader total={total} onBack={onBack} />

      <PaymentPageForm
        paymentMethod={vm.paymentMethod}
        onPaymentMethodChange={vm.setPaymentMethod}
        selectedCustomer={vm.selectedCustomer as any}
        customerDebt={vm.customerDebt}
        onSelectCustomerClick={vm.handleSelectCustomer}
        sale={sale}
        total={total}
        selectedBank={vm.selectedBank}
        onSelectBank={vm.setSelectedBank}
        splitOnlineBank={vm.splitOnlineBank}
        onSelectSplitOnlineBank={vm.setSplitOnlineBank}
        splitOnlineAmount={vm.splitOnlineAmount}
        splitTransferAmount={vm.splitTransferAmount}
        onSplitOnlineAmountChange={vm.handleSplitOnlineAmountChange}
        onSplitTransferAmountChange={vm.handleSplitTransferAmountChange}
        deferredPrepaymentValue={vm.deferredPrepaymentValue}
        deferredSaleDebtRemaining={vm.deferredSaleDebtRemaining}
        deferredPrepaymentEnabled={vm.deferredPrepaymentEnabled}
        onDeferredPrepaymentEnabledChange={
          vm.handleDeferredPrepaymentEnabledChange
        }
        deferredPrepaymentAmount={vm.deferredPrepaymentAmount}
        onDeferredPrepaymentAmountChange={vm.setDeferredPrepaymentAmount}
        deferredPrepaymentMethod={vm.deferredPrepaymentMethod}
        onDeferredPrepaymentMethodChange={
          vm.handleDeferredPrepaymentMethodChange
        }
        deferredPrepaymentBank={vm.deferredPrepaymentBank}
        onSelectDeferredPrepaymentBank={vm.setDeferredPrepaymentBank}
        debtScheduleVersion={vm.debtScheduleVersion}
        debtDays={vm.debtDays}
        onDebtDaysChange={vm.onDebtDaysChange}
        onDebtDaysBlur={vm.onDebtDaysBlur}
        onDebtDaysDateChange={vm.onDebtDaysDateChange}
        scheduleUnit={vm.scheduleUnit}
        onScheduleUnitChange={vm.onScheduleUnitChange}
        scheduleCount={vm.scheduleCount}
        onScheduleCountChange={vm.onScheduleCountChange}
        onScheduleCountBlur={vm.onScheduleCountBlur}
        onSchedulePreset={vm.onSchedulePreset}
        dayInterval={vm.dayInterval}
        onDayIntervalChange={vm.onDayIntervalChange}
        onDayIntervalBlur={vm.onDayIntervalBlur}
        onDayIntervalPreset={vm.onDayIntervalPreset}
        debtSchedule={vm.debtSchedule}
        deferredDueDate={vm.deferredDueDate}
        deferredDueDateInputRef={vm.deferredDueDateInputRef}
        onOpenDeferredDueDatePicker={vm.openDeferredDueDatePicker}
        onFirstDueDateChange={vm.onFirstDueDateChange}
        totalDebt={vm.totalDebt}
        amountReceived={vm.amountReceived}
        amountReceivedInputRef={vm.amountReceivedInputRef}
        onAmountReceivedChange={vm.setAmountReceived}
        quickSelectAmounts={vm.quickSelectAmounts}
        onQuickSelect={vm.handleQuickSelect}
        change={vm.change}
        withoutCheck={vm.withoutCheck}
        onWithoutCheckChange={vm.handleWithoutCheckChange}
        onAcceptPayment={vm.handleAcceptPayment}
        onCancel={onBack}
        consultant={vm.consultant}
      />

      <PaymentPageModals
        showCustomerModal={vm.showCustomerModal}
        onCloseCustomerModal={() => vm.setShowCustomerModal(false)}
        onSelectCustomer={vm.handleCustomerSelect}
        customers={vm.customers}
        showSuccessModal={vm.showSuccessModal}
        onCloseSuccess={vm.handleCloseSuccess}
        onPrintReceipt={vm.handlePrintReceipt}
        printing={vm.printing}
        total={total}
        paymentAmounts={vm.paymentAmounts}
        successEnterBlockedUntil={vm.successEnterBlockedUntil}
        amountReceived={vm.amountReceived}
        change={vm.change}
        receiptData={vm.receiptData}
        alertModal={vm.alertModal}
        onCloseAlert={vm.closeAlert}
      />
    </div>
  );
};

export default PaymentPage;
