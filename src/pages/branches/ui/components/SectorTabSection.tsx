import { FaSpinner } from "react-icons/fa";
import {
  getSectorRowValues,
  getSectorTableColumns,
} from "../branchDetails.utils";

type SectorTabSectionProps = {
  label: string;
  route: string;
  loading: boolean;
  items: Array<Record<string, any>>;
};

export default function SectorTabSection({
  label,
  route,
  loading,
  items,
}: SectorTabSectionProps) {
  const routeLower = route.toLowerCase();
  const columns = getSectorTableColumns(routeLower);

  return (
    <div className="branch-details__section">
      <h2 className="branch-details__section-title">{label}</h2>
      {loading ? (
        <div className="branch-details__loading">
          <FaSpinner className="spinner" />
          <p>Загрузка данных...</p>
        </div>
      ) : items.length === 0 ? (
        <p className="branch-details__empty">Нет данных для этого раздела</p>
      ) : (
        <div className="nur-table-wrap branch-details__table-wrapper">
          <table className="nur-table branch-details__table">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const values = getSectorRowValues(item, routeLower);
                return (
                  <tr key={item.id || item.uuid || Math.random()}>
                    {values.map((val, idx) => (
                      <td key={idx}>{val}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
