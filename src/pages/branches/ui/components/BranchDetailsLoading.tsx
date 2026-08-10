import { FaSpinner } from "react-icons/fa";
import { PageShell } from "@shared/ui/page-shell";

export default function BranchDetailsLoading() {
  return (
    <PageShell className="branch-details">
      <div className="branch-details__loading">
        <FaSpinner className="spinner" />
        <p>Загрузка данных филиала...</p>
      </div>
    </PageShell>
  );
}
