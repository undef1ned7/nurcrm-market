import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import "@features/kassa/ui/kassa.scss";
import "./Vitrina.scss";
import Pending from "./PendingBridge";
import Loading from "@shared/ui/Loading/Loading";
import { PageShell, PageHeader, FilterBar } from "@shared/ui/page-shell";
import { useKassa } from "./hooks/useKassa";
import KassaReportsSection from "./kassa/KassaReportsSection";
import KassaFlowsSection from "./kassa/KassaFlowsSection";
import KassaModals from "./kassa/KassaModals";

const Kassa = () => {
  const {
    id,
    company,
    isMobile,
    activeFlowType,
    cashboxDetails,
    fetchCashboxDetails,
    filterSearch,
    setFilterSearch,
    filteredCashflows,
    flowsHasNext,
    flowsLoading,
    flowsPage,
    setFlowsPage,
    flowsTotalCount,
    handleAddCashbox,
    handleEditCashbox,
    handleResetFilters,
    loading,
    newCashbox,
    setNewCashbox,
    reportData,
    reportLoading,
    reportType,
    setReportType,
    selectedCashbox,
    setSelectedCashbox,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    setActiveFlowType,
    setShowAddCashboxModal,
    setShowEditCashboxModal,
    setShowFilter,
    setShowPending,
    setViewMode,
    showAddCashboxModal,
    showEditCashboxModal,
    showFilter,
    showPending,
    viewMode,
  } = useKassa();

  return (
    <PageShell className="kassa-page">
      {loading && <Loading />}
      <PageHeader
        title={(cashboxDetails as any)?.department_name ?? (cashboxDetails as any)?.name ?? "Касса"}
        subtitle="Движения по кассе"
        actions={
          <>
            <Link className="nur-btn nur-btn--ghost nur-btn--sm" to="/crm/kassa/">
              ← Назад
            </Link>
            {activeFlowType !== "reports" && (
              <button
                type="button"
                className="nur-btn nur-btn--primary nur-btn--sm"
                onClick={() => setShowAddCashboxModal(true)}
                title="Добавить операцию"
                aria-label="Добавить операцию"
              >
                <Plus size={16} />
                <span className="nur-btn__label">Добавить операцию</span>
              </button>
            )}
          </>
        }
      />

      <FilterBar className="kassa-page__toolbar">
        <div className="kassa-flow-tabs" role="tablist" aria-label="Разделы кассы">
          {[
            { id: "all", label: "Все" },
            { id: "expense", label: "Расход" },
            { id: "income", label: "Приход" },
            ...(company?.subscription_plan?.name !== "Старт"
              ? [{ id: "pending", label: "Запросы" }]
              : []),
            { id: "reports", label: "Отчёты" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeFlowType === tab.id}
              className={`kassa-flow-tabs__tab${
                activeFlowType === tab.id ? " is-active" : ""
              }`}
              onClick={() => setActiveFlowType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FilterBar>

      {activeFlowType === "pending" ? (
        <Pending />
      ) : activeFlowType === "reports" ? (
        <KassaReportsSection
          reportType={reportType}
          setReportType={setReportType}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          reportLoading={reportLoading}
          reportData={reportData}
        />
      ) : (
        <KassaFlowsSection
          filterSearch={filterSearch}
          setFilterSearch={setFilterSearch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isMobile={isMobile}
          showFilter={showFilter}
          setShowFilter={setShowFilter}
          handleResetFilters={handleResetFilters}
          filteredCashflows={filteredCashflows}
          flowsLoading={flowsLoading}
          flowsHasNext={flowsHasNext}
          flowsPage={flowsPage}
          setFlowsPage={setFlowsPage}
          flowsTotalCount={flowsTotalCount}
          activeFlowType={activeFlowType}
          setActiveFlowType={setActiveFlowType}
        />
      )}

      <KassaModals
        showAddCashboxModal={showAddCashboxModal}
        setShowAddCashboxModal={setShowAddCashboxModal}
        newCashbox={newCashbox}
        setNewCashbox={setNewCashbox}
        handleAddCashbox={handleAddCashbox}
        showEditCashboxModal={showEditCashboxModal}
        setShowEditCashboxModal={setShowEditCashboxModal}
        selectedCashbox={selectedCashbox}
        setSelectedCashbox={setSelectedCashbox}
        handleEditCashbox={handleEditCashbox}
        showPending={showPending}
        setShowPending={setShowPending}
        cashboxDetails={cashboxDetails}
        fetchCashboxDetails={fetchCashboxDetails}
        id={id}
      />
    </PageShell>
  );
};

export default Kassa;
