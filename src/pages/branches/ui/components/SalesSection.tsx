import { formatCurrency, formatDateTable } from "../branchDetails.utils";

type SalesSectionProps = {
  items: Array<{
    id: string | number;
    created_at?: string;
    total?: number;
    amount?: number;
    status?: string;
    client_display?: string;
    client_name?: string;
  }>;
};

export default function SalesSection({ items }: SalesSectionProps) {
  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">Продажи</h2>
      {items.length === 0 ? (
        <p className="branch-details__empty">Нет данных о продажах</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Клиент</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell--date">
                    {formatDateTable(item.created_at)}
                  </td>
                  <td>{formatCurrency(item.total || item.amount)}</td>
                  <td>{item.status || "—"}</td>
                  <td>{item.client_display || item.client_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
