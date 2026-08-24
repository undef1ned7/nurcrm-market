import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { PAGE_SIZE } from "../../sell.constants";
import {
  dayKeyOf,
  dayLabelOf,
  formatDateTime,
  formatMoney,
  getItemsCount,
  getStatusVariant,
  translatePaymentMethod,
} from "../../sell.formatters";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHistoryTable({ vm }: Props) {
  const { t } = useTranslation();
  const {
    filterField,
    currentPage,
    isSelected,
    toggleRow,
    setSellId,
    setShowDetailSell,
    canReturnSale,
    handleOpenRefund,
  } = vm;

  return (
    <div className="sellTable__wrap">
      <table className="sellTable">
        <thead>
          <tr>
            <th />
            <th>№</th>
            <th>{t("common.status")}</th>
            <th>{t("crm.sell.product")}</th>
            <th>{t("crm.sell.payment")}</th>
            <th>{t("crm.sell.totalAmount")}</th>
            <th>{t("crm.sell.discount")}</th>
            <th>{t("crm.sell.positions")}</th>
            <th>{t("common.date")}</th>
            <th>{t("crm.sell.client")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filterField.map((item, idx) => {
            const itemsCount = getItemsCount(item);
            const discountTotal = Number(item.discount_total || 0);
            const statusLabel =
              t(`crm.sell.status.${item.status}`, {
                defaultValue: item.status || "-",
              }) || item.status || "-";
            const statusVariant = getStatusVariant(item.status);
            const saleNo = (currentPage - 1) * PAGE_SIZE + idx + 1;
            const curDay = dayKeyOf(item.created_at);
            const prevDay =
              idx > 0 ? dayKeyOf(filterField[idx - 1].created_at) : null;
            const showDaySep = curDay && curDay !== prevDay;
            return (
              <Fragment key={item.id}>
                {showDaySep && (
                  <tr className="sellTable__daySep">
                    <td colSpan={11}>{dayLabelOf(item.created_at)}</td>
                  </tr>
                )}
                <tr
                  className="sellTable__row"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSellId(item.id);
                    setShowDetailSell(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSellId(item.id);
                      setShowDetailSell(true);
                    }
                  }}
                >
                  <td
                    className="sellTable__check"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(item.id)}
                      onChange={() => toggleRow(item.id)}
                    />
                  </td>
                  <td className="sellTable__no">№ {saleNo}</td>
                  <td>
                    <span className={`sellBadge sellBadge--${statusVariant}`}>
                      {statusLabel}
                    </span>
                  </td>

                  <td className="sellTable__title">
                    {item.first_item_name || item.title || "—"}
                  </td>

                  <td>{translatePaymentMethod(item.payment_method)}</td>
                  <td className="">{formatMoney(item.total)} сом</td>
                  <td className="sellTable__money">
                    {discountTotal > 0
                      ? `-${formatMoney(discountTotal)} сом`
                      : "0 сом"}
                  </td>
                  <td className="sellTable__count">
                    {itemsCount !== null ? itemsCount : "—"}
                  </td>
                  <td className="sellTable__date">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="sellTable__client">
                    {item.client_name || "-"}
                  </td>
                  <td
                    className="sellTable__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canReturnSale(item) && (
                      <button
                        type="button"
                        className="sellTable__refund"
                        onClick={(event) => handleOpenRefund(item, event)}
                      >
                        Возврат
                      </button>
                    )}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
