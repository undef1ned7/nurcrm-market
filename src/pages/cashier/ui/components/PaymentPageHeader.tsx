import { ArrowLeft } from "lucide-react";

type Props = {
  total: number;
  onBack: () => void;
};

export function PaymentPageHeader({ total, onBack }: Props) {
  return (
    <div className="payment-page__header">
      <button className="payment-page__back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className="payment-page__title">Оформление оплаты</h1>
        <p className="payment-page__total">Итого: {total.toFixed(2)} сом</p>
      </div>
    </div>
  );
}
