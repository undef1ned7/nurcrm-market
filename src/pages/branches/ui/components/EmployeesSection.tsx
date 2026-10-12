import { useTranslation } from "react-i18next";
import { FaUsers } from "react-icons/fa";
import { StatusChip } from "@shared/ui/page-shell";
import { BranchSection, SectionState, initials } from "./BranchSection";

type EmployeesSectionProps = {
  loading: boolean;
  items: Array<{
    id: string | number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    role_display?: string;
    role?: string;
  }>;
};

export default function EmployeesSection({ loading, items }: EmployeesSectionProps) {
  const { t } = useTranslation();
  return (
    <BranchSection title={t("crm.branches.details.employees.title")} count={loading ? null : items.length}>
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaUsers />}
        emptyTitle={t("crm.branches.details.employees.emptyTitle")}
        emptyText={t("crm.branches.details.employees.emptyText")}
      >
        <ul className="bd-people">
          {items.map((item) => {
            const name =
              `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
              item.email ||
              t("crm.branches.details.employees.noName");
            return (
              <li key={item.id} className="bd-person">
                <span className="bd-person__avatar" aria-hidden="true">
                  {initials(name)}
                </span>
                <span className="bd-person__info">
                  <b>{name}</b>
                  <span>{[item.email, item.phone_number].filter(Boolean).join(" · ") || "—"}</span>
                </span>
                {(item.role_display || item.role) && (
                  <StatusChip>{item.role_display || item.role}</StatusChip>
                )}
              </li>
            );
          })}
        </ul>
      </SectionState>
    </BranchSection>
  );
}
