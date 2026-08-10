import { useUser } from "@entities/user";
import { DEAL_STATUS_RU } from "../../sellHelpers";

/* =========================
   2) PaymentBlock
   ========================= */
export function PaymentBlock({
  sectorName: _sectorName,
  debt,
  setDebt,
  phone,
  setPhone,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  dueDate,
  setDueDate,
}) {
  const { company } = useUser();
  return (
    <>
      <div className="add-modal__section">
        <label>Тип оплаты</label>
        <select
          className="add-modal__input"
          value={debt}
          onChange={(e) => setDebt(e.target.value)}
        >
          <option value="">-- Выберите тип оплаты --</option>
          {DEAL_STATUS_RU.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {debt === "Предоплата" && (
        <>
          <div className="add-modal__section">
            <label>Сумма предоплаты *</label>
            <input
              className="add-modal__input"
              placeholder="Введите сумму предоплаты"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="add-modal__section">
            <label>Срок долга *</label>
            <input
              className="add-modal__input"
              placeholder="Например, 6"
              min={1}
              step={1}
              value={debtMonths}
              onChange={(e) => setDebtMonths(e.target.value)}
            />
          </div>
          {company.subscription_plan.name === "Старт" && (
            <>
              <div className="add-modal__section">
                <label>Телефон *</label>
                <input
                  className="add-modal__input"
                  placeholder="Например, +996555555555"
                  min={1}
                  step={1}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="add-modal__section">
                <label>Дата возврата *</label>
                <input
                  className="add-modal__input"
                  min={1}
                  step={1}
                  value={dueDate}
                  type="date"
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      )}

      {debt === "Долги" && (
        <>
          <div className="add-modal__section">
            <label>Срок долга *</label>
            <input
              className="add-modal__input"
              placeholder="Например, 6"
              min={1}
              step={1}
              value={debtMonths}
              onChange={(e) => setDebtMonths(e.target.value)}
            />
          </div>
          {company.subscription_plan.name === "Старт" && (
            <>
              <div className="add-modal__section">
                <label>Телефон *</label>
                <input
                  className="add-modal__input"
                  placeholder="Например, +996555555555"
                  min={1}
                  step={1}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="add-modal__section">
                <label>Дата возврата *</label>
                <input
                  className="add-modal__input"
                  min={1}
                  step={1}
                  value={dueDate}
                  type="date"
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
