import type { BranchTab } from "../branchDetails.types";

type BranchDetailsTabsProps = {
  tabs: BranchTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export default function BranchDetailsTabs({
  tabs,
  activeTab,
  onTabChange,
}: BranchDetailsTabsProps) {
  return (
    <div className="branch-details__tabs">
      {tabs.map((tab) => {
        const Icon: any = tab.icon;
        return (
          <button
            key={tab.id}
            className={`branch-details__tab ${
              activeTab === tab.id ? "branch-details__tab--active" : ""
            }`}
            onClick={() => {
              onTabChange(tab.id);
            }}
          >
            <Icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
