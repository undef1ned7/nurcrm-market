import { AlertTriangle } from "lucide-react";
import "./CashboxWarningBanner.scss";

export type ShiftCashboxWarningOpenShift = {
  cashier_display?: string | null;
  drawer_expected_cash?: string | number | null;
};

export type ShiftCashboxWarning = {
  message?: string | null;
  open_shifts?: ShiftCashboxWarningOpenShift[] | null;
} | null;

/**
 * `cashbox_warning` приходит из `POST /construction/shifts/open/` и
 * `GET /construction/shifts/{id}/` — ключ есть всегда, `null` значит
 * предупреждать не о чем. `drawer_expected_cash` — реальное содержимое
 * чужого ящика (opening_cash + его наличные продажи), а не его opening_cash:
 * именно по этой цифре кассир узнаёт свою кассу в чужой смене.
 */
export function CashboxWarningBanner({
  warning,
}: {
  warning: ShiftCashboxWarning | undefined;
}) {
  if (!warning?.message) return null;

  return (
    <div className="cashbox-warning-banner" role="alert">
      <AlertTriangle size={20} className="cashbox-warning-banner__icon" />
      <div className="cashbox-warning-banner__body">
        <p className="cashbox-warning-banner__message">{warning.message}</p>
        {Array.isArray(warning.open_shifts) && warning.open_shifts.length > 0 && (
          <ul className="cashbox-warning-banner__list">
            {warning.open_shifts.map((s, i) => (
              <li key={i} className="cashbox-warning-banner__list-item">
                <span>{s.cashier_display || "—"}</span>
                <span className="cashbox-warning-banner__list-amount">
                  {s.drawer_expected_cash != null
                    ? `${parseFloat(String(s.drawer_expected_cash)).toFixed(2)} сом`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
