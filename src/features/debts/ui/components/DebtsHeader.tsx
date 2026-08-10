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
  return (
    <>
      <PageHeader
        title="Долги"
        subtitle="Учёт долгов клиентов и сроки возврата"
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={onAddClick}
          >
            Добавить долг
          </button>
        }
      />

      <FilterBar className="debts-page__toolbar">
        <input
          className="nur-input debts-page__search"
          placeholder="Поиск по имени/телефону…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Поиск"
        />
        <input
          type="date"
          className="nur-input debts-page__date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Дата от (по дате создания)"
        />
        <input
          type="date"
          className="nur-input debts-page__date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Дата до (по дате создания)"
        />
      </FilterBar>
    </>
  );
};
