import { useMemo } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { StatusChip } from "@shared/ui/page-shell";
import {
  BranchSection,
  SectionState,
  ShowMore,
  dateTime,
  money,
  useShowMore,
} from "./BranchSection";

type SalesSectionProps = {
  items: Array<{
    id: string | number;
    created_at?: string;
    total?: number;
    amount?: number;
    status?: string;
    client_display?: string;
    client_name?: string;
  }>;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "Оплачена", tone: "success" },
  new: { label: "Новая", tone: "info" },
  debt: { label: "В долг", tone: "warning" },
  canceled: { label: "Отменена", tone: "danger" },
  cancelled: { label: "Отменена", tone: "danger" },
  partially_returned: { label: "Частичный возврат", tone: "warning" },
  returned: { label: "Возврат", tone: "danger" },
};

const statusOf = (s?: string) =>
  STATUS[String(s || "").toLowerCase()] || { label: s || "—", tone: "default" };

export default function SalesSection({ items }: SalesSectionProps) {
  const total = useMemo(
    () => items.reduce((a, it) => a + (Number(it.total ?? it.amount) || 0), 0),
    [items],
  );
  const { visible, rest, more } = useShowMore(items);

  return (
    <BranchSection title="Продажи" count={items.length}>
      <SectionState
        empty={items.length === 0}
        icon={<FaShoppingCart />}
        emptyTitle="Продаж пока нет"
        emptyText="Продажи кассы этого филиала появятся здесь."
      >
        <div className="bd-stats">
          <div className="bd-stat">
            <span>Продаж</span>
            <b>{items.length}</b>
          </div>
          <div className="bd-stat bd-stat--success">
            <span>Выручка</span>
            <b>{money(total)} сом</b>
          </div>
          <div className="bd-stat">
            <span>Средний чек</span>
            <b>{money(items.length ? total / items.length : 0)} сом</b>
          </div>
        </div>

        <div className="nur-table-wrap">
          <table className="nur-table bd-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Статус</th>
                <th className="is-num">Сумма, сом</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const st = statusOf(item.status);
                return (
                  <tr key={item.id}>
                    <td className="bd-table__date">{dateTime(item.created_at)}</td>
                    <td>{item.client_display || item.client_name || "Без клиента"}</td>
                    <td>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </td>
                    <td className="is-num">{money(item.total ?? item.amount)}</td>
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
