import { EmptyState, StatusChip } from "@shared/ui/page-shell";
import {
  money,
  getDebtStatus,
  fmtDateTime,
  toYMD,
} from "../helpers";

const STATUS_TONE = {
  overdue: "danger",
  "due-today": "warning",
  "due-tomorrow": "warning",
  "due-soon": "warning",
  normal: "success",
  "no-date": "default",
};

export const DebtsTable = ({
  loading,
  items,
  confirmId,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onOpenPay,
  onOpenEdit,
}) => {
  return (
    <div className="nur-table-wrap debts-page__table-wrap">
      <table className="nur-table debts-page__table">
        <thead>
          <tr>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Долг</th>
            <th>Срок возврата</th>
            <th>Статус</th>
            <th>Создан</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="debts-page__muted-cell">
                Загрузка…
              </td>
            </tr>
          ) : items.length ? (
            items.map((x) => {
              const debtStatus = getDebtStatus(x.due_date);
              return (
                <tr
                  key={x.id}
                  className={
                    debtStatus.status !== "normal" &&
                    debtStatus.status !== "no-date"
                      ? `debts-page__row--${debtStatus.status}`
                      : undefined
                  }
                >
                  <td data-label="Имя">{x.name}</td>
                  <td data-label="Телефон">{x.phone}</td>
                  <td data-label="Долг">
                    {money(
                      x.balance != null
                        ? x.balance
                        : x.amount
                    )}
                  </td>
                  <td data-label="Срок возврата">
                    {x.due_date ? toYMD(new Date(x.due_date)) : "—"}
                  </td>
                  <td data-label="Статус">
                    <StatusChip tone={STATUS_TONE[debtStatus.status] || "default"}>
                      {debtStatus.text}
                    </StatusChip>
                  </td>
                  <td data-label="Создан">{fmtDateTime(x.created_at)}</td>
                  <td data-label="Действия">
                    <div className="debts-page__row-actions">
                      <button
                        type="button"
                        className="nur-btn nur-btn--primary nur-btn--sm"
                        onClick={() => onOpenPay(x.id)}
                        title="Оплатить (уменьшить сумму)"
                      >
                        Оплатить
                      </button>
                      <button
                        type="button"
                        className="nur-btn nur-btn--secondary nur-btn--sm"
                        onClick={() => onOpenEdit(x)}
                        title="Изменить"
                      >
                        Изменить
                      </button>

                      {confirmId === x.id ? (
                        <>
                          <button
                            type="button"
                            className="nur-btn nur-btn--danger nur-btn--sm"
                            onClick={() => onDelete(x.id)}
                          >
                            Да, удалить
                          </button>
                          <button
                            type="button"
                            className="nur-btn nur-btn--ghost nur-btn--sm"
                            onClick={onCancelDelete}
                          >
                            Нет
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="nur-btn nur-btn--ghost nur-btn--sm"
                          onClick={() => onAskDelete(x.id)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7}>
                <EmptyState
                  title="Ничего не найдено"
                  text="Измените фильтры или добавьте новый долг."
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
