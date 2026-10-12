import { Fragment, memo } from "react";
import { useTranslation } from "react-i18next";
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

type CardProps = {
  item: any;
  saleNo: number;
  daySep: string | null;
  selected: boolean;
  canReturn: boolean;
  onToggle: SellPageVm["toggleRow"];
  onOpen: SellPageVm["openSaleDetail"];
  onRefund: SellPageVm["handleOpenRefund"];
  onExchange: SellPageVm["handleOpenExchange"];
  canExchange: boolean;
};

/** Карточка мемоизирована по той же причине, что и строка таблицы. */
const SellHistoryCard = memo(function SellHistoryCard({
  item,
  saleNo,
  daySep,
  selected,
  canReturn,
  onToggle,
  onOpen,
  onRefund,
  onExchange,
  canExchange,
}: CardProps) {
  const { t } = useTranslation();
  const itemsCount = getItemsCount(item);
  const discountTotal = Number(item.discount_total || 0);
  const statusLabel = kindTranslate[item.status] || item.status || "-";
  const statusVariant = getStatusVariant(item.status);

  return (
    <Fragment>
      {daySep && <div className="sell__cards-daySep">{daySep}</div>}
      <div
        className="sellCard"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => {
          // Только когда фокус на самой карточке, а не на её кнопке/галочке
          if (e.key === "Enter" && e.target === e.currentTarget) {
            onOpen(item.id);
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
              checked={selected}
              onChange={() => onToggle(item.id)}
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
            {canReturn && (
              <button
                type="button"
                className="sellCard__refund"
                onClick={(event) => onRefund(item, event)}
              >
                {t("crm.sell.refundModal.returnBtn")}
              </button>
            )}
            {canExchange && (
              <button
                type="button"
                className="sellCard__refund sellCard__exchange"
                onClick={(event) => onExchange(item, event)}
              >
                {t("crm.sphere.exchange.button")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
});

export default function SellHistoryCards({ vm }: Props) {
  const {
    shownField: filterField,
    currentPage,
    isSelected,
    toggleRow,
    openSaleDetail,
    canReturnSale,
    handleOpenRefund,
    canExchangeSale,
    handleOpenExchange,
  } = vm;

  return (
    <div className="sell__cards">
      {filterField.map((item, idx) => {
        const curDay = dayKeyOf(item.created_at);
        const prevDay =
          idx > 0 ? dayKeyOf(filterField[idx - 1].created_at) : null;
        return (
          <SellHistoryCard
            key={item.id}
            item={item}
            saleNo={(currentPage - 1) * PAGE_SIZE + idx + 1}
            daySep={curDay && curDay !== prevDay ? dayLabelOf(item.created_at) : null}
            selected={isSelected(item.id)}
            canReturn={canReturnSale(item)}
            canExchange={canExchangeSale(item)}
            onExchange={handleOpenExchange}
            onToggle={toggleRow}
            onOpen={openSaleDetail}
            onRefund={handleOpenRefund}
          />
        );
      })}
    </div>
  );
}
