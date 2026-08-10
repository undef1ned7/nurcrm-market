import AddCashFlowsModal from "@features/kassa/ui/AddCashFlowsModal/AddCashFlowsModal";
import Modal from "@shared/ui/Modal/Modal";
import { historySellObjects, historySellProduct } from "@entities/sale";
import RefundPurchase from "../../RefundPurchase";
import SellBuildingModal from "../../SellBuildingModal";
import SellDetail from "../../SellDetail";
import SellModal from "../../SellModal";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellModals({ vm }: Props) {
  const {
    showAddCashboxModal,
    setShowAddCashboxModal,
    showSellModal,
    setShowSellModal,
    start,
    selectCashBox,
    showRefundModal,
    setShowRefundModal,
    itemId,
    setItemId,
    hideSaleId,
    dispatch,
    historyBaseParams,
    currentPage,
    isBuildingCompany,
    showBuilding,
    setShowBuilding,
    showDetailSell,
    setShowDetailSell,
    sellId,
    setSellId,
    isMarketCompany,
    showFiltersModal,
    setShowFiltersModal,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    clients,
  } = vm;

  return (
    <>
      {showAddCashboxModal && (
        <AddCashFlowsModal onClose={() => setShowAddCashboxModal(false)} />
      )}

      {showSellModal && (
        <SellModal
          id={start?.id}
          selectCashBox={selectCashBox}
          onClose={() => setShowSellModal(false)}
        />
      )}
      {showRefundModal && itemId?.id && (
        <RefundPurchase
          item={itemId}
          onClose={() => {
            setShowRefundModal(false);
            setItemId(null);
          }}
          onChanged={(updatedSale) => {
            if (
              String(updatedSale?.status || "").toLowerCase() === "canceled"
            ) {
              hideSaleId(updatedSale?.id || itemId?.id);
            }
            setShowRefundModal(false);
            dispatch(
              historySellProduct({
                ...historyBaseParams,
                search: "",
                page: currentPage,
              }),
            );
            if (isBuildingCompany) {
              dispatch(
                historySellObjects({
                  ...historyBaseParams,
                  search: "",
                  page: currentPage,
                }),
              );
            }
          }}
        />
      )}
      {showBuilding && (
        <SellBuildingModal onClose={() => setShowBuilding(false)} />
      )}
      {showDetailSell && sellId && (
        <SellDetail
          onClose={() => {
            setShowDetailSell(false);
            setSellId("");
          }}
          id={sellId}
        />
      )}
      {isMarketCompany && showFiltersModal && (
        <Modal
          open={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          title="Фильтры"
          className="sellFiltersModal"
          contentClassName="sellFiltersModal__content"
        >
          <div className="sellFiltersModal__grid">
            <label className="sellFiltersModal__field">
              <span>Дата начала</span>
              <input
                type="date"
                className="sell__filter-field"
                value={dateFrom}
                onChange={(e: any) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="sellFiltersModal__field">
              <span>Дата конца</span>
              <input
                type="date"
                className="sell__filter-field"
                value={dateTo}
                onChange={(e: any) => setDateTo(e.target.value)}
              />
            </label>
            <label className="sellFiltersModal__field">
              <span>Клиент</span>
              <select
                className="sell__filter-field"
                value={clientFilter}
                onChange={(e: any) => setClientFilter(e.target.value)}
              >
                <option value="">Все клиенты</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name || client.name || client.phone || "Клиент"}
                  </option>
                ))}
              </select>
            </label>
            <label className="sellFiltersModal__field">
              <span>Статус</span>
              <select
                className="sell__filter-field"
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
              >
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="paid">Оплаченный</option>
                <option value="debt">Долг</option>
                <option value="canceled">Отмененный</option>
              </select>
            </label>
          </div>
          <div className="sellFiltersModal__actions">
            <button
              type="button"
              className="sell__reset"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setClientFilter("");
                setStatusFilter("");
              }}
            >
              Сбросить
            </button>
            <button
              type="button"
              className="sell__header-btn"
              onClick={() => setShowFiltersModal(false)}
            >
              Применить
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
