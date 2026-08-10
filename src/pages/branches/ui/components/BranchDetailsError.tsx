import { PageShell } from "@shared/ui/page-shell";

type BranchDetailsErrorProps = {
  error?: string;
  onBack: () => void;
};

export default function BranchDetailsError({
  error,
  onBack,
}: BranchDetailsErrorProps) {
  return (
    <PageShell className="branch-details">
      <div className="branch-details__error">
        <p>{error || "Филиал не найден"}</p>
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={onBack}
        >
          Вернуться к списку филиалов
        </button>
      </div>
    </PageShell>
  );
}
