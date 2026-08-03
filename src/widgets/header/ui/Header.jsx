import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, ShoppingCart } from "lucide-react";
import { useDispatch } from "react-redux";
import { useUser } from "@entities/user";
import NotificationModal from "@widgets/notification-modal/ui/NotificationModal";
import { fetchNotificationsAsync } from "@entities/notification";
import { useNotificationsSocket } from "@entities/notification/lib/useNotificationsSocket";
import { useEffect, useState } from "react";
import "./Header.scss";

const pageTitles = {
  "/login": "Вход",
  "/crm/set": "Настройки",
  "/crm/pos-print-settings": "Печать чеков",
  "/crm/market/cashier": "Касса",
  "/crm/market/analytics": "Аналитика",
  "/crm/market/history": "История",
  "/crm/market/documents": "Документы",
  "/crm/market/documents/create": "Новый документ",
  "/crm/market/procurement": "Закупки",
  "/crm/market/procurement/receipt": "Приёмка",
  "/crm/market/suppliers": "Поставщики",
  "/crm/market/categories": "Категории",
  "/crm/sklad": "Склад",
  "/crm/sklad/add-product": "Товар",
  "/crm/clients": "Клиенты",
  "/crm/sell": "Продажи",
  "/crm/kassa": "Касса",
  "/crm/employ": "Сотрудники",
  "/crm/shifts": "Смены",
  "/crm/branch": "Филиалы",
  "/crm/debts": "Долги",
  "/crm/barcodes": "Штрихкоды",
  "/crm/scales": "Весы",
  "/crm/brand-category": "Бренд и категория",
  "/crm/additional-services": "Доп. услуги",
};

function resolvePageTitle(pathname) {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  let bestKey = "";
  let bestTitle = null;
  for (const key of Object.keys(pageTitles)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      if (key.length > bestKey.length) {
        bestKey = key;
        bestTitle = pageTitles[key];
      }
    }
  }
  return bestTitle ?? "Магазин";
}

const Header = ({ toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const title = resolvePageTitle(location.pathname);
  const { profile: userProfile } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);

  useNotificationsSocket();

  useEffect(() => {
    dispatch(fetchNotificationsAsync());
  }, [dispatch]);

  const showCashierButton = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.can_view_cashier === true;
  }, [userProfile]);

  const usernameToDisplay = userProfile
    ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
      userProfile.email
    : "Гость";

  return (
    <div className="header">
      <div className="header__left">
        <div className="header__burger" onClick={toggleSidebar}>
          <Menu size={24} />
        </div>
        <h2 className="header__title">{title}</h2>
      </div>
      <div className="header__right">
        {showCashierButton && (
          <button
            className="header__cashier-btn"
            onClick={() => navigate("/crm/market/cashier")}
            title="Касса"
            type="button"
          >
            <ShoppingCart size={20} />
            <span>Касса</span>
          </button>
        )}
        <button
          className="header__notify-btn"
          type="button"
          title="Уведомления"
          onClick={() => setShowNotifications(true)}
        >
          <Bell size={20} />
        </button>
        <div
          className="header__profile cursor-pointer"
          onClick={() => {
            if (!userProfile) return;
            navigate("/crm/set");
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" && userProfile) navigate("/crm/set");
          }}
        >
          <div className="header__avatar">
            {usernameToDisplay
              ? usernameToDisplay.charAt(0).toUpperCase()
              : "?"}
          </div>
          <span className="header__username">{usernameToDisplay}</span>
        </div>
      </div>
      {showNotifications && (
        <NotificationModal onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
};

export default Header;
