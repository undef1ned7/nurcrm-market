import type { PaymentBank } from "../paymentPage.types";

type Props = {
  banks: PaymentBank[];
  selectedId: string;
  onSelect: (id: string) => void;
  keyPrefix?: string;
  activeClassName?: string;
  /** cashless: svg in div; deferred: raw svg; split: string logos only (else name) */
  logoMode?: "cashless" | "deferred" | "split";
};

export function PaymentPageBankGrid({
  banks,
  selectedId,
  onSelect,
  keyPrefix = "",
  activeClassName = "payment-page__bank--active",
  logoMode = "cashless",
}: Props) {
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
