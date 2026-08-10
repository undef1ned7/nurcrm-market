import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { PageShell, PageHeader } from "@shared/ui/page-shell";
import { useBranchDetails } from "./hooks/useBranchDetails";
import BranchDetailsLoading from "./components/BranchDetailsLoading";
import BranchDetailsError from "./components/BranchDetailsError";
import BranchDetailsTabs from "./components/BranchDetailsTabs";
import KassaSection from "./components/KassaSection";
import WarehouseSection from "./components/WarehouseSection";
import SalesSection from "./components/SalesSection";
import AnalyticsSection from "./components/AnalyticsSection";
import EmployeesSection from "./components/EmployeesSection";
import ClientsSection from "./components/ClientsSection";
import SectorTabSection from "./components/SectorTabSection";
import "./BranchDetails.scss";

const BranchDetails = () => {
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    branch,
    loading,
    error,
    tabs,
    filteredSectorTabs,
    cashLoading,
    filteredCashFlows,
    productsLoading,
    filteredProducts,
    filteredSales,
    analyticsData,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearDateFilters,
    employeesLoading,
    filteredEmployees,
    clientsLoading,
    filteredClients,
    sectorData,
    sectorLoading,
  } = useBranchDetails();

  if (loading) {
    return <BranchDetailsLoading />;
  }

  if (error || !branch) {
    return (
      <BranchDetailsError
        error={error}
        onBack={() => navigate("/crm/branch")}
      />
    );
  }

  const activeSectorTab = filteredSectorTabs.find((tab) => tab.id === activeTab);

  return (
    <PageShell className="branch-details">
      <PageHeader
        title={branch.name || "Филиал"}
        subtitle={branch.address || "Данные филиала"}
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--ghost"
            onClick={() => navigate("/crm/branch")}
          >
            <FaArrowLeft /> Назад
          </button>
        }
      />

      <BranchDetailsTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="branch-details__content">
        {activeTab === "kassa" && (
          <KassaSection loading={cashLoading} items={filteredCashFlows} />
        )}

        {activeTab === "warehouse" && (
          <WarehouseSection
            loading={productsLoading}
            items={filteredProducts}
          />
        )}

        {activeTab === "sales" && <SalesSection items={filteredSales} />}

        {activeTab === "analytics" && (
          <AnalyticsSection
            analyticsData={analyticsData}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClearFilters={clearDateFilters}
          />
        )}

        {activeTab === "employees" && (
          <EmployeesSection
            loading={employeesLoading}
            items={filteredEmployees}
          />
        )}

        {activeTab === "clients" && (
          <ClientsSection loading={clientsLoading} items={filteredClients} />
        )}

        {activeSectorTab && (
          <SectorTabSection
            label={activeSectorTab.label}
            route={activeSectorTab.route}
            loading={sectorLoading[activeTab] || false}
            items={sectorData[activeTab] || []}
          />
        )}
      </div>
    </PageShell>
  );
};

export default BranchDetails;
