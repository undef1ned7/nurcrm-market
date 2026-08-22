import { Eraser, Settings2, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import { FilterBar } from "@shared/ui/page-shell";
import type { RecommendationFilter } from "../model/types";
import type { ProcurementRecommendationsVm } from "../model/useProcurementRecommendations";

type Props = {
  vm: ProcurementRecommendationsVm;
};

export function RecommendationToolbar({ vm }: Props) {
  const { t } = useTranslation();
  const filters: { value: RecommendationFilter; label: string }[] = [
    { value: "all", label: t("crm.procurement.allProducts") },
    { value: "required", label: t("crm.procurement.requiredOnly") },
    { value: "critical", label: t("crm.procurement.criticalStock") },
  ];
  const {
    suppliersLoading,
    supplierOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    search,
    setSearch,
    filter,
    setFilter,
    settingsOpen,
    setSettingsOpen,
    fillRecommended,
    clearOrderQty,
    visibleRows,
    loading,
  } = vm;

  return (
    <div className="procurement-recommendations__controls">
      <FilterBar className="procurement-recommendations__toolbar">
        <div className="procurement-recommendations__field">
          <label className="nur-label">{t("crm.procurement.selectSupplier")}</label>
          <SearchableCombobox
            value={selectedSupplierId}
            onChange={setSelectedSupplierId}
            options={supplierOptions}
            placeholder={
              suppliersLoading
                ? t("crm.procurement.suppliersLoading")
                : t("crm.procurement.selectSupplier")
            }
            classNamePrefix="searchableCombo"
          />
        </div>
        <div className="procurement-recommendations__field procurement-recommendations__field--search">
          <label className="nur-label">{t("common.search")}</label>
          <input
            className="nur-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("crm.procurement.searchNameBarcode")}
            disabled={!selectedSupplierId}
          />
        </div>
      </FilterBar>

      <div className="procurement-recommendations__filters">
        <div className="procurement-recommendations__chips" role="tablist">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              className={`nur-chip${filter === item.value ? " nur-chip--primary" : ""}`}
              onClick={() => setFilter(item.value)}
              disabled={!selectedSupplierId}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="procurement-recommendations__actions">
          <button
            type="button"
            className="nur-btn nur-btn--ghost nur-btn--sm"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings2 size={16} />
            Настройки расчёта
          </button>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={fillRecommended}
            disabled={!selectedSupplierId || loading || visibleRows.length === 0}
          >
            <Wand2 size={16} />
            Заполнить рекомендуемый заказ
          </button>
          <button
            type="button"
            className="nur-btn nur-btn--ghost nur-btn--sm"
            onClick={clearOrderQty}
            disabled={!selectedSupplierId || loading || visibleRows.length === 0}
          >
            <Eraser size={16} />
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecommendationDemoBanner({
  source,
}: {
  source: ProcurementRecommendationsVm["source"];
}) {
  if (source !== "composed") return null;
  return (
    <div className="procurement-recommendations__banner" role="status">
      <Sparkles size={16} />
      Показан предварительный расчёт: остатки, цены и единицы взяты из каталога
      поставщика, а продажи смоделированы до появления API. После подключения
      бэкенда рекомендации будут считаться по реальным продажам.
    </div>
  );
}
