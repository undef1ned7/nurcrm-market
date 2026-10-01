import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  skipDrawerOpen: boolean;
  onSkipDrawerOpenChange: (checked: boolean) => void;
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
  skipDrawerOpen,
  onSkipDrawerOpenChange,
  onAcceptPayment,
  onCancel,
  consultant,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="payment-page__content">
      <div className="payment-page__left">
        <div className="payment-page__section">
          <h3 className="payment-page__section-title">{t("crm.cashier.payment.methodSection")}</h3>
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
                  <div className="payment-page__method-label">{t(method.labelKey)}</div>
                  <div className="payment-page__method-description">
                    {t(method.descriptionKey)}
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
          <h3 className="payment-page__section-title">{t("crm.cashier.payment.customerSection")}</h3>
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
                    {t("crm.cashier.payment.changeCustomer")}
                  </button>
                </div>
                {selectedCustomer.phone && (
                  <div className="payment-page__customer-phone">
                    {selectedCustomer.phone}
                  </div>
                )}
                {customerDebt > 0 && (
                  <div className="payment-page__customer-debt">
                    {t("crm.cashier.payment.currentDebt", {
                      amount: formatMoneyRu(customerDebt),
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              className="payment-page__select-customer-btn"
              onClick={onSelectCustomerClick}
            >
              {t("crm.cashier.payment.selectCustomer")}
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
            <h3 className="payment-page__section-title">{t("crm.cashier.payment.bankSection")}</h3>
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
            <h3 className="payment-page__section-title">{t("crm.cashier.payment.onlineSection")}</h3>
            <PaymentPageBankGrid
              banks={PAYMENT_BANKS}
              selectedId={splitOnlineBank}
              onSelect={onSelectSplitOnlineBank}
              keyPrefix="online-"
              logoMode="split"
            />
            <label className="payment-page__split-field">
              <span>{t("crm.cashier.payment.onlineAmount")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="payment-page__amount-input"
                value={splitOnlineAmount}
                onChange={(e) => onSplitOnlineAmountChange(e.target.value)}
              />
            </label>
            <h3 className="payment-page__section-title">{t("crm.cashier.payment.cashSection")}</h3>
            <label className="payment-page__split-field">
              <span>{t("crm.cashier.payment.cashAmount")}</span>
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
              {t("crm.cashier.payment.splitTotal", {
                parts: (
                  (parseFloat(splitOnlineAmount) || 0) +
                  (parseFloat(splitTransferAmount) || 0)
                ).toFixed(2),
                total: total.toFixed(2),
              })}
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
              {t("crm.cashier.payment.receivedSection")}
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
                {t("crm.cashier.payment.quickSelect")}
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
                <span className="payment-page__change-label">{t("crm.cashier.payment.change")}</span>
                <span className="payment-page__change-value">
                  {change.toFixed(2)} {t("common.currencySom")}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="payment-page__actions">
          <div className="payment-page__action-options">
            <label className="flex items-center gap-2" htmlFor="withoutCheck">
              {t("crm.cashier.payment.withoutCheck")}
              <input
                id="withoutCheck"
                type="checkbox"
                checked={withoutCheck}
                onChange={(e) => onWithoutCheckChange(e.target.checked)}
              />
            </label>
            {!withoutCheck ? (
              <label className="flex items-center gap-2" htmlFor="skipDrawerOpen">
                {t("crm.cashier.payment.skipDrawer")}
                <input
                  id="skipDrawerOpen"
                  type="checkbox"
                  checked={skipDrawerOpen}
                  onChange={(e) => onSkipDrawerOpenChange(e.target.checked)}
                />
              </label>
            ) : null}
          </div>

          <button
            type="button"
            className="payment-page__accept-btn"
            onClick={onAcceptPayment}
          >
            {t("crm.cashier.payment.accept")}
          </button>
          <button className="payment-page__cancel-btn" onClick={onCancel}>
            {t("crm.cashier.payment.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
