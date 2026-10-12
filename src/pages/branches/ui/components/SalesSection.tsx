import { useTranslation } from "react-i18next";
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

// labelKey переводится при рендере.
const STATUS: Record<string, { labelKey: string; tone: string }> = {
  paid: { labelKey: "crm.branches.details.sales.status.paid", tone: "success" },
  new: { labelKey: "crm.branches.details.sales.status.new", tone: "info" },
  debt: { labelKey: "crm.branches.details.sales.status.debt", tone: "warning" },
  canceled: { labelKey: "crm.branches.details.sales.status.canceled", tone: "danger" },
  cancelled: { labelKey: "crm.branches.details.sales.status.canceled", tone: "danger" },
  partially_returned: {
    labelKey: "crm.branches.details.sales.status.partiallyReturned",
    tone: "warning",
  },
  returned: { labelKey: "crm.branches.details.sales.status.returned", tone: "danger" },
};

const statusOf = (s: string | undefined, t: (key: string) => string) => {
  const known = STATUS[String(s || "").toLowerCase()];
  return known
    ? { label: t(known.labelKey), tone: known.tone }
    : { label: s || "—", tone: "default" };
};

export default function SalesSection({ items }: SalesSectionProps) {
  const { t } = useTranslation();
  const total = useMemo(
    () => items.reduce((a, it) => a + (Number(it.total ?? it.amount) || 0), 0),
    [items],
  );
  const { visible, rest, more } = useShowMore(items);

  return (
    <BranchSection title={t("crm.branches.details.sales.title")} count={items.length}>
      <SectionState
        empty={items.length === 0}
        icon={<FaShoppingCart />}
        emptyTitle={t("crm.branches.details.sales.emptyTitle")}
        emptyText={t("crm.branches.details.sales.emptyText")}
      >
        <div className="bd-stats">
          <div className="bd-stat">
            <span>{t("crm.branches.details.sales.count")}</span>
            <b>{items.length}</b>
          </div>
          <div className="bd-stat bd-stat--success">
            <span>{t("crm.branches.details.sales.revenue")}</span>
            <b>{money(total)} {t("common.currencySom")}</b>
          </div>
          <div className="bd-stat">
            <span>{t("crm.branches.details.sales.averageCheck")}</span>
            <b>{money(items.length ? total / items.length : 0)} {t("common.currencySom")}</b>
          </div>
        </div>

        <div className="nur-table-wrap">
          <table className="nur-table bd-table">
            <thead>
              <tr>
                <th>{t("crm.branches.details.sales.table.date")}</th>
                <th>{t("crm.branches.details.sales.table.client")}</th>
                <th>{t("crm.branches.details.sales.table.status")}</th>
                <th className="is-num">{t("crm.branches.details.sales.table.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const st = statusOf(item.status, t);
                return (
                  <tr key={item.id}>
                    <td className="bd-table__date">{dateTime(item.created_at)}</td>
                    <td>{item.client_display || item.client_name || t("crm.branches.details.sales.noClient")}</td>
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
