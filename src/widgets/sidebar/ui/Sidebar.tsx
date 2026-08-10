import { useEffect, useRef, useState } from "react";
import { useUser, getProfile } from "@entities/user";
import { useMenuItems } from "./hooks/useMenuItems";
import MenuItem from "./components/MenuItem";
import "./Sidebar.scss";
import { Menu, Settings, X } from "lucide-react";

import Logo from "@shared/ui/Photo/logo2.png";
import { useLocation, useNavigate } from "react-router-dom";
import { getCompany } from "@entities/user";
import { groupMenuItems } from "./config/menuGroups";
import { useAppDispatch } from "@app/store";

const Sidebar = ({ isOpen, toggleSidebar, closeSidebar }: any) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { company, profile, tariff, sector } = useUser();
  const [openDropdown, setOpenDropdown] = useState<any>(null);

  const location = useLocation();
  const menuRef = useRef<any>(null);
  const pathnameRef = useRef(location.pathname);
  const openDropdownRef = useRef(openDropdown);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    openDropdownRef.current = openDropdown;
  }, [openDropdown]);

  useEffect(() => {
    const p = location.pathname;
    if (p.includes("warehouse/documents")) {
      setOpenDropdown((prev) => (prev === "Документы" ? prev : "Документы"));
      return;
    }
    if (
      p.startsWith("/crm/additional-services") ||
      p.startsWith("/crm/instagram") ||
      p.startsWith("/crm/documents") ||
      p.startsWith("/crm/barcodes") ||
      p.startsWith("/crm/scales")
    ) {
      setOpenDropdown((prev) => (prev === "Доп услуги" ? prev : "Доп услуги"));
      return;
    }
    setOpenDropdown(null);
  }, [location.pathname]);

  const currentTariff = tariff || company?.subscription_plan?.name || "Старт";
  const currentSector = sector || company?.sector?.name;

  const menuItems = useMenuItems(
    company,
    currentSector,
    currentTariff,
    profile
  );

  const menuSections = groupMenuItems(menuItems);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        const pathname = pathnameRef.current || "";
        const currentOpen = openDropdownRef.current;
        const isWarehouseDocuments = pathname.includes("warehouse/documents");
        const isDocumentsDropdownOpen = currentOpen === "Документы";
        if (isWarehouseDocuments && isDocumentsDropdownOpen) return;

        const isAdditionalPaths =
          pathname.startsWith("/crm/additional-services") ||
          pathname.startsWith("/crm/instagram") ||
          pathname.startsWith("/crm/documents") ||
          pathname.startsWith("/crm/barcodes") ||
          pathname.startsWith("/crm/scales");
        if (isAdditionalPaths && currentOpen === "Доп услуги") return;

        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }
  }, [location.pathname]);

  const handleToggleDropdown = (itemLabel) => {
    setOpenDropdown(openDropdown === itemLabel ? null : itemLabel);
  };

  useEffect(() => {
    dispatch(getCompany({} as any) as any);
    dispatch(getProfile({} as any) as any);
  }, [dispatch]);

  const isLoading = !company || !profile;
  useEffect(() => {
    if (
      location.pathname.includes("crm") &&
      location.pathname.split("/").map((el) => el.trim()).filter(Boolean)
        .length == 1 &&
      menuItems.length &&
      !isLoading
    ) {
      const first = menuItems.at(0)?.to;
      if (first) navigate(first);
    }
  }, [menuItems, isLoading, location.pathname, navigate]);

  const brandTitle = company?.name?.trim() || "NUR CRM";
  const brandSubtitle = currentSector || "Магазин";

  return (
    <aside
      className={`sidebar ${isOpen ? "sidebar--visible" : "sidebar--collapsed"}`}
      aria-label="Основная навигация"
    >
      <div className="sidebar__header">
        <div className="sidebar__brand-row">
          <button
            type="button"
            className="sidebar__logo"
            onClick={() => {
              if (!isOpen) toggleSidebar();
            }}
            aria-label={isOpen ? "NUR CRM" : "Открыть меню"}
          >
            <img
              src={Logo}
              alt="NUR CRM"
              className={
                isOpen
                  ? "sidebar__logo-img"
                  : "sidebar__logo-img sidebar__logo-img--rail"
              }
            />
          </button>

          {isOpen && (
            <div className="sidebar__brand">
              <div className="sidebar__brand-title" title={brandTitle}>
                {brandTitle}
              </div>
              <div className="sidebar__brand-subtitle" title={brandSubtitle}>
                {brandSubtitle}
              </div>
            </div>
          )}
        </div>

        {isOpen && (
          <button
            className="sidebar__close-btn"
            onClick={toggleSidebar}
            aria-label="Свернуть меню"
            type="button"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="sidebar__wrapper">
        {isLoading && (
          <div className="sidebar__loading">
            <div className="sidebar__loading-spinner" />
            {isOpen && (
              <p className="sidebar__loading-text">Загрузка меню…</p>
            )}
          </div>
        )}

        <nav className="sidebar__nav" ref={menuRef}>
          {!isLoading &&
            menuSections.map((section) => (
              <div key={section.label} className="sidebar__section">
                <div className="sidebar__section-label">{section.label}</div>
                <ul className="sidebar__menu">
                  {section.items.map((item) => (
                    <MenuItem
                      key={item.label}
                      item={item}
                      isDropdownOpen={isOpen && openDropdown === item.label}
                      onToggleDropdown={() =>
                        handleToggleDropdown(item.label)
                      }
                      closeSidebar={closeSidebar}
                      iconsOnly={!isOpen}
                    />
                  ))}
                </ul>
              </div>
            ))}
        </nav>
      </div>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__footer-btn"
          title="Настройки"
          aria-label="Настройки"
          onClick={() => navigate("/crm/set")}
        >
          <Settings size={20} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="sidebar__footer-btn"
          title={isOpen ? "Свернуть меню" : "Открыть меню"}
          aria-label={isOpen ? "Свернуть меню" : "Открыть меню"}
          onClick={toggleSidebar}
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
