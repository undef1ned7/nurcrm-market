import { useTranslation } from "react-i18next";

export const EditDebtModal = ({
  open,
  eFullName,
  setEFullName,
  ePhone,
  setEPhone,
  eAmount,
  setEAmount,
  eDueDate,
  setEDueDate,
  editErr,
  savingEdit,
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
        aria-labelledby="debt-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="debts-page__modal-title" id="debt-edit-title">
          {t("crm.debts.editDebt")}
        </div>

        {editErr && (
          <div className="debts-page__alert debts-page__alert--danger">
            {editErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="nur-label" htmlFor="debt-edit-name">
            {t("crm.debts.name")} *
          </label>
          <input
            id="debt-edit-name"
            className="nur-input debts-page__modal-input"
            placeholder={`${t("crm.debts.name")} *`}
            value={eFullName}
            onChange={(e) => setEFullName(e.target.value)}
            autoFocus
          />
          <label className="nur-label" htmlFor="debt-edit-phone">
            {t("crm.debts.phone")} *
          </label>
          <input
            id="debt-edit-phone"
            className="nur-input debts-page__modal-input"
            placeholder={t("crm.debts.digitsOnly")}
            inputMode="numeric"
            pattern="\d*"
            value={ePhone}
            onChange={(e) => setEPhone(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-edit-amount">
            {t("crm.debts.debt")} *
          </label>
          <input
            id="debt-edit-amount"
            className="nur-input debts-page__modal-input"
            placeholder={t("crm.debts.digitsOnly")}
            inputMode="numeric"
            pattern="\d*"
            value={eAmount}
            onChange={(e) => setEAmount(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-edit-due">
            {t("crm.debts.dueDate")}
          </label>
          <input
            id="debt-edit-due"
            className="nur-input debts-page__modal-input"
            type="date"
            value={eDueDate}
            onChange={(e) => setEDueDate(e.target.value)}
            title={t("crm.debts.dueDateOptional")}
          />

          <div className="debts-page__modal-actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={onClose}
              disabled={savingEdit}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="nur-btn nur-btn--primary"
              disabled={savingEdit}
            >
              {savingEdit ? t("common.saving") : t("crm.debts.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
