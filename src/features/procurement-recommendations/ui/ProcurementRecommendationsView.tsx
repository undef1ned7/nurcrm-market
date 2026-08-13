import { ArrowLeft, PackageCheck } from "lucide-react";
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
        title="Рекомендуемый заказ"
        subtitle="Анализ остатков и продаж поставщика перед созданием прихода"
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/market/procurement")}
            >
              <ArrowLeft size={16} />
              К закупкам
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={submitToReceipt}
              disabled={!canSubmit}
            >
              <PackageCheck size={16} />
              Сформировать закупку
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
              title="Не удалось загрузить поставщиков"
              text={suppliersError}
              action={
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary"
                  onClick={() => void loadSuppliers()}
                >
                  Повторить
                </button>
              }
            />
          ) : error ? (
            <ErrorState
              title="Не удалось загрузить рекомендации"
              text={error}
              action={
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary"
                  onClick={() => void loadRecommendations()}
                >
                  Повторить
                </button>
              }
            />
          ) : loading && selectedSupplierId ? (
            <LoadingState rows={6} />
          ) : emptyKind === "no-supplier" ? (
            <EmptyState
              title="Выберите поставщика"
              text="Выберите поставщика, чтобы увидеть рекомендации по закупке."
            />
          ) : emptyKind === "no-products" ? (
            <EmptyState
              title="Нет связанных товаров"
              text="У этого поставщика пока нет связанных товаров."
            />
          ) : emptyKind === "none-required" ? (
            <EmptyState
              title="Закупка пока не требуется"
              text="По текущим продажам закупка пока не требуется."
            />
          ) : emptyKind === "no-matches" ? (
            <EmptyState
              title="Ничего не найдено"
              text="Измените поиск или фильтр, чтобы увидеть товары."
            />
          ) : (
            <RecommendationTable vm={vm} />
          )}
        </PagePanel>
      </DataContainer>
    </PageShell>
  );
}
