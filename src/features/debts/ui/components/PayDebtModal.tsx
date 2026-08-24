import { useTranslation } from "react-i18next";

export const PayDebtModal = ({
  open,
  payAmt,
  setPayAmt,
  payErr,
  savingPay,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="debts-page__overlay" onClick={onClose}>
      <div
        className="debts-page__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-pay-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="debts-page__modal-title" id="debt-pay-title">
          {t("crm.debts.payModalTitle")}
        </div>

        {payErr && (
          <div className="debts-page__alert debts-page__alert--danger">
            {payErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="nur-label" htmlFor="debt-pay-amt">
            {t("crm.debts.payAmount")}
          </label>
          <input
            id="debt-pay-amt"
            className="nur-input debts-page__modal-input"
            placeholder={t("crm.debts.digitsOnly")}
            inputMode="numeric"
            pattern="\d*"
            value={payAmt}
            onChange={(e) => setPayAmt(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <div className="debts-page__modal-actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={onClose}
              disabled={savingPay}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="nur-btn nur-btn--primary"
              disabled={savingPay}
            >
              {savingPay ? t("crm.debts.paying") : t("crm.debts.pay")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
