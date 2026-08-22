import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHeader({ vm }: Props) {
  const { t } = useTranslation();
  const {
    onChange,
    isMarketCompany,
    isStartPlanCompany,
    isBuildingCompany,
    navigate,
    setShowFiltersModal,
    setShowBuilding,
    setShowAddCashboxModal,
  } = vm;

  return (
    <div className="sell__header">
      <div className="sell__header-left">
        <div className="sell__header-input sell__search-wrap">
          <input
            className="w-full"
            onChange={onChange}
            type="text"
            placeholder={t("crm.sell.search")}
          />
          <span>
            <Search size={15} color="#91929E" />
          </span>
        </div>
        {isMarketCompany && (
          <button
            className="sell__header-btn sell__filter-btn"
            onClick={() => setShowFiltersModal(true)}
          >
            {t("crm.sell.filter")}
          </button>
        )}
      </div>
      {!isStartPlanCompany && !isMarketCompany && (
        <button
          className="sell__header-btn "
          onClick={() => navigate("start")}
        >
          {t("crm.sell.startSale")}
        </button>
      )}
      {isBuildingCompany ? (
        <button className="sklad__add" onClick={() => setShowBuilding(true)}>
          <Plus size={16} style={{ marginRight: 4 }} /> {t("crm.sell.sellApartment")}
        </button>
      ) : !isStartPlanCompany && !isMarketCompany ? (
        <button
          className="sell__header-btn"
          onClick={() => setShowAddCashboxModal(true)}
        >
          {t("crm.sell.otherExpenses")}
        </button>
      ) : null}
    </div>
  );
}
