import { useTranslation } from "react-i18next";
import { FaSpinner } from "react-icons/fa";
import { PageShell } from "@shared/ui/page-shell";

export default function BranchDetailsLoading() {
  const { t } = useTranslation();
  return (
    <PageShell className="branch-details">
      <div className="branch-details__loading">
        <FaSpinner className="spinner" />
        <p>{t("crm.branches.details.states.loading")}</p>
      </div>
    </PageShell>
  );
}
