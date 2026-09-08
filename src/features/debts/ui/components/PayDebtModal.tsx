import { useTranslation } from "react-i18next";
import { DEBT_PAYMENT_BANKS } from "../helpers";
import type { DebtPayMethod } from "../helpers";

export const PayDebtModal = ({
  open,
  payAmt,
  setPayAmt,
  payMethod,
  setPayMethod,
  payBank,
  setPayBank,
  payErr,
  savingPay,
  onClose,
  onSubmit,
}: {
  open: boolean;
  payAmt: string;
  setPayAmt: (v: string) => void;
  payMethod: DebtPayMethod;
  setPayMethod: (v: DebtPayMethod) => void;
  payBank: string;
  setPayBank: (v: string) => void;
  payErr: string;
  savingPay: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
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

          <span className="nur-label">{t("crm.debts.paymentMethod")}</span>
          <div className="debts-page__seg" role="group">
            <button
              type="button"
              className={`debts-page__seg-btn ${
                payMethod === "cash" ? "debts-page__seg-btn--active" : ""
              }`}
              aria-pressed={payMethod === "cash"}
              onClick={() => setPayMethod("cash")}
            >
              {t("crm.debts.methodCash")}
            </button>
            <button
              type="button"
              className={`debts-page__seg-btn ${
                payMethod === "transfer" ? "debts-page__seg-btn--active" : ""
              }`}
              aria-pressed={payMethod === "transfer"}
              onClick={() => setPayMethod("transfer")}
            >
              {t("crm.debts.methodTransfer")}
            </button>
          </div>

          {payMethod === "transfer" && (
            <>
              <label className="nur-label" htmlFor="debt-pay-bank">
                {t("crm.debts.selectBank")}
              </label>
              <select
                id="debt-pay-bank"
                className="nur-input debts-page__modal-input"
                value={payBank}
                onChange={(e) => setPayBank(e.target.value)}
              >
                {DEBT_PAYMENT_BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </>
          )}

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
