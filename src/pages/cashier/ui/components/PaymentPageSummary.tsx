import { formatMoneyRu } from "../paymentPage.utils";
import type { PaymentSale } from "../paymentPage.types";

type Props = {
  sale?: PaymentSale;
  total: number;
};

export function PaymentPageSummary({ sale, total }: Props) {
  const discount = parseFloat(String(sale?.order_discount_total ?? 0)) || 0;
  const tax = parseFloat(String(sale?.tax_total ?? 0)) || 0;

  return (
    <div className="payment-page__summary">
      {discount > 0 && (
        <div className="payment-page__summary-item">
          <span className="payment-page__summary-label">СКИДКА</span>
          <span className="payment-page__summary-value payment-page__summary-value--discount">
            - {formatMoneyRu(discount)} сом
          </span>
        </div>
      )}
      {tax > 0 && (
        <div className="payment-page__summary-item">
          <span className="payment-page__summary-label">НАЛОГ</span>
          <span className="payment-page__summary-value">
            {formatMoneyRu(tax)} сом
          </span>
        </div>
      )}
      <div className="payment-page__summary-item payment-page__summary-item--total">
        <span className="payment-page__summary-label">ИТОГО</span>
        <span className="payment-page__summary-value payment-page__summary-value--total">
          {formatMoneyRu(total)} сом
        </span>
      </div>
    </div>
  );
}
