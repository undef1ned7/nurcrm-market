import { useTranslation } from "react-i18next";
import { FaFolderOpen } from "react-icons/fa";
import {
  getSectorRowValues,
  getSectorTableColumns,
} from "../branchDetails.utils";
import { BranchSection, SectionState, ShowMore, useShowMore } from "./BranchSection";

type SectorTabSectionProps = {
  label: string;
  route: string;
  loading: boolean;
  items: Array<Record<string, any>>;
};

export default function SectorTabSection({
  label,
  route,
  loading,
  items,
}: SectorTabSectionProps) {
  const { t } = useTranslation();
  const routeLower = route.toLowerCase();
  const columns = getSectorTableColumns(routeLower);
  const { visible, rest, more } = useShowMore(items);

  return (
    <BranchSection title={label} count={loading ? null : items.length}>
      <SectionState
        loading={loading}
        empty={items.length === 0}
        icon={<FaFolderOpen />}
        emptyTitle={t("crm.branches.details.sector.emptyTitle")}
        emptyText={t("crm.branches.details.sector.emptyText", { label })}
      >
        <div className="nur-table-wrap">
          <table className="nur-table bd-table">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item, i) => {
                const values = getSectorRowValues(item, routeLower);
                return (
                  <tr key={item.id || item.uuid || i}>
                    {values.map((val, idx) => (
                      <td key={idx}>{val}</td>
                    ))}
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
