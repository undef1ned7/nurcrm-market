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
          Изменить долг
        </div>

        {editErr && (
          <div className="debts-page__alert debts-page__alert--danger">
            {editErr}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label className="nur-label" htmlFor="debt-edit-name">Имя *</label>
          <input
            id="debt-edit-name"
            className="nur-input debts-page__modal-input"
            placeholder="Имя *"
            value={eFullName}
            onChange={(e) => setEFullName(e.target.value)}
            autoFocus
          />
          <label className="nur-label" htmlFor="debt-edit-phone">Телефон *</label>
          <input
            id="debt-edit-phone"
            className="nur-input debts-page__modal-input"
            placeholder="Только цифры"
            inputMode="numeric"
            pattern="\d*"
            value={ePhone}
            onChange={(e) => setEPhone(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-edit-amount">Сумма долга *</label>
          <input
            id="debt-edit-amount"
            className="nur-input debts-page__modal-input"
            placeholder="Только цифры"
            inputMode="numeric"
            pattern="\d*"
            value={eAmount}
            onChange={(e) => setEAmount(e.target.value.replace(/\D/g, ""))}
          />
          <label className="nur-label" htmlFor="debt-edit-due">Дата возврата</label>
          <input
            id="debt-edit-due"
            className="nur-input debts-page__modal-input"
            type="date"
            value={eDueDate}
            onChange={(e) => setEDueDate(e.target.value)}
            title="Дата возврата долга (необязательно)"
          />

          <div className="debts-page__modal-actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={onClose}
              disabled={savingEdit}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="nur-btn nur-btn--primary"
              disabled={savingEdit}
            >
              {savingEdit ? "Сохранение…" : "Сохранить изменения"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
