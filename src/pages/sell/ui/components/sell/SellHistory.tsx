import DataContainer from "@shared/ui/DataContainer/DataContainer";
import SellHistoryToolbar from "./SellHistoryToolbar";
import SellHistoryTable from "./SellHistoryTable";
import SellHistoryCards from "./SellHistoryCards";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHistory({ vm }: Props) {
  const { filterField, historyView } = vm;

  return (
    <div className="sell__history">
      <SellHistoryToolbar vm={vm} />

      {filterField.length === 0 ? (
        <div className="sell__empty">Ничего не найдено</div>
      ) : (
        <DataContainer>
          {historyView === "table" ? (
            <SellHistoryTable vm={vm} />
          ) : (
            <SellHistoryCards vm={vm} />
          )}
        </DataContainer>
      )}
    </div>
  );
}
