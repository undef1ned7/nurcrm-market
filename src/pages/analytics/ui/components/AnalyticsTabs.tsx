import type { AnalyticsVm } from "../hooks/useAnalyticsData";

type Props = {
  vm: AnalyticsVm;
};

export function AnalyticsTabs({ vm }: Props) {
  const {
    activeTab,
    setActiveTab,
    isStartTariff,
  } = vm;
  return (
    <>
      <div className="analytics-page__tabs">
        <button
          className={`analytics-page__tab ${
            activeTab === "sales" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("sales")}
        >
          Продажи
        </button>
        <button
          className={`analytics-page__tab ${
            activeTab === "warehouse" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("warehouse")}
        >
          Склад
        </button>
        {!isStartTariff && (
          <button
            className={`analytics-page__tab ${
              activeTab === "purchases" ? "analytics-page__tab--active" : ""
            }`}
            onClick={() => setActiveTab("purchases")}
          >
            Закупки
          </button>
        )}
        <button
          className={`analytics-page__tab ${
            activeTab === "cashiers" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("cashiers")}
        >
          Кассы
        </button>
        <button
          className={`analytics-page__tab ${
            activeTab === "shifts" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("shifts")}
        >
          Смены
        </button>
        <button
          className={`analytics-page__tab ${
            activeTab === "products" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("products")}
        >
          Товары
        </button>
        {!isStartTariff && (
          <>
            <button
              className={`analytics-page__tab ${
                activeTab === "suppliers" ? "analytics-page__tab--active" : ""
              }`}
              onClick={() => setActiveTab("suppliers")}
            >
              Поставщики
            </button>
            <button
              className={`analytics-page__tab ${
                activeTab === "users" ? "analytics-page__tab--active" : ""
              }`}
              onClick={() => setActiveTab("users")}
            >
              Сотрудники
            </button>
          </>
        )}
        <button
          className={`analytics-page__tab ${
            activeTab === "finance" ? "analytics-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("finance")}
        >
          Финансы
        </button>
      </div>
    </>
  );
}
