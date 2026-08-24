import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <div className="nur-table-wrap debts-page__table-wrap">
      <table className="nur-table debts-page__table">
        <thead>
          <tr>
            <th>{t("crm.debts.name")}</th>
            <th>{t("crm.debts.phone")}</th>
            <th>{t("crm.debts.debt")}</th>
            <th>{t("crm.debts.dueDate")}</th>
            <th>{t("crm.debts.status")}</th>
            <th>{t("crm.debts.created")}</th>
            <th>{t("crm.debts.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="debts-page__muted-cell">
                {t("common.loading")}
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
                  <td data-label={t("crm.debts.name")}>{x.name}</td>
                  <td data-label={t("crm.debts.phone")}>{x.phone}</td>
                  <td data-label={t("crm.debts.debt")}>
                    {money(
                      x.balance != null
                        ? x.balance
                        : x.amount
                    )}
                  </td>
                  <td data-label={t("crm.debts.dueDate")}>
                    {x.due_date ? toYMD(new Date(x.due_date)) : "—"}
                  </td>
                  <td data-label={t("crm.debts.status")}>
                    <StatusChip tone={STATUS_TONE[debtStatus.status] || "default"}>
                      {debtStatus.text}
                    </StatusChip>
                  </td>
                  <td data-label={t("crm.debts.created")}>{fmtDateTime(x.created_at)}</td>
                  <td data-label={t("crm.debts.actions")}>
                    <div className="debts-page__row-actions">
                      <button
                        type="button"
                        className="nur-btn nur-btn--primary nur-btn--sm"
                        onClick={() => onOpenPay(x.id)}
                        title={t("crm.debts.payTitle")}
                      >
                        {t("crm.debts.pay")}
                      </button>
                      <button
                        type="button"
                        className="nur-btn nur-btn--secondary nur-btn--sm"
                        onClick={() => onOpenEdit(x)}
                        title={t("crm.debts.edit")}
                      >
                        {t("crm.debts.edit")}
                      </button>

                      {confirmId === x.id ? (
                        <>
                          <button
                            type="button"
                            className="nur-btn nur-btn--danger nur-btn--sm"
                            onClick={() => onDelete(x.id)}
                          >
                            {t("crm.debts.confirmDelete")}
                          </button>
                          <button
                            type="button"
                            className="nur-btn nur-btn--ghost nur-btn--sm"
                            onClick={onCancelDelete}
                          >
                            {t("common.no")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="nur-btn nur-btn--ghost nur-btn--sm"
                          onClick={() => onAskDelete(x.id)}
                        >
                          {t("crm.debts.delete")}
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
                  title={t("common.nothingFound")}
                  text={t("crm.debts.emptyHint", {
                    defaultValue:
                      "Измените фильтры или добавьте новый долг.",
                  })}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
