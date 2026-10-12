import { Fragment, memo } from "react";
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

type RowProps = {
  item: any;
  saleNo: number;
  daySep: string | null;
  selected: boolean;
  canReturn: boolean;
  canExchange: boolean;
  onToggle: SellPageVm["toggleRow"];
  onOpen: SellPageVm["openSaleDetail"];
  onRefund: SellPageVm["handleOpenRefund"];
  onExchange: SellPageVm["handleOpenExchange"];
};

/**
 * Строка истории мемоизирована: галочка, «Выбрать все» и открытие модалок
 * перерисовывают только строки, у которых что-то поменялось.
 */
const SellHistoryRow = memo(function SellHistoryRow({
  item,
  saleNo,
  daySep,
  selected,
  canReturn,
  canExchange,
  onToggle,
  onOpen,
  onRefund,
  onExchange,
}: RowProps) {
  const { t } = useTranslation();
  const itemsCount = getItemsCount(item);
  const discountTotal = Number(item.discount_total || 0);
  const statusLabel =
    t(`crm.sell.status.${item.status}`, {
      defaultValue: item.status || "-",
    }) || item.status || "-";
  const statusVariant = getStatusVariant(item.status);

  return (
    <Fragment>
      {daySep && (
        <tr className="sellTable__daySep">
          <td colSpan={11}>{daySep}</td>
        </tr>
      )}
      <tr
        className="sellTable__row"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item.id)}
        onKeyDown={(e) => {
          // Только когда фокус на самой строке: Enter с кнопки «Возврат»
          // (или из открытой поверх модалки) не должен открывать детали.
          if (e.key === "Enter" && e.target === e.currentTarget) {
            onOpen(item.id);
          }
        }}
      >
        <td
          className="sellTable__check"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
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
          {canReturn && (
            <button
              type="button"
              className="sellTable__refund"
              onClick={(event) => onRefund(item, event)}
            >
              {t("crm.sell.refundModal.returnBtn")}
            </button>
          )}
          {canExchange && (
            <button
              type="button"
              className="sellTable__refund sellTable__exchange"
              onClick={(event) => onExchange(item, event)}
            >
              {t("crm.sphere.exchange.button")}
            </button>
          )}
        </td>
      </tr>
    </Fragment>
  );
});

export default function SellHistoryTable({ vm }: Props) {
  const { t } = useTranslation();
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
            const curDay = dayKeyOf(item.created_at);
            const prevDay =
              idx > 0 ? dayKeyOf(filterField[idx - 1].created_at) : null;
            return (
              <SellHistoryRow
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
        </tbody>
      </table>
    </div>
  );
}
