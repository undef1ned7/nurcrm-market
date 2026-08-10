import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ShoppingCart } from "lucide-react";
import { useUser } from "@entities/user";
import NotificationModal from "@widgets/notification-modal/ui/NotificationModal";
import { fetchNotificationsAsync } from "@entities/notification";
import { useNotificationsSocket } from "@entities/notification/lib/useNotificationsSocket";
import { usePageChrome } from "@shared/ui/page-shell";
import "./Header.scss";
import { useAppDispatch } from "@app/store";

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

const pageDescriptions = {
  "/crm/sklad": "Товары, остатки и операции склада",
  "/crm/clients": "Клиенты и контрагенты",
  "/crm/market/analytics": "Показатели продаж и динамика",
  "/crm/market/cashier": "Продажи и оплата",
  "/crm/sell": "История и управление продажами",
  "/crm/shifts": "Открытие, закрытие и отчёты смен",
  "/crm/debts": "Долги клиентов и погашения",
  "/crm/set": "Компания, пользователи и безопасность",
  "/crm/branch": "Филиалы и точки продаж",
  "/crm/market/documents": "Накладные, чеки и акты",
  "/crm/market/history": "История продаж",
  "/crm/employ": "Сотрудники и роли",
  "/crm/kassa": "Кассовые операции",
  "/crm/market/procurement": "Список оприходований поставщиков",
};

function resolvePageMeta(pathname: any) {
  const exactTitle = pageTitles[pathname];
  const exactDesc = pageDescriptions[pathname];
  if (exactTitle) {
    return { title: exactTitle, description: exactDesc ?? null };
  }

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

  let desc = null;
  let descKey = "";
  for (const key of Object.keys(pageDescriptions)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      if (key.length > descKey.length) {
        descKey = key;
        desc = pageDescriptions[key];
      }
    }
  }

  return { title: bestTitle ?? "Магазин", description: desc };
}

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const routeMeta = resolvePageMeta(location.pathname);
  const { meta, actions } = usePageChrome();
  const title = meta?.title ?? routeMeta.title;
  const description = meta?.subtitle ?? routeMeta.description;
  const { profile: userProfile } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);

  useNotificationsSocket();

  useEffect(() => {
    dispatch(fetchNotificationsAsync({} as any) as any);
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
    <header className="header">
      <div className="header__left">
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
            onClick={() => navigate("/crm/market/cashier")}
            title="Открыть кассу"
            type="button"
            aria-label="Открыть кассу"
          >
            <ShoppingCart size={18} />
            <span>Касса</span>
          </button>
        )}
        <button
          className="header__notify-btn"
          type="button"
          title="Уведомления"
          aria-label="Уведомления"
          onClick={() => setShowNotifications(true)}
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="header__profile"
          onClick={() => {
            if (!userProfile) return;
            navigate("/crm/set");
          }}
          title="Настройки профиля"
          aria-label="Настройки профиля"
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
