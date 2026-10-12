import { X, Check, Save } from "lucide-react";

export function CounterpartyPayDebtModal({
  summary,
  name,
  payDebtCreateAsPosted,
  setPayDebtCreateAsPosted,
  closePayDebtModal,
  handlePayDebtSubmit,
  payDebtError,
  payDebtForm,
  handlePayDebtFormChange,
  cashRegisters,
  paymentCategories,
  payDebtSubmitting,
}) {
  return (
              <div
                className="money-documents-page__modal-overlay"
                onClick={closePayDebtModal}
                role="presentation"
              >
                <div
                  className="money-documents-page__modal money-documents-page__modal--operation"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pay-debt-modal-title"
                >
                  <div className="money-documents-page__modal-header money-documents-page__modal-header--operation">
                    <h2
                      id="pay-debt-modal-title"
                      className="money-documents-page__modal-title money-documents-page__modal-title--operation"
                    >
                      {summary.debtBalance > 0
                        ? "Приход (оплата долга)"
                        : "Расход (оплата долга)"}
                    </h2>
                    <button
                      type="button"
                      className="money-documents-page__modal-close money-documents-page__modal-close--round"
                      onClick={closePayDebtModal}
                      aria-label="Закрыть"
                    >
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="money-documents-page__modal-status">
                    <div className="money-documents-page__modal-status-left">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={payDebtCreateAsPosted}
                        aria-label={
                          payDebtCreateAsPosted
                            ? "Документ проведён"
                            : "Черновик"
                        }
                        className={`money-documents-page__status-toggle ${
                          payDebtCreateAsPosted
                            ? "money-documents-page__status-toggle--on"
                            : ""
                        }`}
                        onClick={() => setPayDebtCreateAsPosted((v) => !v)}
                      >
                        <span className="money-documents-page__status-toggle-slider">
                          {payDebtCreateAsPosted && (
                            <Check size={14} strokeWidth={3} />
                          )}
                        </span>
                      </button>
                      <span className="money-documents-page__modal-status-text">
                        {payDebtCreateAsPosted
                          ? "Документ проведён"
                          : "Черновик"}
                      </span>
                    </div>
                    <span className="money-documents-page__modal-status-date">
                      {new Date().toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}
                      ,{" "}
                      {new Date().toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <form
                    className="money-documents-page__form"
                    onSubmit={handlePayDebtSubmit}
                  >
                    {payDebtError && (
                      <div className="money-documents-page__form-error">
                        {payDebtError}
                      </div>
                    )}
                    <div className="money-documents-page__field">
                      <label htmlFor="pay-debt-cash-register">Касса *</label>
                      <select
                        id="pay-debt-cash-register"
                        value={payDebtForm.cash_register}
                        onChange={(e) =>
                          handlePayDebtFormChange(
                            "cash_register",
                            e.target.value,
                          )
                        }
                        required
                      >
                        <option value="">выберите</option>
                        {cashRegisters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name ?? c.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="money-documents-page__field">
                      <label>Контрагент</label>
                      <div className="counterparty-detail-page__modal-counterparty">
                        {name}
                      </div>
                    </div>
                    <div className="money-documents-page__field">
                      <label htmlFor="pay-debt-category">
                        Категория платежа *
                      </label>
                      <select
                        id="pay-debt-category"
                        value={payDebtForm.payment_category}
                        onChange={(e) =>
                          handlePayDebtFormChange(
                            "payment_category",
                            e.target.value,
                          )
                        }
                        required
                      >
                        <option value="">введите</option>
                        {paymentCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.title ?? cat.name ?? cat.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="money-documents-page__field">
                      <label htmlFor="pay-debt-amount">Сумма, сом *</label>
                      <div className="money-documents-page__amount-wrap">
                        <span className="money-documents-page__amount-prefix">
                          сом
                        </span>
                        <input
                          id="pay-debt-amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={payDebtForm.amount}
                          onChange={(e) =>
                            handlePayDebtFormChange("amount", e.target.value)
                          }
                          required
                          className="money-documents-page__amount-input"
                        />
                      </div>
                    </div>
                    <div className="money-documents-page__field">
                      <label htmlFor="pay-debt-comment">Комментарий</label>
                      <textarea
                        id="pay-debt-comment"
                        rows={3}
                        placeholder="Добавьте комментарий..."
                        value={payDebtForm.comment}
                        onChange={(e) =>
                          handlePayDebtFormChange("comment", e.target.value)
                        }
                      />
                    </div>
                    <div className="money-documents-page__modal-actions money-documents-page__modal-actions--operation">
                      <button
                        type="submit"
                        className="money-documents-page__btn-save"
                        disabled={payDebtSubmitting}
                      >
                        <Save size={20} />
                        {payDebtSubmitting ? "Сохранение…" : "Сохранить"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
  );
}
