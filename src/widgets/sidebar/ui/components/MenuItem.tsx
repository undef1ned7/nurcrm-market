import {
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

// Маппинг path (из URL сайдбара) в doc_type для подсветки при создании документа
const DOC_TYPE_PATH_TO_API = {
  sale: "SALE",
  purchase: "PURCHASE",
  sale_return: "SALE_RETURN",
  purchase_return: "PURCHASE_RETURN",
  inventory: "INVENTORY",
  receipt: "RECEIPT",
  write_off: "WRITE_OFF",
  transfer: "TRANSFER",
  commercial_offer: "COMMERCIAL_OFFER",
};

/**
 * Компонент для рендеринга пункта меню
 */
const MenuItem = ({
  item,
  isDropdownOpen,
  onToggleDropdown,
  closeSidebar,
  iconsOnly = false,
}) => {
  const { label, to, icon, children } = item;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const IconComponent = typeof icon === "function" ? icon() : icon;
  const isDocumentsSection =
    to?.includes("warehouse/documents") && children?.length > 0;
  const createPageDocType = searchParams.get("doc_type");
  const isOnCreatePage = location.pathname.includes(
    "warehouse/documents/create",
  );

  const shouldCloseOnClick = () => {
    const isMobile = window.innerWidth < 769;
    const sidebarAutoClose =
      localStorage.getItem("sidebarAutoClose") === "true";

    if (isMobile) {
      return true;
    }

    return sidebarAutoClose;
  };

  const closeIfNeeded = () => {
    if (shouldCloseOnClick()) {
      closeSidebar();
    }
  };

  const handleClick = (e) => {
    if (iconsOnly && children) {
      // В режиме иконок сразу переходим на родительский route
      closeIfNeeded();
      return;
    }

    if (children) {
      if (!isDropdownOpen) {
        e.preventDefault();
        onToggleDropdown();
        navigate(to);
      } else {
        e.preventDefault();
        onToggleDropdown();
        closeIfNeeded();
      }
    } else {
      closeIfNeeded();
    }
  };

  const brandCategoryPaths = [
    "/crm/warehouse/brands",
    "/crm/warehouse/categories",
    "/crm/warehouse/payment_categories",
  ];
  const isBrandCategorySection =
    to === "/crm/warehouse/brands" &&
    brandCategoryPaths.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    );

  return (
    <li
      className={`sidebar__menu-item-wrapper ${children ? "has-children" : ""}`}
    >
      <NavLink
        to={to}
        title={label}
        aria-label={label}
        className={({ isActive }) => {
          const active = isActive || isBrandCategorySection;
          return `sidebar__menu-item ${active ? "sidebar__menu-item--active" : ""}`;
        }}
        onClick={handleClick}
      >
        {IconComponent}
        <span className="sidebar__menu-label">{label}</span>
      </NavLink>
      {!iconsOnly && children && (
        <div
          className={`sidebar__submenu ${isDropdownOpen ? "open" : ""}`}
          aria-hidden={!isDropdownOpen}
        >
          <ul className="sidebar__submenu-list">
            {children.map((child) => {
              const ChildIcon =
                typeof child.icon === "function" ? child.icon() : child.icon;
              const isMoneyDocument = child.to?.includes("/money/");
              const childPathSegment = child
                .to?.split("/")
                .filter(Boolean)
                .pop();
              const childDocType = DOC_TYPE_PATH_TO_API[childPathSegment];
              const isActiveOnCreatePage =
                isDocumentsSection &&
                isOnCreatePage &&
                !isMoneyDocument &&
                childDocType &&
                createPageDocType === childDocType;
              return (
                <li key={child.label}>
                  <NavLink
                    to={child.to}
                    title={child.label}
                    aria-label={child.label}
                    className={({ isActive }) =>
                      `sidebar__submenu-item ${
                        isActive || isActiveOnCreatePage
                          ? "sidebar__submenu-item--active"
                          : ""
                      }`
                    }
                    tabIndex={isDropdownOpen ? undefined : -1}
                    onClick={closeIfNeeded}
                  >
                    {ChildIcon}
                    <span className="sidebar__menu-label">{child.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
};

export default MenuItem;
