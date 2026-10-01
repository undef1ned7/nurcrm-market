import { useContext } from "react";
import { useNavigate } from "react-router";

import "./ClientDetails.scss";
import "./ClientModals.scss";
import { PageShell } from "@shared/ui/page-shell";
import { useUser } from "@entities/user";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import AlertModal from "@shared/ui/AlertModal/AlertModal";

import { useClientDetailsData } from "./hooks/useClientDetailsData";
import { useClientDetailsViewModel } from "./hooks/useClientDetailsViewModel";
import { ClientDetailsHeader } from "./components/ClientDetailsHeader";
import { ClientKpiRow } from "./components/ClientKpiRow";
import { ClientProfileSection } from "./components/ClientProfileSection";
import { ClientFiltersToolbar } from "./components/ClientFiltersToolbar";
import { DealsSection } from "./components/DealsSection";
import { ClientSalesSection } from "./components/ClientSalesSection";
import { SupplierProductsSection } from "./components/SupplierProductsSection";
import { SupplierPurchasesSection } from "./components/SupplierPurchasesSection";
import { ClientKpiDetailDrawer } from "./components/ClientKpiDetailDrawer";
import DebtModal from "./components/DebtModal";
import ClientEditModal from "./components/ClientEditModal";
import DealFormModal from "./components/DealFormModal";
import ReconciliationModal from "./components/ReconciliationModal";
import type { DealRecord } from "./clientDetails.types";

export default function MarketClientDetails() {
  const navigate = useNavigate();
  const { company } = useUser() as {
    company?: { sector?: { name?: string } };
  };
  const { mode } = useContext(ThemeModeContext) as { mode?: string };

  const data = useClientDetailsData();
  const vm = useClientDetailsViewModel({
    client: data.client,
    deals: data.deals,
    kpis: data.kpis,
    detailsView: data.detailsView,
    sectorName: company?.sector?.name,
    onOpenDetailsView: (view) => data.setDetailsView(view),
  });

  const handleDealClick = (deal: DealRecord) => {
    if (deal.kind === "debt" && deal.id != null) {
      data.dataTransmission(deal.id);
    }
  };

  return (
    <PageShell className="client-details-shell">
      <div className="cdx" data-theme={mode}>
        <ClientDetailsHeader
          clientName={vm.clientName}
          clientInitials={vm.clientInitials}
          statusText={String(vm.statusText)}
          clientTypeLabel={vm.clientTypeLabel}
          sectorName={company?.sector?.name}
          clientErr={data.clientErr}
          onBack={() =>
            navigate(
              company?.sector?.name === "Консалтинг"
                ? "/crm/consulting/client"
                : "/crm/clients",
            )
          }
          onAddDeal={() => data.openDealForm()}
          onReconciliation={() => data.setShowReconciliation(true)}
          onEditClient={data.openClientForm}
        />

        <ClientKpiRow kpis={vm.kpis} loading={data.kpisLoading} />

        <ClientProfileSection
          client={data.client}
          clientName={vm.clientName}
          clientInitials={vm.clientInitials}
          statusText={String(vm.statusText)}
          clientTypeLabel={vm.clientTypeLabel}
          profileSnapshot={vm.profileSnapshot}
          requisites={vm.requisites}
        />

        <ClientFiltersToolbar
          dateFrom={data.dateFrom}
          dateTo={data.dateTo}
          onDateFromChange={data.setDateFrom}
          onDateToChange={data.setDateTo}
          onPreset={data.applyPreset}
          filteredCount={data.filteredDeals.length}
          totalCount={data.deals.length}
        />

        <DealsSection
          filteredDeals={data.filteredDeals}
          dealsLoading={data.dealsLoading}
          dealsErr={data.dealsErr}
          onDealClick={handleDealClick}
          onEditDeal={(deal) => data.openDealForm(deal)}
        />

        <ClientSalesSection
          filteredClientSales={data.filteredClientSales}
          clientSalesLoading={data.clientSalesLoading}
          clientSalesErr={data.clientSalesErr}
        />

        {vm.showSupplierSections && (
          <SupplierProductsSection
            clientId={data.client?.id}
            supplierProductSearch={data.supplierProductSearch}
            onSearchChange={data.setSupplierProductSearch}
            onRefresh={() => void data.loadSupplierProducts(data.client?.id)}
            supplierProductsLoading={data.supplierProductsLoading}
            supplierProductsErr={data.supplierProductsErr}
            supplierProductsLength={data.supplierProducts.length}
            filteredSupplierProducts={data.filteredSupplierProducts}
            supplierProductsCountLabel={data.supplierProductsCountLabel}
          />
        )}

        {vm.showSupplierSections && (
          <SupplierPurchasesSection
            clientId={data.client?.id}
            onRefresh={() => void data.loadSupplierPurchases(data.client?.id)}
            loading={data.supplierPurchasesLoading}
            err={data.supplierPurchasesErr}
            apiMissing={data.supplierPurchasesApiMissing}
            purchases={data.supplierPurchases}
            totals={data.supplierPurchasesTotals}
          />
        )}

        {data.showDebtModal && (
          <DebtModal
            id={data.selectedRowId}
            clientType={data.client?.type}
            onClose={() => data.setShowDebtModal(false)}
            onChanged={() => {
              if (!data.client?.id) return;
              void data.loadDeals(data.client.id);
              void data.loadKpis(data.client.id);
            }}
          />
        )}

        <ClientEditModal
          open={data.isClientFormOpen}
          client={data.client}
          onClose={() => data.setIsClientFormOpen(false)}
          onUpdated={data.handleClientUpdated}
          onDeleted={(clientId: string | number) =>
            data.handleClientDeleted(clientId, navigate)
          }
        />

        <DealFormModal
          open={data.isDealFormOpen}
          clientId={data.client?.id}
          editingDeal={data.editingDeal}
          onClose={() => {
            data.setIsDealFormOpen(false);
            data.setEditingDeal(null);
          }}
          onSaved={data.handleDealSaved}
          onDeleted={data.handleDealDeleted}
          onError={data.handleDealError}
        />

        <ReconciliationModal
          open={data.showReconciliation}
          clientId={data.client?.id}
          clientName={vm.clientName}
          onClose={() => data.setShowReconciliation(false)}
        />

        <ClientKpiDetailDrawer
          open={Boolean(data.detailsView)}
          mode={mode}
          category={data.detailsView}
          clientId={data.client?.id}
          clientType={data.client?.type}
          detailsMeta={vm.detailsMeta}
          detailRows={vm.detailRows}
          onClose={() => data.setDetailsView(null)}
          onChanged={() => {
            if (!data.client?.id) return;
            void data.loadDeals(data.client.id);
            void data.loadKpis(data.client.id);
          }}
        />

        <AlertModal
          open={data.alert.open}
          type={data.alert.type}
          title=""
          message={data.alert.message}
          okText="Ok"
          onClose={() => data.setAlert((a) => ({ ...a, open: false }))}
          onConfirm={() => data.setAlert((a) => ({ ...a, open: false }))}
        />
      </div>
    </PageShell>
  );
}
