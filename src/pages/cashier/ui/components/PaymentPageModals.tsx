import CustomerModal from "./CustomerModal";
import SuccessPaymentModal from "./SuccessPaymentModal";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import type {
  AlertModalState,
  PaymentAmounts,
  ReceiptData,
} from "../paymentPage.types";

type Props = {
  showCustomerModal: boolean;
  onCloseCustomerModal: () => void;
  onSelectCustomer: (customer: any) => void;
  customers: any[];
  showSuccessModal: boolean;
  onCloseSuccess: () => void;
  onPrintReceipt: () => void;
  printing: boolean;
  total: number;
  paymentAmounts: PaymentAmounts;
  successEnterBlockedUntil: number;
  amountReceived: string | number;
  change: number;
  receiptData: ReceiptData;
  alertModal: AlertModalState;
  onCloseAlert: () => void;
};

export function PaymentPageModals({
  showCustomerModal,
  onCloseCustomerModal,
  onSelectCustomer,
  customers,
  showSuccessModal,
  onCloseSuccess,
  onPrintReceipt,
  printing,
  total,
  paymentAmounts,
  successEnterBlockedUntil,
  amountReceived,
  change,
  receiptData,
  alertModal,
  onCloseAlert,
}: Props) {
  return (
    <>
      {showCustomerModal && (
        <CustomerModal
          onClose={onCloseCustomerModal}
          onSelect={onSelectCustomer}
          customers={customers as any}
        />
      )}

      {showSuccessModal && (
        <SuccessPaymentModal
          open={showSuccessModal}
          onClose={onCloseSuccess}
          onPrint={onPrintReceipt}
          printing={printing}
          total={total}
          cashAmount={paymentAmounts.cash}
          blockEnterCloseUntil={successEnterBlockedUntil}
          cashlessAmount={paymentAmounts.cashless}
          deferredAmount={paymentAmounts.deferred}
          amountReceived={parseFloat(String(amountReceived)) || 0}
          change={change}
          saleId={receiptData?.saleId}
        />
      )}

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        okText="ОК"
        onClose={onCloseAlert}
        onConfirm={onCloseAlert}
      />
    </>
  );
}
