import { FaSpinner } from "react-icons/fa";
import { formatCurrency, formatDate } from "../branchDetails.utils";

type KassaSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    created_at?: string;
    type?: string;
    amount?: number;
    description?: string;
  }>;
};

export default function KassaSection({ loading, items }: KassaSectionProps) {
  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">Касса</h2>
      {loading ? (
        <div className="branch-details__loading">
          <FaSpinner className="spinner" />
          <p>Загрузка данных кассы...</p>
        </div>
      ) : items.length === 0 ? (
        <p className="branch-details__empty">Нет данных о кассе</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{item.type || "—"}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
