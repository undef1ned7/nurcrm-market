import { useTranslation } from "react-i18next";
import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function AnalyticsTabs({ vm }: Props) {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, isStartTariff } = vm;

  return (
    <div className="analytics-page__tabs">
      <button
        className={`analytics-page__tab ${
          activeTab === "sales" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("sales")}
      >
        {t("crm.analytics.tabs.sales")}
      </button>
      <button
        className={`analytics-page__tab ${
          activeTab === "warehouse" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("warehouse")}
      >
        {t("crm.analytics.tabs.warehouse")}
      </button>
      {!isStartTariff && (
        <button
          className={`analytics-page__tab ${
            activeTab === "purchases" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("purchases")}
        >
          {t("crm.analytics.tabs.purchases")}
        </button>
      )}
      <button
        className={`analytics-page__tab ${
          activeTab === "cashiers" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("cashiers")}
      >
        {t("crm.analytics.tabs.cashiers")}
      </button>
      <button
        className={`analytics-page__tab ${
          activeTab === "shifts" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("shifts")}
      >
        {t("crm.analytics.tabs.shifts")}
      </button>
      <button
        className={`analytics-page__tab ${
          activeTab === "products" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("products")}
      >
        {t("crm.analytics.tabs.products")}
      </button>
      {!isStartTariff && (
        <>
          <button
            className={`analytics-page__tab ${
              activeTab === "suppliers" ? "analytics-page__tab--active" : ""
            }`}
            onClick={() => setActiveTab("suppliers")}
          >
            {t("crm.analytics.tabs.suppliers")}
          </button>
          <button
            className={`analytics-page__tab ${
              activeTab === "users" ? "analytics-page__tab--active" : ""
            }`}
            onClick={() => setActiveTab("users")}
          >
            {t("crm.analytics.tabs.employees")}
          </button>
        </>
      )}
      <button
        className={`analytics-page__tab ${
          activeTab === "finance" ? "analytics-page__tab--active" : ""
        }`}
        onClick={() => setActiveTab("finance")}
      >
        {t("crm.analytics.tabs.finance")}
      </button>
    </div>
  );
}
