import { Calendar, User } from "lucide-react";
import { PaymentPageSummary } from "./PaymentPageSummary";
import { PAYMENT_BANKS } from "../paymentPage.banks";
import {
  PAYMENT_METHODS,
  KYRGYZSTAN_BILLS,
  calcDaysUntilIsoDate,
  debtDaysLabel,
  formatMoneyRu,
  getTodayIsoDate,
} from "../paymentPage.utils";
import type {
  PaymentBank,
  PaymentCustomer,
  PaymentMethodId,
  PaymentSale,
} from "../paymentPage.types";

type BankGridProps = {
  banks: PaymentBank[];
  selectedId: string;
  onSelect: (id: string) => void;
  keyPrefix?: string;
  activeClassName?: string;
  /** cashless: svg in div; deferred: raw svg; split: string logos only (else name) */
  logoMode?: "cashless" | "deferred" | "split";
};

function PaymentBankGrid({
  banks,
  selectedId,
  onSelect,
  keyPrefix = "",
  activeClassName = "payment-page__bank--active",
  logoMode = "cashless",
}: BankGridProps) {
  return (
    <div className="payment-page__banks">
      {banks.map((bank) => {
        let logoContent;
        if (typeof bank.logo === "string") {
          logoContent = (
            <img
              src={bank.logo}
              alt={bank.name}
              className="payment-page__bank-logo"
            />
          );
        } else if (bank.logo && logoMode === "cashless") {
          logoContent = (
            <div className="payment-page__bank-svg">{bank.logo}</div>
          );
        } else if (bank.logo && logoMode === "deferred") {
          logoContent = bank.logo;
        } else {
          logoContent = (
            <div className="payment-page__bank-name">{bank.name}</div>
          );
        }

        return (
          <button
            key={`${keyPrefix}${bank.id}`}
            type="button"
            className={`payment-page__bank ${
              selectedId === bank.id ? activeClassName : ""
            }`}
            onClick={() => onSelect(bank.id)}
            title={bank.name}
          >
            <div className="payment-page__bank-content">{logoContent}</div>
            {selectedId === bank.id && (
              <div className="payment-page__bank-check">✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

type Props = {
  paymentMethod: PaymentMethodId | string;
  onPaymentMethodChange: (id: string) => void;
  selectedCustomer: PaymentCustomer;
  customerDebt: number;
  onSelectCustomerClick: () => void;
  sale?: PaymentSale;
  total: number;
  selectedBank: string;
  onSelectBank: (id: string) => void;
  splitOnlineBank: string;
  onSelectSplitOnlineBank: (id: string) => void;
  splitOnlineAmount: string;
  splitTransferAmount: string;
  onSplitOnlineAmountChange: (value: string) => void;
  onSplitTransferAmountChange: (value: string) => void;
  deferredPrepaymentValue: number;
  deferredSaleDebtRemaining: number;
  deferredPrepaymentEnabled: boolean;
  onDeferredPrepaymentEnabledChange: (checked: boolean) => void;
  deferredPrepaymentAmount: string;
  onDeferredPrepaymentAmountChange: (value: string) => void;
  deferredPrepaymentMethod: string;
  onDeferredPrepaymentMethodChange: (method: string) => void;
  deferredPrepaymentBank: string;
  onSelectDeferredPrepaymentBank: (id: string) => void;
  debtDays: number | string;
  deferredDueDate: string;
  deferredDueDateInputRef: React.RefObject<HTMLInputElement | null>;
  onDebtDaysChange: (value: string) => void;
  onDebtDaysBlur: (value: string) => void;
  onOpenDeferredDueDatePicker: () => void;
  onDeferredDueDateChange: (isoDate: string) => void;
  totalDebt: number;
  amountReceived: string;
  amountReceivedInputRef: React.RefObject<HTMLInputElement | null>;
  onAmountReceivedChange: (value: string) => void;
  quickSelectAmounts: number[];
  onQuickSelect: (amount: number) => void;
  change: number;
  withoutCheck: boolean;
  onWithoutCheckChange: (checked: boolean) => void;
  onAcceptPayment: () => void;
  onCancel: () => void;
};

export function PaymentPageForm({
  paymentMethod,
  onPaymentMethodChange,
  selectedCustomer,
  customerDebt,
  onSelectCustomerClick,
  sale,
  total,
  selectedBank,
  onSelectBank,
  splitOnlineBank,
  onSelectSplitOnlineBank,
  splitOnlineAmount,
  splitTransferAmount,
  onSplitOnlineAmountChange,
  onSplitTransferAmountChange,
  deferredPrepaymentValue,
  deferredSaleDebtRemaining,
  deferredPrepaymentEnabled,
  onDeferredPrepaymentEnabledChange,
  deferredPrepaymentAmount,
  onDeferredPrepaymentAmountChange,
  deferredPrepaymentMethod,
  onDeferredPrepaymentMethodChange,
  deferredPrepaymentBank,
  onSelectDeferredPrepaymentBank,
  debtDays,
  deferredDueDate,
  deferredDueDateInputRef,
  onDebtDaysChange,
  onDebtDaysBlur,
  onOpenDeferredDueDatePicker,
  onDeferredDueDateChange,
  totalDebt,
  amountReceived,
  amountReceivedInputRef,
  onAmountReceivedChange,
  quickSelectAmounts,
  onQuickSelect,
  change,
  withoutCheck,
  onWithoutCheckChange,
  onAcceptPayment,
  onCancel,
}: Props) {
  return (
    <div className="payment-page__content">
      <div className="payment-page__left">
        <div className="payment-page__section">
          <h3 className="payment-page__section-title">СПОСОБ ОПЛАТЫ</h3>
          <div className="payment-page__methods">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                className={`payment-page__method ${
                  paymentMethod === method.id
                    ? "payment-page__method--active"
                    : ""
                }`}
                onClick={() => onPaymentMethodChange(method.id)}
              >
                <div className="payment-page__method-content">
                  <div className="payment-page__method-label">{method.label}</div>
                  <div className="payment-page__method-description">
                    {method.description}
                  </div>
                </div>
                {paymentMethod === method.id && (
                  <div className="payment-page__method-check">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="payment-page__section">
          <h3 className="payment-page__section-title">ПОКУПАТЕЛЬ</h3>
          {selectedCustomer ? (
            <div className="payment-page__customer">
              <div className="payment-page__customer-avatar">
                <User size={24} />
              </div>
              <div className="payment-page__customer-info">
                <div className="payment-page__customer-name">
                  {selectedCustomer.full_name || selectedCustomer.name}
                  <button
                    className="payment-page__customer-change"
                    onClick={onSelectCustomerClick}
                  >
                    изменить
                  </button>
                </div>
                {selectedCustomer.phone && (
                  <div className="payment-page__customer-phone">
                    {selectedCustomer.phone}
                  </div>
                )}
                {customerDebt > 0 && (
                  <div className="payment-page__customer-debt">
                    Текущий долг: {formatMoneyRu(customerDebt)} сом
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              className="payment-page__select-customer-btn"
              onClick={onSelectCustomerClick}
            >
              Выбрать покупателя
            </button>
          )}
        </div>
      </div>

      <div className="payment-page__right">
        <PaymentPageSummary sale={sale} total={total} />

        {paymentMethod === "cashless" && (
          <div className="payment-page__section">
            <h3 className="payment-page__section-title">ВЫБОР БАНКА</h3>
            <PaymentBankGrid
              banks={PAYMENT_BANKS}
              selectedId={selectedBank}
              onSelect={onSelectBank}
              logoMode="cashless"
            />
          </div>
        )}

        {paymentMethod === "split" && (
          <div className="payment-page__section payment-page__split">
            <h3 className="payment-page__section-title">ОНЛАЙН-ОПЛАТА</h3>
            <PaymentBankGrid
              banks={PAYMENT_BANKS}
              selectedId={splitOnlineBank}
              onSelect={onSelectSplitOnlineBank}
              keyPrefix="online-"
              logoMode="split"
            />
            <label className="payment-page__split-field">
              <span>Сумма онлайн (сом)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="payment-page__amount-input"
                value={splitOnlineAmount}
                onChange={(e) => onSplitOnlineAmountChange(e.target.value)}
              />
            </label>
            <h3 className="payment-page__section-title">НАЛИЧНЫЕ</h3>
            <label className="payment-page__split-field">
              <span>Сумма наличными (сом)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="payment-page__amount-input"
                value={splitTransferAmount}
                onChange={(e) => onSplitTransferAmountChange(e.target.value)}
              />
            </label>
            <p className="payment-page__split-total">
              Итого частей:{" "}
              {(
                (parseFloat(splitOnlineAmount) || 0) +
                (parseFloat(splitTransferAmount) || 0)
              ).toFixed(2)}{" "}
              / {total.toFixed(2)} сом
            </p>
          </div>
        )}

        {paymentMethod === "deferred" ? (
          <div className="payment-page__debt-section">
            <div className="payment-page__debt-amount">
              <div className="payment-page__debt-label">
                {deferredPrepaymentValue > 0 ? "ОСТАТОК В ДОЛГ" : "СУММА ДОЛГА"}
              </div>
              <div className="payment-page__debt-value">
                {deferredSaleDebtRemaining.toFixed(2)}
              </div>
              {deferredPrepaymentValue > 0 && (
                <p className="payment-page__debt-hint">
                  Сумма заказа {total.toFixed(2)} сом · предоплата{" "}
                  {deferredPrepaymentValue.toFixed(2)} сом
                </p>
              )}
            </div>

            <label className="payment-page__deferred-prepay-toggle">
              <input
                type="checkbox"
                checked={deferredPrepaymentEnabled}
                onChange={(e) => {
                  onDeferredPrepaymentEnabledChange(e.target.checked);
                }}
              />
              <span>Предоплата при отсрочке</span>
            </label>

            {deferredPrepaymentEnabled && (
              <div className="payment-page__deferred-prepay">
                <div className="payment-page__deferred-prepay-field">
                  <label className="payment-page__debt-days-label">
                    Сумма предоплаты (сом)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={total}
                    step="0.01"
                    className="payment-page__debt-days-input"
                    value={deferredPrepaymentAmount}
                    onChange={(e) =>
                      onDeferredPrepaymentAmountChange(e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="payment-page__deferred-prepay-field">
                  <span className="payment-page__debt-days-label">
                    Способ предоплаты
                  </span>
                  <div className="payment-page__deferred-prepay-method-row">
                    <button
                      type="button"
                      className={`payment-page__deferred-prepay-method${
                        deferredPrepaymentMethod === "cash"
                          ? " payment-page__deferred-prepay-method--active"
                          : ""
                      }`}
                      onClick={() => onDeferredPrepaymentMethodChange("cash")}
                    >
                      Наличные
                    </button>
                    <button
                      type="button"
                      className={`payment-page__deferred-prepay-method${
                        deferredPrepaymentMethod === "cashless"
                          ? " payment-page__deferred-prepay-method--active"
                          : ""
                      }`}
                      onClick={() =>
                        onDeferredPrepaymentMethodChange("cashless")
                      }
                    >
                      Безналичные
                    </button>
                  </div>
                </div>
                {deferredPrepaymentMethod === "cashless" && (
                  <div className="payment-page__deferred-prepay-field">
                    <p className="payment-page__debt-days-label">
                      Банк предоплаты
                    </p>
                    <PaymentBankGrid
                      banks={PAYMENT_BANKS}
                      selectedId={deferredPrepaymentBank}
                      onSelect={onSelectDeferredPrepaymentBank}
                      activeClassName="payment-page__bank--selected"
                      logoMode="deferred"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="payment-page__debt-days">
              <label
                className="payment-page__debt-days-label"
                htmlFor="deferred-debt-days"
              >
                Срок рассрочки (дней):
              </label>
              <div className="payment-page__debt-days-row">
                <input
                  id="deferred-debt-days"
                  type="text"
                  className="payment-page__debt-days-input"
                  value={debtDays}
                  onChange={(e) => onDebtDaysChange(e.target.value)}
                  onBlur={(e) => onDebtDaysBlur(e.target.value)}
                  min="1"
                  step="1"
                  inputMode="numeric"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="payment-page__debt-days-calendar-btn"
                  onClick={onOpenDeferredDueDatePicker}
                  title="Выбрать дату погашения"
                  aria-label="Выбрать дату погашения в календаре"
                >
                  <Calendar size={20} strokeWidth={2} />
                </button>
                <input
                  ref={deferredDueDateInputRef as any}
                  type="date"
                  className="payment-page__debt-date-input"
                  value={deferredDueDate}
                  min={getTodayIsoDate()}
                  onChange={(e) => onDeferredDueDateChange(e.target.value)}
                  tabIndex={-1}
                  aria-hidden
                />
              </div>
              <p className="payment-page__debt-days-hint">
                Дата погашения:{" "}
                <strong>
                  {deferredDueDate
                    ? new Date(
                        `${deferredDueDate}T12:00:00`,
                      ).toLocaleDateString("ru-RU")
                    : "—"}
                </strong>
                {" · "}
                {typeof debtDays === "number"
                  ? debtDays
                  : calcDaysUntilIsoDate(deferredDueDate)}{" "}
                {debtDaysLabel(debtDays, deferredDueDate)} от сегодня
              </p>
            </div>
            <div className="payment-page__total-debt">
              <span>ОБЩИЙ ДОЛГ КЛИЕНТА</span>
              <span className="payment-page__total-debt-amount">
                {formatMoneyRu(totalDebt)} сом
              </span>
            </div>
          </div>
        ) : paymentMethod === "split" ? null : (
          <div className="payment-page__amount-section">
            <h3 className="payment-page__section-title">
              ПОЛУЧЕНО ОТ ПОКУПАТЕЛЯ
            </h3>
            <div className="payment-page__amount-input-wrapper">
              <input
                ref={amountReceivedInputRef as any}
                type="text"
                className="payment-page__amount-input"
                value={amountReceived}
                onChange={(e) => onAmountReceivedChange(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="payment-page__quick-select">
              <div className="payment-page__quick-select-label">
                БЫСТРЫЙ ВЫБОР
              </div>
              <div className="payment-page__quick-select-buttons">
                {quickSelectAmounts.length > 0
                  ? quickSelectAmounts.map((amount) => (
                      <button
                        key={amount}
                        className="payment-page__quick-select-btn"
                        onClick={() => onQuickSelect(amount)}
                      >
                        {amount.toFixed(0)}
                      </button>
                    ))
                  : KYRGYZSTAN_BILLS.slice(-3).map((amount) => (
                      <button
                        key={amount}
                        className="payment-page__quick-select-btn"
                        onClick={() => onQuickSelect(amount)}
                      >
                        {amount.toFixed(0)}
                      </button>
                    ))}
              </div>
            </div>

            {change > 0 && (
              <div className="payment-page__change">
                <span className="payment-page__change-label">СДАЧА</span>
                <span className="payment-page__change-value">
                  {change.toFixed(2)} сом
                </span>
              </div>
            )}
          </div>
        )}

        <div className="payment-page__actions">
          <label className="flex items-center gap-2" htmlFor="withoutCheck">
            Без чека
            <input
              id="withoutCheck"
              type="checkbox"
              checked={withoutCheck}
              onChange={(e) => onWithoutCheckChange(e.target.checked)}
            />
          </label>
          <button
            type="button"
            className="payment-page__accept-btn"
            onClick={onAcceptPayment}
          >
            ПРИНЯТЬ ОПЛАТУ [ENTER]
          </button>
          <button className="payment-page__cancel-btn" onClick={onCancel}>
            Отмена [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}
