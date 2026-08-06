import React, { useMemo } from "react";
import {
  formatPhone,
  getCounterpartyName,
  getAgentDisplay,
} from "../utils";
import { getCounterpartyTypeLabel } from "../constants";
import "./CounterpartyCards.scss";

/**
 * Мемоизированный компонент карточки контрагента
 */
const CounterpartyCard = React.memo(
  ({
    counterparty,
    rowNumber,
    onCounterpartyClick,
    showAgentColumn,
  }) => {
    const name = getCounterpartyName(counterparty);
    const phone = formatPhone(counterparty?.phone);
    const email = counterparty?.email || "—";
    const typeLabel = getCounterpartyTypeLabel(counterparty?.type);
    const inn = counterparty?.inn || "—";

    return (
      <div className="warehouse-card">
        <div className="warehouse-card__top">
          <div className="warehouse-card__avatar" aria-hidden>
            👥
          </div>

          <div className="warehouse-card__body">
            <div className="warehouse-card__num">#{rowNumber}</div>
            <div className="warehouse-card__name">{name}</div>

            <div className="warehouse-card__meta">
              <span>
                Тип: <strong>{typeLabel}</strong>
              </span>
              {showAgentColumn &&
                (counterparty?.agent || counterparty?.agent_display) && (
                  <span>
                    Агент: <strong>{getAgentDisplay(counterparty)}</strong>
                  </span>
                )}
              {phone !== "—" && (
                <span>
                  Телефон: <strong>{phone}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="warehouse-card__stats">
          {email !== "—" && (
            <div className="warehouse-card__stat">
              <span>Email</span>
              <strong>{email}</strong>
            </div>
          )}

          {inn !== "—" && (
            <div className="warehouse-card__stat">
              <span>ИНН</span>
              <strong>{inn}</strong>
            </div>
          )}

          {phone !== "—" && email === "—" && (
            <div className="warehouse-card__stat warehouse-card__stat--wide">
              <span>Телефон</span>
              <strong>{phone}</strong>
            </div>
          )}
        </div>

        <div className="warehouse-card__actions">
          <button
            type="button"
            className="nur-btn nur-btn--primary nur-btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onCounterpartyClick(counterparty);
            }}
          >
            Открыть
          </button>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.counterparty.id === nextProps.counterparty.id &&
      prevProps.rowNumber === nextProps.rowNumber &&
      prevProps.showAgentColumn === nextProps.showAgentColumn
    );
  }
);

CounterpartyCard.displayName = "CounterpartyCard";

/**
 * Компонент карточек контрагентов
 */
const CounterpartyCards = ({
  counterparties,
  loading,
  onCounterpartyClick,
  getRowNumber,
  showAgentColumn = false,
}) => {
  const counterpartiesData = useMemo(() => {
    return counterparties.map((counterparty, index) => ({
      counterparty,
      rowNumber: getRowNumber(index, counterparties.length),
    }));
  }, [counterparties, getRowNumber]);

  if (loading && counterparties.length === 0) {
    return (
      <div className="warehouse-cards__status">Загрузка...</div>
    );
  }

  if (counterparties.length === 0 && !loading) {
    return (
      <div className="warehouse-cards__status">Контрагенты не найдены</div>
    );
  }

  return (
    <div className="warehouse-cards-root">
      {loading && counterparties.length > 0 && (
        <div className="warehouse-cards__overlay">
          <div className="warehouse-cards__status">Загрузка...</div>
        </div>
      )}
      <div className="warehouse-cards">
        {counterpartiesData.map((data) => (
          <CounterpartyCard
            key={data.counterparty.id}
            counterparty={data.counterparty}
            rowNumber={data.rowNumber}
            onCounterpartyClick={onCounterpartyClick}
            showAgentColumn={showAgentColumn}
          />
        ))}
      </div>
    </div>
  );
};

const areEqual = (prevProps, nextProps) => {
  if (
    prevProps.loading !== nextProps.loading ||
    prevProps.getRowNumber !== nextProps.getRowNumber ||
    prevProps.showAgentColumn !== nextProps.showAgentColumn
  ) {
    return false;
  }

  if (prevProps.counterparties.length !== nextProps.counterparties.length) {
    return false;
  }

  if (prevProps.counterparties === nextProps.counterparties) {
    return true;
  }

  if (prevProps.counterparties.length > 0 && nextProps.counterparties.length > 0) {
    if (prevProps.counterparties[0]?.id !== nextProps.counterparties[0]?.id) {
      return false;
    }
  }

  return true;
};

export default React.memo(CounterpartyCards, areEqual);
