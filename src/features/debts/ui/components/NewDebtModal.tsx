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
          Новый долг
        </div>

        {formErr && (
          <div className="debts-page__alert debts-page__alert--danger">
            {formErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="nur-label" htmlFor="debt-new-name">Имя *</label>
          <input
            id="debt-new-name"
            className="nur-input debts-page__modal-input"
            placeholder="Имя *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />
          <label className="nur-label" htmlFor="debt-new-phone">Телефон *</label>
          <input
            id="debt-new-phone"
            className="nur-input debts-page__modal-input"
            placeholder="Только цифры, уникальный"
            inputMode="numeric"
            pattern="\d*"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-new-amount">Сумма долга *</label>
          <input
            id="debt-new-amount"
            className="nur-input debts-page__modal-input"
            placeholder="Только цифры"
            inputMode="numeric"
            pattern="\d*"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-new-due">Дата возврата</label>
          <input
            id="debt-new-due"
            className="nur-input debts-page__modal-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            title="Дата возврата долга (необязательно)"
          />

          <div className="debts-page__modal-actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={onClose}
              disabled={savingNew}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="nur-btn nur-btn--primary"
              disabled={savingNew}
            >
              {savingNew ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
