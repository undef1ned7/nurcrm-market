import { Filter } from "lucide-react";
import { PageShell, PageHeader } from "@shared/ui/page-shell";
import "./Analytics.scss";
import "./analytics.charts";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { AnalyticsFiltersPanel } from "./components/AnalyticsFiltersPanel";
import { AnalyticsTabs } from "./components/AnalyticsTabs";
import { SalesAnalyticsTab } from "./components/SalesAnalyticsTab";
import { WarehouseAnalyticsTab } from "./components/WarehouseAnalyticsTab";
import { CashiersAnalyticsTab } from "./components/CashiersAnalyticsTab";
import { ShiftsAnalyticsTab } from "./components/ShiftsAnalyticsTab";
import { ProductsAnalyticsTab } from "./components/ProductsAnalyticsTab";
import { SuppliersAnalyticsTab } from "./components/SuppliersAnalyticsTab";
import { PurchasesAnalyticsTab } from "./components/PurchasesAnalyticsTab";
import { UsersAnalyticsTab } from "./components/UsersAnalyticsTab";
import { FinanceAnalyticsTab } from "./components/FinanceAnalyticsTab";

const Analytics = () => {
  const vm = useAnalyticsData();
  const {
    isDark,
    monthName,
    showFilters,
    setShowFilters,
    activeTab,
    loading,
    error,
  } = vm;

  return (
    <PageShell className={`analytics-page${isDark ? " analytics-page--dark" : ""}`}>
      <PageHeader
        title="Аналитика"
        subtitle={`Статистика и отчеты за ${monthName}`}
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => setShowFilters(!showFilters)}
            title="Фильтры"
            aria-label="Фильтры"
          >
            <Filter size={20} />
            <span className="nur-btn__label">Фильтры</span>
          </button>
        }
      />

      <AnalyticsFiltersPanel vm={vm} />
      <AnalyticsTabs vm={vm} />

      {/* Индикатор загрузки */}
      {loading && (
        <div className="analytics-page__loading">
          <p>Загрузка данных...</p>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="analytics-page__error">
          <p>{error}</p>
        </div>
      )}

      {activeTab === "sales" && !loading && !error && (
        <SalesAnalyticsTab vm={vm} />
      )}
      {activeTab === "warehouse" && !loading && !error && (
        <WarehouseAnalyticsTab vm={vm} />
      )}
      {activeTab === "cashiers" && !loading && !error && (
        <CashiersAnalyticsTab vm={vm} />
      )}
      {activeTab === "shifts" && !loading && !error && (
        <ShiftsAnalyticsTab vm={vm} />
      )}
      {activeTab === "products" && !loading && !error && (
        <ProductsAnalyticsTab vm={vm} />
      )}
      {activeTab === "suppliers" && !loading && !error && (
        <SuppliersAnalyticsTab vm={vm} />
      )}
      {activeTab === "purchases" && !loading && !error && (
        <PurchasesAnalyticsTab vm={vm} />
      )}
      {activeTab === "users" && !loading && !error && (
        <UsersAnalyticsTab vm={vm} />
      )}
      {activeTab === "finance" && !loading && !error && (
        <FinanceAnalyticsTab vm={vm} />
      )}
    </PageShell>
  );
};

export default Analytics;
