import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import "@features/kassa/ui/kassa.scss";
import "./Vitrina.scss";
import Pending from "./PendingBridge";
import { PageShell, PageHeader, FilterBar } from "@shared/ui/page-shell";
import { useKassa } from "./hooks/useKassa";
import KassaReportsSection from "./kassa/KassaReportsSection";
import KassaFlowsSection from "./kassa/KassaFlowsSection";
import KassaModals from "./kassa/KassaModals";
import FlowChangeRequestModal from "@features/kassa/ui/FlowChangeRequestModal/FlowChangeRequestModal";

const Kassa = () => {
  const { t } = useTranslation();
  const tw = (k: string, o?: any): string =>
    t(`crm.kassa.worker.${k}`, o) as string;
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
    canRequestFlowChange,
    flowChange,
    openFlowChange,
    closeFlowChange,
    reloadAfterFlowChange,
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
      <PageHeader
        title={
          (cashboxDetails as any)?.department_name ??
          (cashboxDetails as any)?.name ??
          t("crm.kassa.pageTitle")
        }
        subtitle={tw("subtitle")}
        actions={
          <>
            <Link
              className="nur-btn nur-btn--ghost nur-btn--sm"
              to="/crm/kassa/"
            >
              ← {t("common.back")}
            </Link>
            {activeFlowType !== "reports" && (
              <button
                type="button"
                className="nur-btn nur-btn--primary nur-btn--sm"
                onClick={() => setShowAddCashboxModal(true)}
                title={t("crm.kassa.addOperation")}
                aria-label={t("crm.kassa.addOperation")}
              >
                <Plus size={16} />
                <span className="nur-btn__label">
                  {t("crm.kassa.addOperation")}
                </span>
              </button>
            )}
          </>
        }
      />

      <FilterBar className="kassa-page__toolbar">
        <div
          className="kassa-flow-tabs"
          role="tablist"
          aria-label={tw("sectionsAria")}
        >
          {[
            { id: "all", label: t("crm.kassa.all") },
            { id: "expense", label: t("crm.kassa.expense") },
            { id: "income", label: t("crm.kassa.income") },
            ...(company?.subscription_plan?.name !== "Старт"
              ? [{ id: "pending", label: tw("requests") }]
              : []),
            { id: "reports", label: t("crm.kassa.reports") },
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
          canRequestFlowChange={canRequestFlowChange}
          onRequestFlowChange={openFlowChange}
        />
      )}

      {flowChange && (
        <FlowChangeRequestModal
          mode={flowChange.mode}
          flow={flowChange.flow}
          onClose={closeFlowChange}
          onSubmitted={reloadAfterFlowChange}
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
