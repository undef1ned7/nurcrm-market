import { useTranslation } from "react-i18next";
import { PageHeader, FilterBar } from "@shared/ui/page-shell";

export const DebtsHeader = ({
  q,
  setQ,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onAddClick,
}: any) => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t("crm.debts.pageTitle")}
        subtitle={t("crm.debts.subtitle")}
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={onAddClick}
          >
            {t("crm.debts.addDebt")}
          </button>
        }
      />

      <FilterBar className="debts-page__toolbar">
        <input
          className="nur-input debts-page__search"
          placeholder={t("crm.debts.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("common.search")}
        />
        <input
          type="date"
          className="nur-input debts-page__date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title={t("crm.debts.dateFromTitle")}
        />
        <input
          type="date"
          className="nur-input debts-page__date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title={t("crm.debts.dateToTitle")}
        />
      </FilterBar>
    </>
  );
};
