import { useTranslation } from "react-i18next";

export const NewDebtModal = ({
  open,
  fullName,
  setFullName,
  phone,
  setPhone,
  amount,
  setAmount,
  dueDate,
  setDueDate,
  formErr,
  savingNew,
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
        aria-labelledby="debt-new-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="debts-page__modal-title" id="debt-new-title">
          {t("crm.debts.newDebt")}
        </div>

        {formErr && (
          <div className="debts-page__alert debts-page__alert--danger">
            {formErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="nur-label" htmlFor="debt-new-name">
            {t("crm.debts.name")} *
          </label>
          <input
            id="debt-new-name"
            className="nur-input debts-page__modal-input"
            placeholder={`${t("crm.debts.name")} *`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
          <label className="nur-label" htmlFor="debt-new-phone">
            {t("crm.debts.phone")} *
          </label>
          <input
            id="debt-new-phone"
            className="nur-input debts-page__modal-input"
            placeholder={t("crm.debts.phoneUnique")}
            inputMode="numeric"
            pattern="\d*"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-new-amount">
            {t("crm.debts.debt")} *
          </label>
          <input
            id="debt-new-amount"
            className="nur-input debts-page__modal-input"
            placeholder={t("crm.debts.digitsOnly")}
            inputMode="numeric"
            pattern="\d*"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-new-due">
            {t("crm.debts.dueDate")}
          </label>
          <input
            id="debt-new-due"
            className="nur-input debts-page__modal-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            title={t("crm.debts.dueDateOptional")}
          />

          <div className="debts-page__modal-actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={onClose}
              disabled={savingNew}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="nur-btn nur-btn--primary"
              disabled={savingNew}
            >
              {savingNew ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
