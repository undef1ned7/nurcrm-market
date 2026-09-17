import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import {
  DAY_INTERVAL_PRESETS,
  DAY_SCHEDULE_PRESETS,
  MAX_DAY_INTERVAL,
  MAX_MONTH_INTERVAL,
  MONTH_INTERVAL_PRESETS,
  MONTH_SCHEDULE_PRESETS,
  dayIntervalLabel,
  dayIntervalPresetLabel,
  formatIsoDateRu,
  maxInstallmentsForUnit,
  monthIntervalLabel,
  monthIntervalPresetLabel,
  paymentCountLabel,
  scheduleCountLabel,
  todayIsoDate,
  type DebtSchedule,
  type DebtScheduleUnit,
  type DebtScheduleVersion,
} from "@entities/sale";
import { PAYMENT_BANKS } from "../paymentPage.banks";
import {
  calcDaysUntilIsoDate,
  debtDaysLabel,
  formatMoneyRu,
  getTodayIsoDate,
} from "../paymentPage.utils";
import { PaymentPageBankGrid } from "./PaymentPageBankGrid";

type Props = {
  total: number;
  totalDebt: number;
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
  version: DebtScheduleVersion;
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
  deferredDueDateInputRef: RefObject<HTMLInputElement>;
  onOpenDeferredDueDatePicker: () => void;
  onFirstDueDateChange: (isoDate: string) => void;
};

