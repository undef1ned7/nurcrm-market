import { Fragment } from "react";
import { kindTranslate, PAGE_SIZE } from "../../sell.constants";
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

export default function SellHistoryCards({ vm }: Props) {
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
    <div className="sell__cards">
      {filterField.map((item, idx) => {
        const itemsCount = getItemsCount(item);
        const discountTotal = Number(item.discount_total || 0);
        const statusLabel =
          kindTranslate[item.status] || item.status || "-";
        const statusVariant = getStatusVariant(item.status);
        const saleNo = (currentPage - 1) * PAGE_SIZE + idx + 1;
        const curDay = dayKeyOf(item.created_at);
        const prevDay =
          idx > 0 ? dayKeyOf(filterField[idx - 1].created_at) : null;
        const showDaySep = curDay && curDay !== prevDay;

        return (
          <Fragment key={item.id}>
            {showDaySep && (
              <div className="sell__cards-daySep">
                {dayLabelOf(item.created_at)}
              </div>
            )}
            <div
              className="sellCard"
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
              <div className="sellCard__top">
                <label
                  className="sellCard__check"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(item.id)}
                    onChange={() => toggleRow(item.id)}
                  />
                  <span className="sellCard__no">№ {saleNo}</span>
                </label>
                <div className="sellCard__right">
                  <span className={`sellBadge sellBadge--${statusVariant}`}>
                    {statusLabel}
                  </span>
                  <span className="sellCard__date">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
              </div>

              <div className="sellCard__body">
                <div className="sellCard__main">
                  <div className="sellCard__title">
                    {item.first_item_name || item.title || "—"}
                  </div>
                  <div className="sellCard__subtitle">
                    Клиент: <b>{item.client_name || "-"}</b>
                    {itemsCount !== null && itemsCount > 1 && (
                      <span className="sellCard__count">
                        + ещё {itemsCount - 1}
                      </span>
                    )}
                  </div>

                  <div className="sellCard__grid">
                    <div className="sellCard__kv">
                      <span>Оплата</span>
                      <b>{translatePaymentMethod(item.payment_method)}</b>
                    </div>
                    <div className="sellCard__kv">
                      <span>Сумма</span>
                      <b>{formatMoney(item.total)} сом</b>
                    </div>
                    <div className="sellCard__kv">
                      <span>Скидка</span>
                      <b>
                        {discountTotal > 0
                          ? `-${formatMoney(discountTotal)} сом`
                          : "0 сом"}
                      </b>
                    </div>
                    <div className="sellCard__kv">
                      <span>Документ</span>
                      <b>#{String(item.id).slice(0, 8)}</b>
                    </div>
                    <div className="sellCard__kv">
                      <span>Позиции</span>
                      <b>{itemsCount !== null ? itemsCount : "—"}</b>
                    </div>
                  </div>
                </div>

                <div
                  className="sellCard__actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canReturnSale(item) && (
                    <button
                      type="button"
                      className="sellCard__refund"
                      onClick={(event) => handleOpenRefund(item, event)}
                    >
                      Возврат
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
