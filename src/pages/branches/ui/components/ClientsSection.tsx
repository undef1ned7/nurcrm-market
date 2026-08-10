import { FaSpinner } from "react-icons/fa";

type ClientsSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    name?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  }>;
};

export default function ClientsSection({
  loading,
  items,
}: ClientsSectionProps) {
  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">Клиенты</h2>
      {loading ? (
        <div className="branch-details__loading">
          <FaSpinner className="spinner" />
          <p>Загрузка клиентов...</p>
        </div>
      ) : items.length === 0 ? (
        <p className="branch-details__empty">Нет клиентов в этом филиале</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Адрес</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name || item.full_name || "—"}</td>
                  <td>{item.phone || "—"}</td>
                  <td>{item.email || "—"}</td>
                  <td>{item.address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
