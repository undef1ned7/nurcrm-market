import { useEffect, useMemo, useState } from "react";
import Sidebar from "@widgets/sidebar/ui/Sidebar";
import Header from "@widgets/header/ui/Header";
import { Outlet, useLocation } from "react-router-dom";
import "./Layout.scss";
import { X, ArrowUp } from "lucide-react";
import { useUser } from "@entities/user";
import { useDebounce } from "@shared/hooks/useDebounce";
import { PageChromeProvider } from "@shared/ui/page-shell";

const useAnnouncement = (company: any, setHideAnnouncement: any) => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!company?.end_date) return;

    const endDate = new Date(company.end_date);
    const now = new Date();

    const diff = Number(endDate) - Number(now);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 3 && days >= 0) {
      setDaysLeft(days);

      const timer = setTimeout(() => {
        setHideAnnouncement(true);
      }, 10000);

      return () => clearTimeout(timer);
    }

    setDaysLeft(null);
  }, [company, setHideAnnouncement]);

  return daysLeft;
};

const Layout = () => {
  const { company } = useUser();
  const rootBlock = useMemo(() => document.getElementById("root"), []);
  const [isArrowView, setIsArrowView] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const isDesktop = window.innerWidth >= 769;
      const sidebarAutoClose =
        localStorage.getItem("sidebarAutoClose") === "true";
      if (isDesktop) return !sidebarAutoClose;
      return false;
    }
    return true;
  });

  const [hideAnnouncement, setHideAnnouncement] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false,
  );
  const location = useLocation();

  const isHidden = useMemo(() => {
    return (
      location.pathname.startsWith("/crm/market/cashier") ||
      location.pathname.startsWith("/crm/market/customer-display") ||
      location.pathname.startsWith("/crm/sklad/mass-scan") ||
      location.pathname.startsWith("/crm/sell/start") ||
      location.pathname.startsWith("/crm/production/sell/start")
    );
  }, [location.pathname]);

  useEffect(() => {
    const savedSetting = localStorage.getItem("sidebarAutoClose");
    const sidebarAutoClose = savedSetting === "true";
    if (sidebarAutoClose) setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if ((rootBlock?.scrollTop ?? 0) > 800) {
        setIsArrowView(true);
      } else {
        setIsArrowView(false);
      }
      const savedSetting = localStorage.getItem("sidebarAutoClose");
      const sidebarAutoClose = savedSetting === "true";

      if (window.innerWidth >= 769 && !sidebarAutoClose) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rootBlock]);

  const scrollHandle = useDebounce(() => {
    if ((rootBlock?.scrollTop ?? 0) > 800) {
      setIsArrowView(true);
    } else {
      setIsArrowView(false);
    }
  });

  useEffect(() => {
    if (!rootBlock) return undefined;
    rootBlock.addEventListener("scroll", scrollHandle);
    return () => rootBlock.removeEventListener("scroll", scrollHandle);
  }, [rootBlock, scrollHandle]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const isMobile = window.innerWidth < 769;

    if (isMobile && isSidebarOpen && isHidden) {
      const scrollY = window.scrollY;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.documentElement.style.overflow = "hidden";

      const handleResize = () => {
        if (window.innerWidth >= 769) {
          document.body.style.position = "";
          document.body.style.top = "";
          document.body.style.width = "";
          document.body.style.overflow = "";
          document.body.style.touchAction = "";
          document.documentElement.style.overflow = "";
          window.scrollTo(0, scrollY);
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
        document.documentElement.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isSidebarOpen, isHidden]);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  const daysLeft = useAnnouncement(company, setHideAnnouncement);

  return (
    <div className="layout-wrapper">
      <a href="#main-content" className="nur-skip-link">
        Перейти к содержимому
      </a>
      <PageChromeProvider active={!isHidden}>
        <div
          className={`App ${!isSidebarOpen ? "sidebar-collapsed" : ""} ${
            isHidden ? "App--fullscreen" : ""
          }`}
        >
          {!isHidden && (
            <Sidebar
              isOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              closeSidebar={closeSidebar}
            />
          )}

          {isSidebarOpen && !isHidden && isMobileLayout && (
            <div
              className="sidebar-overlay"
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}

          <div
            className={`content ${
              isSidebarOpen && !isHidden ? "content--sidebar-open" : ""
            } ${isHidden ? "content--full-width" : ""}`}
          >
            {daysLeft !== null && !hideAnnouncement && (
              <div className="announcement" role="status">
                <div className="announcement__bar" aria-hidden="true" />
                <div className="announcement__content">
                  <strong>Подписка заканчивается через {daysLeft} дн.</strong>
                  <span>
                    Продлите заранее, чтобы сохранить доступ ко всем функциям.
                  </span>
                </div>
                <button
                  className="announcement__close"
                  onClick={() => setHideAnnouncement(true)}
                  aria-label="Закрыть уведомление"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {!isHidden && (
              <Header
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
              />
            )}

            <main id="main-content" className="content_content" tabIndex={-1}>
              <div
                key={location.pathname}
                className={
                  isHidden ? "nur-route-enter--instant" : "nur-route-enter"
                }
              >
                <Outlet />
              </div>
              {isArrowView && (
                <button
                  type="button"
                  className="scroll-top-btn"
                  aria-label="Наверх"
                  onClick={() => {
                    rootBlock?.scrollTo?.({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </main>
          </div>
        </div>
      </PageChromeProvider>
    </div>
  );
};

export default Layout;
