import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Menu, ShoppingCart, X } from "lucide-react";
import { useUser } from "@entities/user";
import NotificationModal from "@widgets/notification-modal/ui/NotificationModal";
import {
  fetchNotificationsAsync,
  formatUnreadBadge,
} from "@entities/notification";
import { usePageChrome } from "@shared/ui/page-shell";
import "./Header.scss";
import { useAppDispatch, useAppSelector } from "@app/store";
import {
  getLatestDesktopCashierDownloadUrl,
  isCashierDesktopButtonEnabled,
  triggerFileDownload,
} from "@shared/lib/desktopCashierApp";

function resolvePageMeta(pathname: string, t: ReturnType<typeof useTranslation>["t"]) {
  const pages = t("header.pages", { returnObjects: true }) as unknown as Record<
    string,
    string
  >;
  const descriptions = t("header.descriptions", {
    returnObjects: true,
  }) as unknown as Record<string, string>;

  const exactTitle = pages[pathname];
  const exactDesc = descriptions[pathname];
  if (exactTitle) {
    return { title: exactTitle, description: exactDesc ?? null };
  }

  let bestKey = "";
  let bestTitle: string | null = null;
  for (const key of Object.keys(pages)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      if (key.length > bestKey.length) {
        bestKey = key;
        bestTitle = pages[key];
      }
    }
  }

  let desc: string | null = null;
  let descKey = "";
  for (const key of Object.keys(descriptions)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      if (key.length > descKey.length) {
        descKey = key;
        desc = descriptions[key];
      }
    }
  }

  return { title: bestTitle ?? t("header.defaultTitle"), description: desc };
}

type HeaderProps = {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

const Header = ({ isSidebarOpen = false, onToggleSidebar }: HeaderProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const routeMeta = useMemo(
    () => resolvePageMeta(location.pathname, t),
    [location.pathname, t],
  );
  const { meta, actions } = usePageChrome();
  const title = meta?.title ?? routeMeta.title;
  const description = meta?.subtitle ?? routeMeta.description;
  const { profile: userProfile } = useUser();
  const unreadCount = useAppSelector(
    (state) => Number(state.notification?.unreadCount) || 0,
  );
  const unreadBadge = formatUnreadBadge(unreadCount);
  const [showNotifications, setShowNotifications] = useState(false);
  const [downloadingCashier, setDownloadingCashier] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationsAsync({} as any) as any);
  }, [dispatch]);

  const showCashierButton =
    Boolean(userProfile) && userProfile.can_view_cashier === true;

  const handleCashierClick = async () => {
    if (!isCashierDesktopButtonEnabled()) {
      navigate("/crm/market/cashier");
      return;
    }
    if (downloadingCashier) return;
    setDownloadingCashier(true);
    try {
      const url = await getLatestDesktopCashierDownloadUrl();
      triggerFileDownload(url);
    } finally {
      setDownloadingCashier(false);
    }
  };

  const usernameToDisplay = userProfile
    ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
      userProfile.email
    : t("header.guest");

  return (
    <header className="header">
      <div className="header__left">
        {onToggleSidebar ? (
          <button
            type="button"
            className="header__menu-btn"
            onClick={onToggleSidebar}
            title={
              isSidebarOpen
                ? t("crm.nav.chrome.collapseMenu")
                : t("crm.nav.chrome.openMenu")
            }
            aria-label={
              isSidebarOpen
                ? t("crm.nav.chrome.collapseMenu")
                : t("crm.nav.chrome.openMenu")
            }
            aria-expanded={isSidebarOpen}
            aria-controls="app-sidebar"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        ) : null}
        <div className="header__title-wrap">
          <h1 className="header__title">{title}</h1>
          {description ? (
            <p className="header__subtitle">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="header__right">
        <div className="header__page-actions-host" data-page-actions>
          {actions}
        </div>
        {showCashierButton && (
          <button
            className="header__cashier-btn"
            onClick={handleCashierClick}
            title={
              isCashierDesktopButtonEnabled()
                ? t("header.downloadCashier")
                : t("header.openCashier")
            }
            type="button"
            aria-label={
              isCashierDesktopButtonEnabled()
                ? t("header.downloadCashier")
                : t("header.openCashier")
            }
            disabled={downloadingCashier}
          >
            <ShoppingCart size={18} />
            <span>
              {downloadingCashier
                ? t("header.downloadingCashier")
                : t("header.cashier")}
            </span>
          </button>
        )}
        <button
          className="header__notify-btn"
          type="button"
          title={t("header.notifications")}
          aria-label={
            unreadBadge
              ? `${t("header.notifications")}: ${unreadBadge}`
              : t("header.notifications")
          }
          onClick={() => setShowNotifications(true)}
        >
          <Bell size={18} />
          {unreadBadge ? (
            <span className="header__notify-badge" aria-hidden="true">
              {unreadBadge}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="header__profile"
          onClick={() => {
            if (!userProfile) return;
            navigate("/crm/set");
          }}
          title={t("header.profileSettings")}
          aria-label={t("header.profileSettings")}
        >
          <div className="header__avatar" aria-hidden="true">
            {usernameToDisplay
              ? usernameToDisplay.charAt(0).toUpperCase()
              : "?"}
          </div>
          <span className="header__username">{usernameToDisplay}</span>
        </button>
      </div>
      {showNotifications && (
        <NotificationModal onClose={() => setShowNotifications(false)} />
      )}
    </header>
  );
};

export default Header;
