import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaBuilding,
  FaClock,
  FaEnvelope,
  FaExchangeAlt,
  FaHashtag,
  FaMapMarkerAlt,
  FaPhone,
} from "react-icons/fa";
import { PageShell, PageHeader, StatusChip } from "@shared/ui/page-shell";
import { useBranchDetails } from "./hooks/useBranchDetails";
import BranchDetailsLoading from "./components/BranchDetailsLoading";
import BranchDetailsError from "./components/BranchDetailsError";
import BranchDetailsTabs from "./components/BranchDetailsTabs";
import KassaSection from "./components/KassaSection";
import WarehouseSection from "./components/WarehouseSection";
import SalesSection from "./components/SalesSection";
import AnalyticsSection from "./components/AnalyticsSection";
import SectorTabSection from "./components/SectorTabSection";
import BranchEmbeddedPage, {
  ANALYTICS_ROUTE,
  CLIENTS_ROUTE,
  EMPLOYEES_ROUTE,
  isEmbeddedRoute,
} from "./components/BranchEmbeddedPage";
import TransfersSection from "./components/TransfersSection";
import "./BranchDetails.scss";

const BranchDetails = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    branch,
    loading,
    error,
    tabs,
    filteredBaseTabs,
    filteredSectorTabs,
    isMarketSector,
    cashLoading,
    filteredCashFlows,
    productsError,
    reloadWarehouse,
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
        title={branch.name || t("crm.branches.details.branchFallback")}
        subtitle={t("crm.branches.details.subtitle")}
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate(`/crm/branch/transfers/new?to=${branch.id}`)}
            >
              <FaExchangeAlt /> {t("crm.branches.details.actions.transfer")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={() => navigate("/crm/branch")}
            >
              <FaArrowLeft /> {t("crm.branches.details.actions.backToBranches")}
            </button>
          </>
        }
      />

      <section className="bd-info" aria-label={t("crm.branches.details.infoAria")}>
        <span className="bd-info__avatar" aria-hidden="true">
          <FaBuilding />
        </span>
        <div className="bd-info__main">
          <div className="bd-info__title">
            <h2>{branch.name || t("crm.branches.details.branchFallback")}</h2>
            <StatusChip tone={branch.is_active === false ? "default" : "success"}>
              {branch.is_active === false
                ? t("crm.branches.details.status.inactive")
                : t("crm.branches.details.status.active")}
            </StatusChip>
          </div>
          <ul className="bd-info__meta">
            {branch.address && (
              <li>
                <FaMapMarkerAlt aria-hidden="true" /> {branch.address}
              </li>
            )}
            {branch.phone && (
              <li>
                <FaPhone aria-hidden="true" />
                <a href={`tel:${branch.phone}`}>{branch.phone}</a>
              </li>
            )}
            {branch.email && (
              <li>
                <FaEnvelope aria-hidden="true" />
                <a href={`mailto:${branch.email}`}>{branch.email}</a>
              </li>
            )}
            {branch.code && (
              <li>
                <FaHashtag aria-hidden="true" /> {branch.code}
              </li>
            )}
            {branch.timezone && (
              <li>
                <FaClock aria-hidden="true" /> {branch.timezone}
              </li>
            )}
          </ul>
        </div>
      </section>

      <BranchDetailsTabs
        baseCount={filteredBaseTabs.length}
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
            error={productsError}
            onRetry={reloadWarehouse}
          />
        )}

        {activeTab === "sales" && <SalesSection items={filteredSales} />}

        {activeTab === "analytics" && isMarketSector && (
          <BranchEmbeddedPage route={ANALYTICS_ROUTE} branchId={branch.id} />
        )}

        {activeTab === "analytics" && !isMarketSector && (
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
          <BranchEmbeddedPage route={EMPLOYEES_ROUTE} branchId={branch.id} />
        )}

        {activeTab === "clients" && (
          <BranchEmbeddedPage route={CLIENTS_ROUTE} branchId={branch.id} />
        )}

        {activeTab === "transfers" && <TransfersSection branchId={branch.id} />}

        {activeSectorTab && isEmbeddedRoute(activeSectorTab.route) && (
          <BranchEmbeddedPage
            route={activeSectorTab.route}
            branchId={branch.id}
          />
        )}

        {activeSectorTab && !isEmbeddedRoute(activeSectorTab.route) && (
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
