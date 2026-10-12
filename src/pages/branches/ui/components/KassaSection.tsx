import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    <BranchSection title={t("crm.branches.details.kassa.title")} count={loading ? null : items.length}>
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaCashRegister />}
        emptyTitle={t("crm.branches.details.kassa.emptyTitle")}
        emptyText={t("crm.branches.details.kassa.emptyText")}
      >
        <div className="bd-stats">
          <div className="bd-stat bd-stat--success">
            <span>{t("crm.branches.details.kassa.income")}</span>
            <b>{money(totals.income)} {t("common.currencySom")}</b>
          </div>
          <div className="bd-stat bd-stat--danger">
            <span>{t("crm.branches.details.kassa.expense")}</span>
            <b>{money(totals.expense)} {t("common.currencySom")}</b>
          </div>
          <div className="bd-stat">
            <span>{t("crm.branches.details.kassa.balance")}</span>
            <b className={totals.balance < 0 ? "is-negative" : ""}>
              {money(totals.balance)} {t("common.currencySom")}
            </b>
          </div>
          <div className="bd-stat">
            <span>{t("crm.branches.details.kassa.operations")}</span>
            <b>{items.length}</b>
          </div>
        </div>

        <div className="nur-table-wrap">
          <table className="nur-table bd-table">
            <thead>
              <tr>
                <th>{t("crm.branches.details.kassa.table.date")}</th>
                <th>{t("crm.branches.details.kassa.table.type")}</th>
                <th>{t("crm.branches.details.kassa.table.purpose")}</th>
                <th className="is-num">{t("crm.branches.details.kassa.table.amount")}</th>
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
                        {income ? t("crm.branches.details.kassa.income") : t("crm.branches.details.kassa.expense")}
                      </StatusChip>
                    </td>
                    <td className="bd-table__muted">
                      {item.name || item.title || item.description || t("crm.branches.details.kassa.noPurpose")}
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
