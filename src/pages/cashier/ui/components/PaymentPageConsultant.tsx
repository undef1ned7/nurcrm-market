import SearchSelect from "@shared/ui/SearchSelect/SearchSelect";
import { formatMoneyRu } from "../paymentPage.utils";
import type { SaleConsultant } from "@entities/sale";

type Props = {
  specify: boolean;
  onSpecifyChange: (value: boolean) => void;
  consultantId: string;
  consultantName: string;
  onConsultantChange: (id: string, name: string) => void;
  consultants: SaleConsultant[];
  consultantsLoading: boolean;
  commissionEnabled: boolean;
  onCommissionEnabledChange: (value: boolean) => void;
  percent: string;
  onPercentChange: (value: string) => void;
  previewAmount: number;
};

export function PaymentPageConsultant({
  specify,
  onSpecifyChange,
  consultantId,
  consultantName,
  onConsultantChange,
  consultants,
  consultantsLoading,
  commissionEnabled,
  onCommissionEnabledChange,
  percent,
  onPercentChange,
  previewAmount,
}: Props) {
  const options = consultants.map((item) => ({
    value: item.id,
    label: item.full_name,
    searchText: item.full_name,
  }));

  return (
    <div className="payment-page__section">
      <h3 className="payment-page__section-title">КОНСУЛЬТАНТ</h3>
      <label className="payment-page__consultant-toggle">
        <input
          type="checkbox"
          checked={specify}
          onChange={(e) => onSpecifyChange(e.target.checked)}
        />
        <span>Указать консультанта</span>
      </label>

      {specify ? (
        <div className="payment-page__consultant">
          <label className="payment-page__consultant-field">
            <span>Консультант</span>
            <SearchSelect
              value={consultantId}
              valueLabel={consultantName}
              onChange={(id: string) => {
                const selected = consultants.find((item) => item.id === id);
                onConsultantChange(id, selected?.full_name || consultantName);
              }}
              options={options}
              placeholder={
                consultantsLoading ? "Загрузка…" : "Поиск / список сотрудников"
              }
              emptyText={
                consultantsLoading ? "Загрузка..." : "Сотрудники не найдены"
              }
              loading={consultantsLoading}
            />
          </label>

          <label className="payment-page__consultant-toggle payment-page__consultant-toggle--nested">
            <input
              type="checkbox"
              checked={commissionEnabled}
              onChange={(e) => onCommissionEnabledChange(e.target.checked)}
            />
            <span>Начислять процент от продажи</span>
          </label>

          {commissionEnabled ? (
            <>
              <label className="payment-page__consultant-field">
                <span>Процент</span>
                <div className="payment-page__consultant-percent-row">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    className="payment-page__consultant-percent"
                    value={percent}
                    onChange={(e) => onPercentChange(e.target.value)}
                    placeholder="0.00"
                  />
                  <span>%</span>
                </div>
              </label>
              <div className="payment-page__consultant-preview">
                Комиссия ≈ {formatMoneyRu(previewAmount)} сом
              </div>
            </>
          ) : null}

          <p className="payment-page__consultant-hint">
            Кассир чека — вы. Процент получит консультант.
          </p>
        </div>
      ) : null}
    </div>
  );
}
