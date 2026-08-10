import { FaSpinner } from "react-icons/fa";

type EmployeesSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    first_name?: string;
    last_name?: string;
    email?: string;
    role_display?: string;
    role?: string;
  }>;
};

export default function EmployeesSection({
  loading,
  items,
}: EmployeesSectionProps) {
  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">Сотрудники</h2>
      {loading ? (
        <div className="branch-details__loading">
          <FaSpinner className="spinner" />
          <p>Загрузка сотрудников...</p>
        </div>
      ) : items.length === 0 ? (
        <p className="branch-details__empty">Нет сотрудников в этом филиале</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Фамилия</th>
                <th>Email</th>
                <th>Роль</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.first_name || "—"}</td>
                  <td>{item.last_name || "—"}</td>
                  <td>{item.email || "—"}</td>
                  <td>{item.role_display || item.role || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
