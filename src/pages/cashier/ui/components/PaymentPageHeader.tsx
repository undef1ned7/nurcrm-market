import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  total: number;
  onBack: () => void;
};

export function PaymentPageHeader({ total, onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div className="payment-page__header">
      <button className="payment-page__back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className="payment-page__title">{t("crm.cashier.payment.title")}</h1>
        <p className="payment-page__total">
          {t("crm.cashier.payment.total", { amount: total.toFixed(2) })}
        </p>
      </div>
    </div>
  );
}
