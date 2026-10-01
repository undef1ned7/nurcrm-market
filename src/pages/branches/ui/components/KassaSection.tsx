import { useMemo } from "react";
import { FaCashRegister } from "react-icons/fa";
import { StatusChip } from "@shared/ui/page-shell";
import {
  BranchSection,
  SectionState,
  ShowMore,
  dateTime,
  money,
  useShowMore,
} from "./BranchSection";

type KassaItem = {
  id: string | number;
  created_at?: string;
  type?: string;
  amount?: number | string;
  name?: string;
  title?: string;
  description?: string;
};

type KassaSectionProps = {
  loading: boolean;
  items: KassaItem[];
};

const isIncome = (t?: string) => String(t || "").toLowerCase() === "income";

export default function KassaSection({ loading, items }: KassaSectionProps) {
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const it of items) {
      const a = Number(it.amount) || 0;
      if (isIncome(it.type)) income += a;
      else expense += a;
    }
    return { income, expense, balance: income - expense };
  }, [items]);

  const { visible, rest, more } = useShowMore(items);

  return (
    <BranchSection title="Касса" count={loading ? null : items.length}>
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaCashRegister />}
        emptyTitle="Движений по кассе нет"
        emptyText="Здесь появятся приходы и расходы кассы этого филиала."
      >
        <div className="bd-stats">
          <div className="bd-stat bd-stat--success">
            <span>Приход</span>
            <b>{money(totals.income)} сом</b>
          </div>
          <div className="bd-stat bd-stat--danger">
            <span>Расход</span>
            <b>{money(totals.expense)} сом</b>
          </div>
          <div className="bd-stat">
            <span>Сальдо</span>
            <b className={totals.balance < 0 ? "is-negative" : ""}>
              {money(totals.balance)} сом
            </b>
          </div>
          <div className="bd-stat">
            <span>Операций</span>
            <b>{items.length}</b>
          </div>
        </div>

        <div className="nur-table-wrap">
          <table className="nur-table bd-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Назначение</th>
                <th className="is-num">Сумма, сом</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const income = isIncome(item.type);
                return (
                  <tr key={item.id}>
                    <td className="bd-table__date">{dateTime(item.created_at)}</td>
                    <td>
                      <StatusChip tone={income ? "success" : "danger"}>
                        {income ? "Приход" : "Расход"}
                      </StatusChip>
                    </td>
                    <td className="bd-table__muted">
                      {item.name || item.title || item.description || "Без назначения"}
                    </td>
                    <td className={`is-num ${income ? "is-positive" : "is-negative"}`}>
                      {income ? "+" : "−"}
                      {money(item.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ShowMore rest={rest} onClick={more} />
      </SectionState>
    </BranchSection>
  );
}