export function PaymentPageDebtSection({
  total,
  totalDebt,
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
  version,
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
}: Props) {
  const { t } = useTranslation();
  const presets =
    scheduleUnit === "month" ? MONTH_SCHEDULE_PRESETS : DAY_SCHEDULE_PRESETS;
  const intervalPresets =
    scheduleUnit === "month" ? MONTH_INTERVAL_PRESETS : DAY_INTERVAL_PRESETS;
  const previewRows = debtSchedule?.installments ?? [];
  const intervalMax =
    scheduleUnit === "month" ? MAX_MONTH_INTERVAL : MAX_DAY_INTERVAL;

  return (
    <div className="payment-page__debt-section">
      <div className="payment-page__debt-amount">
        <div className="payment-page__debt-label">
          {deferredPrepaymentValue > 0
            ? t("crm.cashier.debtSection.remainderLabel")
            : t("crm.cashier.debtSection.debtLabel")}
        </div>
        <div className="payment-page__debt-value">
          {deferredSaleDebtRemaining.toFixed(2)}
        </div>
        {deferredPrepaymentValue > 0 && (
          <p className="payment-page__debt-hint">
            {t("crm.cashier.debtSection.orderPrepaymentHint", {
              total: total.toFixed(2),
              prepayment: deferredPrepaymentValue.toFixed(2),
            })}
          </p>
        )}
      </div>

      {version === "v1" ? (
        <>
          <label className="payment-page__deferred-prepay-toggle">
            <input
              type="checkbox"
              checked={deferredPrepaymentEnabled}
              onChange={(e) => {
                onDeferredPrepaymentEnabledChange(e.target.checked);
              }}
            />
            <span>{t("crm.cashier.debtSection.prepaymentAtDeferredToggle")}</span>
          </label>

          {deferredPrepaymentEnabled && (
            <div className="payment-page__deferred-prepay">
              <div className="payment-page__deferred-prepay-field">
                <label className="payment-page__debt-days-label">
                  {t("crm.cashier.debtSection.prepaymentAmountLabel")}
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
                  {t("crm.cashier.debtSection.prepaymentMethodLabel")}
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
                    {t("crm.cashier.debtSection.cash")}
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
                    {t("crm.cashier.debtSection.cashless")}
                  </button>
                </div>
              </div>
              {deferredPrepaymentMethod === "cashless" && (
                <div className="payment-page__deferred-prepay-field">
                  <p className="payment-page__debt-days-label">
                    {t("crm.cashier.debtSection.prepaymentBankLabel")}
                  </p>
                  <PaymentPageBankGrid
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
              {t("crm.cashier.debtSection.deferredTermDaysLabel")}
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
                inputMode="numeric"
                autoComplete="off"
              />
              <button
                type="button"
                className="payment-page__debt-days-calendar-btn"
                onClick={onOpenDeferredDueDatePicker}
                title={t("crm.cashier.debtSection.selectDueDate")}
                aria-label={t("crm.cashier.debtSection.selectDueDateAria")}
              >
                <Calendar size={20} strokeWidth={2} />
              </button>
              <input
                ref={deferredDueDateInputRef}
                type="date"
                className="payment-page__debt-date-input"
                value={deferredDueDate}
                min={getTodayIsoDate()}
                onChange={(e) => onDebtDaysDateChange(e.target.value)}
                tabIndex={-1}
                aria-hidden
              />
            </div>
            <p className="payment-page__debt-days-hint">
              {t("crm.cashier.debtSection.dueDateLabel")}{" "}
              <strong>{formatIsoDateRu(deferredDueDate)}</strong>
              {" · "}
              {typeof debtDays === "number"
                ? debtDays
                : calcDaysUntilIsoDate(deferredDueDate)}{" "}
              {debtDaysLabel(debtDays, deferredDueDate)}{" "}
              {t("crm.cashier.debtSection.fromToday")}
            </p>
          </div>
        </>
      ) : (
      <>
      <div className="payment-page__debt-step">
        <div className="payment-page__debt-step-title">
          {t("crm.cashier.debtSection.step1Title")}
        </div>
        <p className="payment-page__debt-step-hint">
          {t("crm.cashier.debtSection.optional")}
        </p>
        <label className="payment-page__deferred-prepay-toggle">
          <input
            type="checkbox"
            checked={deferredPrepaymentEnabled}
            onChange={(e) => {
              onDeferredPrepaymentEnabledChange(e.target.checked);
            }}
          />
          <span>{t("crm.cashier.debtSection.acceptPrepaymentNow")}</span>
        </label>

        {deferredPrepaymentEnabled && (
          <div className="payment-page__deferred-prepay">
            <div className="payment-page__deferred-prepay-field">
              <label className="payment-page__debt-days-label">
                {t("crm.cashier.debtSection.prepaymentAmountLabel")}
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
                {t("crm.cashier.debtSection.prepaymentMethodLabel")}
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
                  {t("crm.cashier.debtSection.cash")}
                </button>
                <button
                  type="button"
                  className={`payment-page__deferred-prepay-method${
                    deferredPrepaymentMethod === "cashless"
                      ? " payment-page__deferred-prepay-method--active"
                      : ""
                  }`}
                  onClick={() => onDeferredPrepaymentMethodChange("cashless")}
                >
                  {t("crm.cashier.debtSection.cashless")}
                </button>
              </div>
            </div>
            {deferredPrepaymentMethod === "cashless" && (
              <div className="payment-page__deferred-prepay-field">
                <p className="payment-page__debt-days-label">
                  {t("crm.cashier.debtSection.prepaymentBankLabel")}
                </p>
                <PaymentPageBankGrid
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
      </div>

      <div className="payment-page__debt-step">
        <div className="payment-page__debt-step-title">
          {t("crm.cashier.debtSection.step2Title")}
        </div>
        <p className="payment-page__debt-step-hint">
          {t("crm.cashier.debtSection.step2Hint")}
        </p>

        <div className="payment-page__deferred-prepay-method-row payment-page__schedule-unit-row">
          <button
            type="button"
            className={`payment-page__deferred-prepay-method${
              scheduleUnit === "day"
                ? " payment-page__deferred-prepay-method--active"
                : ""
            }`}
            onClick={() => onScheduleUnitChange("day")}
          >
            {t("crm.cashier.debtSection.byDays")}
          </button>
          <button
            type="button"
            className={`payment-page__deferred-prepay-method${
              scheduleUnit === "month"
                ? " payment-page__deferred-prepay-method--active"
                : ""
            }`}
            onClick={() => onScheduleUnitChange("month")}
          >
            {t("crm.cashier.debtSection.byMonths")}
          </button>
        </div>

        <div className="payment-page__debt-days">
          <label
            className="payment-page__debt-days-label"
            htmlFor="deferred-schedule-count"
          >
            {scheduleUnit === "month"
              ? t("crm.cashier.debtSection.monthsCountLabel")
              : t("crm.cashier.debtSection.paymentsCountLabel")}
          </label>
          <input
            id="deferred-schedule-count"
            type="text"
            className="payment-page__debt-days-input"
            value={scheduleCount}
            onChange={(e) => onScheduleCountChange(e.target.value)}
            onBlur={(e) => onScheduleCountBlur(e.target.value)}
            min="1"
            max={maxInstallmentsForUnit(scheduleUnit)}
            inputMode="numeric"
            autoComplete="off"
          />
          <div className="payment-page__schedule-presets">
            {presets.map((count) => (
              <button
                key={`${scheduleUnit}-${count}`}
                type="button"
                className={`payment-page__schedule-preset${
                  scheduleCount === count
                    ? " payment-page__schedule-preset--active"
                    : ""
                }`}
                onClick={() => onSchedulePreset(count)}
              >
                {count}
              </button>
            ))}
          </div>

          <label
            className="payment-page__debt-days-label"
            htmlFor="deferred-day-interval"
          >
            {t("crm.cashier.debtSection.intervalLabel")}
          </label>
          <div className="payment-page__schedule-presets">
            {intervalPresets.map((interval) => (
              <button
                key={`interval-${scheduleUnit}-${interval}`}
                type="button"
                className={`payment-page__schedule-preset${
                  dayInterval === interval
                    ? " payment-page__schedule-preset--active"
                    : ""
                }`}
                onClick={() => onDayIntervalPreset(interval)}
              >
                {scheduleUnit === "month"
                  ? monthIntervalPresetLabel(interval)
                  : dayIntervalPresetLabel(interval)}
              </button>
            ))}
          </div>
          <div className="payment-page__day-interval-row">
            <span className="payment-page__day-interval-prefix">
              {t("crm.cashier.debtSection.everyPrefix")}
            </span>
            <input
              id="deferred-day-interval"
              type="text"
              className="payment-page__debt-days-input payment-page__day-interval-input"
              value={dayInterval}
              onChange={(e) => onDayIntervalChange(e.target.value)}
              onBlur={(e) => onDayIntervalBlur(e.target.value)}
              min="1"
              max={intervalMax}
              inputMode="numeric"
              autoComplete="off"
              aria-label={
                scheduleUnit === "month"
                  ? t("crm.cashier.debtSection.intervalInMonthsAria")
                  : t("crm.cashier.debtSection.intervalInDaysAria")
              }
            />
            <span className="payment-page__day-interval-suffix">
              {typeof dayInterval === "number"
                ? scheduleCountLabel(scheduleUnit, dayInterval)
                : scheduleUnit === "month"
                  ? t("crm.cashier.debtSection.monthsPlural")
                  : t("crm.cashier.debtSection.daysPlural")}
            </span>
          </div>
          <p className="payment-page__debt-days-hint">
            {typeof dayInterval === "number"
              ? scheduleUnit === "month"
                ? monthIntervalLabel(dayInterval)
                : dayIntervalLabel(dayInterval)
              : scheduleUnit === "month"
                ? t("crm.cashier.debtSection.repeatEveryMonthsHint")
                : t("crm.cashier.debtSection.repeatEveryDaysHint")}
          </p>

          <label
            className="payment-page__debt-days-label"
            htmlFor="deferred-first-due-date"
          >
            {t("crm.cashier.debtSection.firstPaymentDateLabel")}
          </label>
          <div className="payment-page__debt-days-row">
            <input
              ref={deferredDueDateInputRef}
              id="deferred-first-due-date"
              type="date"
              className="payment-page__debt-days-input"
              value={deferredDueDate}
              min={todayIsoDate()}
              onChange={(e) => onFirstDueDateChange(e.target.value)}
            />
            <button
              type="button"
              className="payment-page__debt-days-calendar-btn"
              onClick={onOpenDeferredDueDatePicker}
              title={t("crm.cashier.debtSection.selectFirstDueDate")}
              aria-label={t("crm.cashier.debtSection.selectFirstDueDate")}
            >
              <Calendar size={20} strokeWidth={2} />
            </button>
          </div>

          {debtSchedule ? (
            <>
              <p className="payment-page__debt-days-hint">
                {debtSchedule.count}{" "}
                {scheduleUnit === "month"
                  ? scheduleCountLabel("month", debtSchedule.count)
                  : paymentCountLabel(debtSchedule.count)}
                {` · ${
                  scheduleUnit === "month"
                    ? monthIntervalLabel(debtSchedule.intervalMonths)
                    : dayIntervalLabel(debtSchedule.intervalDays)
                }`}{" "}
                ·{" "}
                {t("crm.cashier.debtSection.perPeriod", {
                  amount: debtSchedule.perPeriod.toFixed(2),
                })}
                {debtSchedule.lastAmount !== debtSchedule.perPeriod
                  ? ` · ${t("crm.cashier.debtSection.lastAmountNote", {
                      amount: debtSchedule.lastAmount.toFixed(2),
                    })}`
                  : null}
                {" · "}
                {t("crm.cashier.debtSection.untilDate", {
                  date: formatIsoDateRu(debtSchedule.lastDueDate),
                })}
              </p>
              <div className="payment-page__schedule-table" role="table">
                <div className="payment-page__schedule-row payment-page__schedule-row--head">
                  <span>{t("crm.cashier.debtSection.tableNumber")}</span>
                  <span>{t("crm.cashier.debtSection.tableDate")}</span>
                  <span>{t("crm.cashier.debtSection.tableAmount")}</span>
                </div>
                {previewRows.map((row) => (
                  <div key={row.number} className="payment-page__schedule-row">
                    <span>{row.number}</span>
                    <span>{formatIsoDateRu(row.dueDate)}</span>
                    <span>{row.amountStr}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="payment-page__debt-days-hint">
              {t("crm.cashier.debtSection.fillCountToPreview")}
            </p>
          )}
        </div>
      </div>
      </>
      )}

      <div className="payment-page__total-debt">
        <span>{t("crm.cashier.debtSection.totalDebtLabel")}</span>
        <span className="payment-page__total-debt-amount">
          {formatMoneyRu(totalDebt)} сом
        </span>
      </div>
    </div>
  );
}
