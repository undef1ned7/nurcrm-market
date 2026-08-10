import { FaSpinner } from "react-icons/fa";
import { formatCurrency } from "../branchDetails.utils";

type WarehouseSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    name?: string;
    quantity?: number;
    remainder?: number;
    unit?: string;
    price?: number;
  }>;
};

export default function WarehouseSection({
  loading,
  items,
}: WarehouseSectionProps) {
  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">Склад</h2>
      {loading ? (
        <div className="branch-details__loading">
          <FaSpinner className="spinner" />
          <p>Загрузка данных склада...</p>
        </div>
      ) : items.length === 0 ? (
        <p className="branch-details__empty">Нет данных о складе</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Количество</th>
                <th>Единица</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name || "—"}</td>
                  <td>{item.quantity || item.remainder || 0}</td>
                  <td>{item.unit || "—"}</td>
                  <td>{formatCurrency(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
