import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const tf = (k: string): string => t(`crm.sell.modals.filters.${k}`) as string;
  const {
    showAddCashboxModal,
    setShowAddCashboxModal,
    showSellModal,
    setShowSellModal,
    start,
    showRefundModal,
    setShowRefundModal,
    itemId,
    setItemId,
    handleOpenRefundFromDetail,
    handleCloseRefundModal,
    setRefundReturnToDetailId,
    canReturnSale,
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
          onClose={() => setShowSellModal(false)}
        />
      )}
      {showRefundModal && itemId?.id && (
        <RefundPurchase
          item={itemId}
          onClose={handleCloseRefundModal}
          onChanged={(updatedSale) => {
            if (
              String(updatedSale?.status || "").toLowerCase() === "canceled"
            ) {
              hideSaleId(updatedSale?.id || itemId?.id);
            }
            setShowRefundModal(false);
            setItemId(null);
            // Успешный возврат закрывает всё и обновляет список — модалку
            // деталей, из которой открыли возврат, в этом случае не восстанавливаем.
            setRefundReturnToDetailId(null);
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
          onRefund={handleOpenRefundFromDetail}
          canReturn={canReturnSale}
        />
      )}
      {isMarketCompany && showFiltersModal && (
        <Modal
          open={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          title={tf("title")}
          className="sellFiltersModal"
          contentClassName="sellFiltersModal__content"
        >
          <div className="sellFiltersModal__grid">
            <label className="sellFiltersModal__field">
              <span>{tf("dateStart")}</span>
              <input
                type="date"
                className="sell__filter-field"
                value={dateFrom}
                onChange={(e: any) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="sellFiltersModal__field">
              <span>{tf("dateEnd")}</span>
              <input
                type="date"
                className="sell__filter-field"
                value={dateTo}
                onChange={(e: any) => setDateTo(e.target.value)}
              />
            </label>
            <label className="sellFiltersModal__field">
              <span>{tf("client")}</span>
              <select
                className="sell__filter-field"
                value={clientFilter}
                onChange={(e: any) => setClientFilter(e.target.value)}
              >
                <option value="">{t("crm.sell.allClients")}</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name ||
                      client.name ||
                      client.phone ||
                      tf("clientFallback")}
                  </option>
                ))}
              </select>
            </label>
            <label className="sellFiltersModal__field">
              <span>{tf("status")}</span>
              <select
                className="sell__filter-field"
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
              >
                <option value="">{t("crm.sell.allStatuses")}</option>
                <option value="new">{tf("statusNew")}</option>
                <option value="paid">{tf("statusPaid")}</option>
                <option value="debt">{tf("statusDebt")}</option>
                <option value="partially_returned">
                  {tf("statusPartiallyReturned")}
                </option>
                <option value="canceled">{tf("statusCanceled")}</option>
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
              {t("common.reset")}
            </button>
            <button
              type="button"
              className="sell__header-btn"
              onClick={() => setShowFiltersModal(false)}
            >
              {t("common.apply")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
