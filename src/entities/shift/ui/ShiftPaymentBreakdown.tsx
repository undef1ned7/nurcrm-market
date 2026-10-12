import {
  formatShiftMoney,
  timesLabel,
  type ShiftPaymentBreakdownRow,
} from "../lib/paymentBreakdown";
import "./ShiftPaymentBreakdown.scss";

type Props = {
  rows?: ShiftPaymentBreakdownRow[];
  title?: string;
  emptyText?: string;
  loading?: boolean;
};

export function ShiftPaymentBreakdown({
  rows = [],
  title = "Способы оплаты",
  emptyText = "Оплат за смену нет",
  loading = false,
}: Props) {
  return (
    <div className="shift-payment-breakdown">
      <div className="shift-payment-breakdown__title">{title}</div>
      {loading ? (
        <p className="shift-payment-breakdown__empty">Считаем оплаты…</p>
      ) : !rows.length ? (
        <p className="shift-payment-breakdown__empty">{emptyText}</p>
      ) : (
        <ul className="shift-payment-breakdown__list">
          {rows.map((row) => (
            <li key={row.method} className="shift-payment-breakdown__row">
              <span className="shift-payment-breakdown__label">{row.label}</span>
              <span className="shift-payment-breakdown__count">
                {timesLabel(row.count)}
              </span>
              <span className="shift-payment-breakdown__amount">
                {formatShiftMoney(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
