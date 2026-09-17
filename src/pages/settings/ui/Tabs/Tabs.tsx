import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./Tabs.scss";
import { canAccessOnlineShowcase } from "@shared/lib/subscriptionPlan";
import { FilterBar } from "@shared/ui/page-shell";
import {
  ALL_SETTINGS_TABS,
  SETTINGS_TABS,
  type SettingsTabId,
} from "../settingsTabs";

const Tabs = ({ activeTab, setActiveTab, company, profile }) => {
  const { t } = useTranslation();
  const sectorName = useMemo(
    () => String(company?.sector?.name || "").toLowerCase().trim(),
    [company?.sector?.name],
  );

  const isMarketSector = useMemo(() => {
    return (
      sectorName === "магазин" ||
      sectorName === "цветочный магазин" ||
      sectorName.includes("магазин")
    );
  }, [sectorName]);

  const isBarberSector = useMemo(() => {
    return (
      sectorName === "барбершоп" ||
      sectorName === "услуги" ||
      sectorName === "стоматология" ||
      sectorName === "салон красоты" ||
      sectorName.includes("барбер") ||
      sectorName.includes("парикмахер")
    );
  }, [sectorName]);

  const isCafeSector = useMemo(() => {
    return (
      sectorName === "кафе" ||
      sectorName.includes("кафе") ||
      sectorName.includes("ресторан")
    );
  }, [sectorName]);

  const isProductionSector = useMemo(() => {
    return (
      sectorName === "производство" ||
      sectorName === "production" ||
      sectorName.includes("производ")
    );
  }, [sectorName]);

  const isOwner = useMemo(() => profile?.role === "owner", [profile?.role]);
  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);
  const canViewMarketCashierSettings = useMemo(
    () => isMarketSector && (isOwner || isAdmin),
    [isMarketSector, isOwner, isAdmin],
  );
  // «Запросы на кассе» доступны владельцу/админу любой сферы — вкладка «Касса»
  // видна и им, даже если рыночные поля (код удаления, лимит скидки) скрыты.
  const canViewCashierTab = useMemo(
    () => canViewMarketCashierSettings || isOwner || isAdmin,
    [canViewMarketCashierSettings, isOwner, isAdmin],
  );

  const canViewOnline = useMemo(() => {
    const hasSlug = Boolean(company?.slug);
    const canViewShowcase = Boolean(profile?.can_view_showcase);
    const hasSectorWithOnline =
      isBarberSector || isCafeSector || isMarketSector || isProductionSector;
    if (!hasSlug || !hasSectorWithOnline) return false;
    return canAccessOnlineShowcase({
      tariffName: company?.subscription_plan?.name,
      sectorName: company?.sector?.name,
      isOwner,
      canViewShowcase,
    });
  }, [
    company?.slug,
    company?.subscription_plan?.name,
    company?.sector?.name,
    profile?.can_view_showcase,
    isOwner,
    isBarberSector,
    isCafeSector,
    isMarketSector,
    isProductionSector,
  ]);

  const visibleTabs = useMemo(() => {
    return ALL_SETTINGS_TABS.filter((tab: SettingsTabId) => {
      if (tab === SETTINGS_TABS.company) return isOwner;
      if (tab === SETTINGS_TABS.subscription) return isOwner;
      if (tab === SETTINGS_TABS.cashier) return canViewCashierTab;
      if (tab === SETTINGS_TABS.scalesToken) return isMarketSector;
      if (tab === SETTINGS_TABS.print) return isCafeSector;
      if (tab === SETTINGS_TABS.online) return canViewOnline;
      return true;
    });
  }, [
    isOwner,
    isMarketSector,
    isCafeSector,
    canViewOnline,
    canViewCashierTab,
  ]);

  return (
    <FilterBar className="settings-tabs">
      {visibleTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`settings-tabs__item ${activeTab === tab ? "settings-tabs__item--active" : ""}`}
          onClick={() => setActiveTab(tab)}
        >
          {t(`settings.tabs.${tab}`)}
        </button>
      ))}
    </FilterBar>
  );
};

export default Tabs;
