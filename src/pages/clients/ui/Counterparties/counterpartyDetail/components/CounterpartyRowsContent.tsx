import {
  fmtMoney,
  fmtDate,
  fmtDateTime,
  getRowKey,
} from "../counterpartyDetail.utils";

export function CounterpartyRowsContent({
  rows,
  showSource,
  showDebtDelta,
  viewMode,
  sourceLabel,
  docTypeLabel,
}) {
  const debtDeltaLabel = (row) => {
    const d = row.debt_delta;
    if (d == null || (typeof d === "string" && d.trim() === "")) return "—";
    const n = Number(d);
    if (Number.isNaN(n) || n === 0) return "—";
    const formatted = Math.abs(n).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return n > 0 ? `+${formatted}` : `−${formatted}`;
  };
  const statusLabel = (s) =>
    s === "POSTED" ? "Проведён" : s === "DRAFT" ? "Черновик" : (s ?? "—");

  if (!rows || rows.length === 0) {
    return (
      <div className="counterparty-detail-page__empty">Нет операций</div>
    );
  }

  if (viewMode === "table") {
    return (
      <div className="counterparty-detail-page__table-wrap">
        <table className="counterparty-detail-page__table">
          <thead>
            <tr>
              <th>{showSource ? "Источник" : "Тип"}</th>
              <th>Номер</th>
              <th>Дата</th>
              <th>Сумма</th>
              {showDebtDelta && <th>Изменение долга</th>}
              <th>Категория</th>
              <th>Статус</th>
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={getRowKey(row, idx)}>
                <td>
                  {showSource ? sourceLabel(row) : docTypeLabel(row.doc_type)}
                </td>
                <td>{row.number ?? row.document?.number ?? "—"}</td>
                <td>
                  {fmtDateTime(
                    row.date ?? row.created_at ?? row.document?.date,
                  )}
                </td>
                <td>{fmtMoney(row.amount)}</td>
                {showDebtDelta && (
                  <td className="counterparty-detail-page__debt-delta">
                    {debtDeltaLabel(row)}
                  </td>
                )}
                <td>
                  {row.payment_category_title ??
                    row.document?.payment_category_title ??
                    "—"}
                </td>
                <td>{statusLabel(row.status ?? row.document?.status)}</td>
                <td>{row.comment ?? row.document?.comment ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="counterparty-detail-page__cards">
      {rows.map((row, idx) => (
        <div
          key={getRowKey(row, idx)}
          className="counterparty-detail-page__card"
        >
          <div className="counterparty-detail-page__card-header">
            <span className="counterparty-detail-page__card-number">
              {row.number ?? "—"}
            </span>
            <span
              className={`counterparty-detail-page__card-status counterparty-detail-page__card-status--${
                (row.status ?? row.document?.status) === "POSTED"
                  ? "posted"
                  : "draft"
              }`}
            >
              {statusLabel(row.status ?? row.document?.status)}
            </span>
          </div>
          <div className="counterparty-detail-page__card-body">
            <div className="counterparty-detail-page__card-row">
              <span className="counterparty-detail-page__card-label">
                {showSource ? "Источник" : "Тип"}
              </span>
              <span className="counterparty-detail-page__card-value">
                {showSource ? sourceLabel(row) : docTypeLabel(row.doc_type)}
              </span>
            </div>
            {showDebtDelta && debtDeltaLabel(row) !== "—" && (
              <div className="counterparty-detail-page__card-row">
                <span className="counterparty-detail-page__card-label">
                  Изменение долга
                </span>
                <span className="counterparty-detail-page__card-value counterparty-detail-page__card-value--debt-delta">
                  {debtDeltaLabel(row)}
                </span>
              </div>
            )}
            <div className="counterparty-detail-page__card-row">
              <span className="counterparty-detail-page__card-label">Дата</span>
              <span className="counterparty-detail-page__card-value">
                {fmtDate(row.date ?? row.created_at ?? row.document?.date)}
              </span>
            </div>
            <div className="counterparty-detail-page__card-row">
              <span className="counterparty-detail-page__card-label">Сумма</span>
              <span className="counterparty-detail-page__card-value counterparty-detail-page__card-value--amount">
                {fmtMoney(row.amount)}
              </span>
            </div>
            <div className="counterparty-detail-page__card-row">
              <span className="counterparty-detail-page__card-label">
                Категория
              </span>
              <span className="counterparty-detail-page__card-value">
                {row.payment_category_title ??
                  row.document?.payment_category_title ??
                  "—"}
              </span>
            </div>
            {(row.comment ?? row.document?.comment ?? "").trim() ? (
              <div className="counterparty-detail-page__card-row">
                <span className="counterparty-detail-page__card-label">
                  Комментарий
                </span>
                <span className="counterparty-detail-page__card-value">
                  {row.comment ?? row.document?.comment}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
