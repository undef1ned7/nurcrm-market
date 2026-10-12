import { useTranslation } from "react-i18next";
import { PageShell } from "@shared/ui/page-shell";

type BranchDetailsErrorProps = {
  error?: string;
  onBack: () => void;
};

export default function BranchDetailsError({
  error,
  onBack,
}: BranchDetailsErrorProps) {
  const { t } = useTranslation();
  return (
    <PageShell className="branch-details">
      <div className="branch-details__error">
        <p>{error || t("crm.branches.details.states.notFound")}</p>
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={onBack}
        >
          {t("crm.branches.details.states.backToList")}
        </button>
      </div>
    </PageShell>
  );
}
