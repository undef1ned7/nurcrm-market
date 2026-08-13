import { User } from "lucide-react";
import type {
  DebtSchedule,
  DebtScheduleUnit,
  DebtScheduleVersion,
} from "@entities/sale";
import { PaymentPageSummary } from "./PaymentPageSummary";
import { PAYMENT_BANKS } from "../paymentPage.banks";
import {
  PAYMENT_METHODS,
  KYRGYZSTAN_BILLS,
  formatMoneyRu,
} from "../paymentPage.utils";
import type {
  PaymentConsultantVm,
  PaymentCustomer,
  PaymentMethodId,
  PaymentSale,
} from "../paymentPage.types";
import { PaymentPageConsultant } from "./PaymentPageConsultant";
import { PaymentPageBankGrid } from "./PaymentPageBankGrid";
import { PaymentPageDebtSection } from "./PaymentPageDebtSection";

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
  debtScheduleVersion: DebtScheduleVersion;
  debtDays: number | "";
  onDebtDaysChange: (value: string) => void;
  onDebtDaysBlur: (value: string) => void;
  onDebtDaysDateChange: (isoDate: string) => void;
  scheduleUnit: DebtScheduleUnit;
  onScheduleUnitChange: (unit: DebtScheduleUnit) => void;
  scheduleCount: number | "";
  onScheduleCountChange: (value: string) => void;
  onScheduleCountBlur: (value: string) => void;
  onSchedulePreset: (count: number) => void;
  dayInterval: number | "";
  onDayIntervalChange: (value: string) => void;
  onDayIntervalBlur: (value: string) => void;
  onDayIntervalPreset: (interval: number) => void;
  debtSchedule: DebtSchedule | null;
  deferredDueDate: string;
  deferredDueDateInputRef: React.RefObject<HTMLInputElement>;
  onOpenDeferredDueDatePicker: () => void;
  onFirstDueDateChange: (isoDate: string) => void;
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
  consultant: PaymentConsultantVm;
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
  debtScheduleVersion,
  debtDays,
  onDebtDaysChange,
  onDebtDaysBlur,
  onDebtDaysDateChange,
  scheduleUnit,
  onScheduleUnitChange,
  scheduleCount,
  onScheduleCountChange,
  onScheduleCountBlur,
  onSchedulePreset,
  dayInterval,
  onDayIntervalChange,
  onDayIntervalBlur,
  onDayIntervalPreset,
  debtSchedule,
  deferredDueDate,
  deferredDueDateInputRef,
  onOpenDeferredDueDatePicker,
  onFirstDueDateChange,
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
  consultant,
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

        <PaymentPageConsultant
          specify={consultant.draft.specify}
          onSpecifyChange={consultant.handleSpecifyChange}
          consultantId={consultant.draft.consultantId}
          consultantName={consultant.draft.consultantName}
          onConsultantChange={consultant.handleConsultantChange}
          consultants={consultant.consultants}
          consultantsLoading={consultant.consultantsLoading}
          commissionEnabled={consultant.draft.commissionEnabled}
          onCommissionEnabledChange={consultant.handleCommissionEnabledChange}
          percent={consultant.draft.percent}
          onPercentChange={consultant.handlePercentChange}
          previewAmount={consultant.previewAmount}
        />
      </div>

      <div className="payment-page__right">
        <PaymentPageSummary sale={sale} total={total} />

        {paymentMethod === "cashless" && (
          <div className="payment-page__section">
            <h3 className="payment-page__section-title">ВЫБОР БАНКА</h3>
            <PaymentPageBankGrid
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
            <PaymentPageBankGrid
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
          <PaymentPageDebtSection
            total={total}
            totalDebt={totalDebt}
            deferredPrepaymentValue={deferredPrepaymentValue}
            deferredSaleDebtRemaining={deferredSaleDebtRemaining}
            deferredPrepaymentEnabled={deferredPrepaymentEnabled}
            onDeferredPrepaymentEnabledChange={onDeferredPrepaymentEnabledChange}
            deferredPrepaymentAmount={deferredPrepaymentAmount}
            onDeferredPrepaymentAmountChange={onDeferredPrepaymentAmountChange}
            deferredPrepaymentMethod={deferredPrepaymentMethod}
            onDeferredPrepaymentMethodChange={onDeferredPrepaymentMethodChange}
            deferredPrepaymentBank={deferredPrepaymentBank}
            onSelectDeferredPrepaymentBank={onSelectDeferredPrepaymentBank}
            version={debtScheduleVersion}
            debtDays={debtDays}
            onDebtDaysChange={onDebtDaysChange}
            onDebtDaysBlur={onDebtDaysBlur}
            onDebtDaysDateChange={onDebtDaysDateChange}
            scheduleUnit={scheduleUnit}
            onScheduleUnitChange={onScheduleUnitChange}
            scheduleCount={scheduleCount}
            onScheduleCountChange={onScheduleCountChange}
            onScheduleCountBlur={onScheduleCountBlur}
            onSchedulePreset={onSchedulePreset}
            dayInterval={dayInterval}
            onDayIntervalChange={onDayIntervalChange}
            onDayIntervalBlur={onDayIntervalBlur}
            onDayIntervalPreset={onDayIntervalPreset}
            debtSchedule={debtSchedule}
            deferredDueDate={deferredDueDate}
            deferredDueDateInputRef={deferredDueDateInputRef}
            onOpenDeferredDueDatePicker={onOpenDeferredDueDatePicker}
            onFirstDueDateChange={onFirstDueDateChange}
          />
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
