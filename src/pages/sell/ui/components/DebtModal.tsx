import { useTranslation } from "react-i18next";
import UniversalModal from "@shared/ui/legacy-production/ProductionAgents/UniversalModal/UniversalModal";

const DebtModal = ({
  show,
  onClose,
  currentTotal,
  clientId,
  setClientId,
  setSelectClient,
  filterClient,
  company,
  state,
  onChange2,
  debt,
  setDebt,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  onSave,
}) => {
  const { t } = useTranslation();
  const td = (k: string): string => t(`crm.sell.modals.debt.${k}`) as string;
  if (!show) return null;

  return (
    <UniversalModal onClose={onClose} title={td("title")}>
      <div className="start__debt min-w-75">
        <p className="start__debt-amount">
          {td("debtAmount")} <b>{currentTotal}</b>
        </p>

        {clientId === "" && (
          <>
            <p style={{ margin: "5px 0" }} className="sell__header-necessarily">
              {td("selectClientHint")}
            </p>
            <select
              onChange={(e) => {
                setClientId(e.target.value);
                setSelectClient(e.target.value);
              }}
              value={clientId}
              className="sell__header-input"
            >
              <option value="">{td("selectClient")}</option>
              {filterClient.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
          </>
        )}

        {company?.subscription_plan?.name === "Старт" && (
          <>
            <label>{t("common.phone")}</label>
            <input
              type="text"
              className="sell__header-input"
              onChange={onChange2}
              name="phone"
              value={state.phone}
            />
          </>
        )}

        <label>{td("paymentType")}</label>
        <select
          value={debt}
          onChange={(e) => setDebt(e.target.value)}
          className="sell__header-input"
        >
          <option value="">{td("paymentType")}</option>
          <option value="Предоплата">{td("prepayment")}</option>
          <option value="Долги">{td("debt")}</option>
        </select>

        {/* Блок для "Предоплата" */}
        {debt === "Предоплата" && (
          <>
            <label>{td("prepaymentAmount")}</label>
            <input
              type="text"
              className="sell__header-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label>{td("debtTermMonths")}</label>
            <input
              type="number"
              min="1"
              className="sell__header-input"
              value={debtMonths}
              onChange={(e) => setDebtMonths(e.target.value)}
            />

            <label>{td("firstPaymentDate")}</label>
            <input
              type="date"
              className="sell__header-input"
              name="dueDate"
              value={state.dueDate}
              onChange={onChange2}
            />
          </>
        )}

        {/* Блок для "Долги" */}
        {debt === "Долги" && (
          <>
            <label>{td("debtTermMonths")}</label>
            <input
              type="number"
              min="1"
              className="sell__header-input"
              value={debtMonths}
              onChange={(e) => setDebtMonths(e.target.value)}
            />

            <label>{td("firstPaymentDate")}</label>
            <input
              type="date"
              className="sell__header-input"
              name="dueDate"
              value={state.dueDate}
              onChange={onChange2}
            />
          </>
        )}

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            columnGap: "10px",
            justifyContent: "end",
          }}
        >
          <button className="sell__reset" type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="start__total-pay"
            style={{ width: "auto" }}
            type="button"
            onClick={onSave}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </UniversalModal>
  );
};

export default DebtModal;
