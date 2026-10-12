import { useTranslation } from "react-i18next";
import { Fragment, useEffect, useRef } from "react";
import type { BranchTab } from "../branchDetails.types";

type BranchDetailsTabsProps = {
  tabs: BranchTab[];
  /** Сколько первых вкладок — базовые; после них разделитель и разделы сферы. */
  baseCount: number;
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export default function BranchDetailsTabs({
  tabs,
  baseCount,
  activeTab,
  onTabChange,
}: BranchDetailsTabsProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement>(null);

  // Вкладок много — активную держим в видимой части полосы прокрутки.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab]);

  return (
    <nav className="bd-tabs" role="tablist" aria-label={t("crm.branches.details.tabs.navAria")}>
      {tabs.map((tab, i) => {
        const Icon: any = tab.icon;
        const active = activeTab === tab.id;
        return (
          <Fragment key={tab.id}>
            {i === baseCount && i > 0 && (
              <span className="bd-tabs__divider" aria-hidden="true" />
            )}
            <button
              ref={active ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              className={`bd-tabs__tab${active ? " is-active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
