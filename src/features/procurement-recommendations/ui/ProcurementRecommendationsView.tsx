import { ArrowLeft, PackageCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PagePanel,
  PageShell,
} from "@shared/ui/page-shell";
import { useProcurementRecommendations } from "../model/useProcurementRecommendations";
import {
  RecommendationDemoBanner,
  RecommendationToolbar,
} from "./RecommendationToolbar";
import { RecommendationSettings } from "./RecommendationSettings";
import { RecommendationSummaryBar } from "./RecommendationSummaryBar";
import { RecommendationTable } from "./RecommendationTable";
import "./ProcurementRecommendations.scss";

export function ProcurementRecommendationsView() {
  const { t } = useTranslation();
  const vm = useProcurementRecommendations();
  const {
    navigate,
    loading,
    error,
    emptyKind,
    selectedSupplierId,
    suppliersError,
    loadRecommendations,
    loadSuppliers,
    submitToReceipt,
    canSubmit,
    orderedCount,
    source,
  } = vm;

  return (
    <PageShell className="warehouse-page procurement-recommendations">
      <PageHeader
        title={t("crm.procurement.recommendedOrder")}
        subtitle={t("crm.procurement.recommendedOrderSubtitle")}
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/market/procurement")}
            >
              <ArrowLeft size={16} />
              {t("crm.procurement.backToProcurement")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={submitToReceipt}
              disabled={!canSubmit}
            >
              <PackageCheck size={16} />
              {t("crm.procurement.createPurchase")}
              {orderedCount > 0 ? ` (${orderedCount})` : ""}
            </button>
          </>
        }
      />

      <DataContainer>
        <PagePanel
          className="procurement-recommendations__card"
          bodyClassName="procurement-recommendations__body"
        >
          <RecommendationToolbar vm={vm} />
          <RecommendationSettings vm={vm} />
          <RecommendationSummaryBar vm={vm} />
          <RecommendationDemoBanner source={source} />

          {suppliersError ? (
            <ErrorState
              title={t("crm.procurement.suppliersLoadError")}
              text={suppliersError}
              action={
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary"
                  onClick={() => void loadSuppliers()}
                >
                  {t("common.retry")}
                </button>
              }
            />
          ) : error ? (
            <ErrorState
              title={t("crm.procurement.recommendationsLoadError")}
              text={error}
              action={
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary"
                  onClick={() => void loadRecommendations()}
                >
                  {t("common.retry")}
                </button>
              }
            />
          ) : loading && selectedSupplierId ? (
            <LoadingState rows={6} />
          ) : emptyKind === "no-supplier" ? (
            <EmptyState
              title={t("crm.procurement.selectSupplier")}
              text={t("crm.procurement.selectSupplierHint")}
            />
          ) : emptyKind === "no-products" ? (
            <EmptyState
              title={t("crm.procurement.noLinkedProducts")}
              text={t("crm.procurement.noLinkedProductsHint")}
            />
          ) : emptyKind === "none-required" ? (
            <EmptyState
              title={t("crm.procurement.noPurchaseRequired")}
              text={t("crm.procurement.noPurchaseRequiredHint")}
            />
          ) : emptyKind === "no-matches" ? (
            <EmptyState
              title={t("common.nothingFound")}
              text={t("crm.procurement.changeSearchFilter")}
            />
          ) : (
            <RecommendationTable vm={vm} />
          )}
        </PagePanel>
      </DataContainer>
    </PageShell>
  );
}
