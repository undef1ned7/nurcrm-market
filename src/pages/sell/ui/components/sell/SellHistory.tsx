import { useTranslation } from "react-i18next";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import SellHistoryToolbar from "./SellHistoryToolbar";
import SellHistoryTable from "./SellHistoryTable";
import SellHistoryCards from "./SellHistoryCards";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHistory({ vm }: Props) {
  const { t } = useTranslation();
  const {
    filterField,
    shownField,
    showMoreRows,
    renderStep,
    historyView,
    listError,
    reloadHistory,
    loading,
  } = vm;

  return (
    <div className="sell__history">
      <SellHistoryToolbar vm={vm} />

      {listError ? (
        // Сбой сервера — не «Ничего не найдено»: иначе владелец решит, что продаж нет.
        <div className="sell__empty" role="alert">
          <h3>{t("crm.sell.loadError")}</h3>
          <p>{listError || t("crm.sell.loadErrorHint")}</p>
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={reloadHistory}
            disabled={loading}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : filterField.length === 0 ? (
        <div className="sell__empty">{t("common.nothingFound")}</div>
      ) : (
        <DataContainer>
          {historyView === "table" ? (
            <SellHistoryTable vm={vm} />
          ) : (
            <SellHistoryCards vm={vm} />
          )}
          {shownField.length < filterField.length && (
            <div className="sell__more">
              <span>
                {t("crm.sell.shownOf", {
                  shown: shownField.length,
                  total: filterField.length,
                })}
              </span>
              <button
                type="button"
                className="nur-btn nur-btn--secondary"
                onClick={showMoreRows}
              >
                {t("crm.sell.showMore", {
                  count: Math.min(renderStep, filterField.length - shownField.length),
                })}
              </button>
            </div>
          )}
        </DataContainer>
      )}
    </div>
  );
}
