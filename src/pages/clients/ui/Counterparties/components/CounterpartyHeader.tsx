import React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@shared/ui/page-shell";
import "./CounterpartyHeader.scss";

/**
 * Компонент заголовка контрагентов
 * @param {Function} onCreateCounterparty - Обработчик создания контрагента
 */
const CounterpartyHeader = ({ onCreateCounterparty }) => {
  return (
    <PageHeader
      title="Контрагенты"
      subtitle="Клиенты и поставщики: поиск, балансы и операции"
      actions={
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={onCreateCounterparty}
          title="Создать контрагента"
          aria-label="Создать контрагента"
        >
          <Plus size={16} />
          <span className="nur-btn__label">Создать контрагента</span>
        </button>
      }
    />
  );
};

export default React.memo(CounterpartyHeader);
