import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCheck, BellOff, Bell, Loader2, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@app/store";
import { useNavigate } from "react-router-dom";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import { useUser } from "@entities/user";
import { useProducts, buildProductExpiryLocalNotification } from "@entities/product";
import classes from "./NotificationModal.module.scss";
import {
  buildTariffLocalNotification,
  deleteNotificationAsync,
  fetchNotificationsAsync,
  markAllNotificationsReadAsync,
  markNotificationReadAsync,
  matchesNotificationTab,
  type NotificationTab,
} from "@entities/notification";
import {
  normalizeNotificationUrl,
  resolveConsultingNotificationUrl,
} from "@shared/lib/consultingLeadSources";

const PAGE_SIZE = 20;

const TAB_IDS: NotificationTab[] = ["all", "tariff", "system", "news"];
const TAB_LABEL_KEY: Record<NotificationTab, string> = {
  all: "notifications.center.tabAll",
  tariff: "notifications.center.tabTariff",
  system: "notifications.center.tabSystem",
  news: "notifications.center.tabNews",
};

const fmtDateTime = (s: any) => {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString("ru-RU");
};

const idOf = (n: any) => n?.id ?? n?.uuid ?? n?.pk;
const isUnread = (n: any) => !(n?.is_read ?? n?.read ?? false);
const isLocal = (n: any) =>
  Boolean(n?.meta?.local) || String(idOf(n) || "").startsWith("local-");

const levelTone = (n: any) => {
  const lvl = String(
    n?.level ?? n?.importance ?? n?.priority ?? "",
  ).toLowerCase();
  if (["critical", "urgent", "high", "danger", "error"].includes(lvl))
    return "danger";
  if (["warning", "medium", "warn"].includes(lvl)) return "warning";
  if (["success", "ok"].includes(lvl)) return "success";
  return "info";
};

const NotificationModal = ({ onClose }: any) => {
  const { t } = useTranslation();
  const tn = (k: string, o?: any): string =>
    t(`notifications.center.${k}`, o) as string;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const listRef = useRef(null);
  const { company } = useUser();
  const { list: productList } = useProducts();
  const [tab, setTab] = useState<NotificationTab>("all");
  const [deleteUnsupported, setDeleteUnsupported] = useState(false);

  const {
    list = [],
    unreadCount = 0,
    hasMore = false,
    loading = false,
    loadingMore = false,
    markingAllRead = false,
  } = useAppSelector((state) => state.notification);

  const localTariff = useMemo(
    () => buildTariffLocalNotification(company?.end_date),
    [company?.end_date],
  );

  const localExpiry = useMemo(
    () => buildProductExpiryLocalNotification(productList),
    [productList],
  );

  useEffect(() => {
    dispatch(
      fetchNotificationsAsync({ limit: PAGE_SIZE, offset: 0 } as any) as any,
    );
  }, [dispatch]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visibleList = useMemo(() => {
    const merged = [...list];
    if (localTariff && !merged.some((n) => idOf(n) === localTariff.id)) {
      merged.unshift(localTariff);
    }
    if (localExpiry && !merged.some((n) => idOf(n) === localExpiry.id)) {
      merged.unshift(localExpiry);
    }
    return merged.filter((n) => matchesNotificationTab(n, tab));
  }, [list, localTariff, localExpiry, tab]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    dispatch(
      fetchNotificationsAsync({
        limit: PAGE_SIZE,
        offset: list.length,
        append: true,
      } as any) as any,
    );
  }, [dispatch, hasMore, loadingMore, list.length]);

  const onScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        loadMore();
      }
    },
    [loadMore],
  );

  const handleClick = useCallback(
    (n) => {
      if (!isLocal(n) && isUnread(n)) {
        dispatch(markNotificationReadAsync(idOf(n) as any));
      }
      const url = normalizeNotificationUrl(
        n?.cta_url || n?.url || resolveConsultingNotificationUrl(n),
      );
      if (url) {
        onClose?.();
        if (/^https?:\/\//i.test(url)) window.location.assign(url);
        else navigate(url);
      }
    },
    [dispatch, navigate, onClose],
  );

  const markAll = useCallback(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsReadAsync({} as any) as any);
  }, [dispatch, unreadCount]);

  const handleDelete = useCallback(
    async (event, n) => {
      event.stopPropagation();
      const id = idOf(n);
      if (!id || isLocal(n) || deleteUnsupported) return;
      try {
        await dispatch(deleteNotificationAsync(id) as any).unwrap();
      } catch {
        setDeleteUnsupported(true);
      }
    },
    [deleteUnsupported, dispatch],
  );

  const isEmpty = !loading && visibleList.length === 0;

  return (
    <ReactPortal wrapperId="notification-center-portal">
      <div className={classes.root} role="presentation">
        <button
          type="button"
          className={classes.backdrop}
          aria-label={tn("closeAria")}
          onClick={onClose}
        />

        <aside
          className={classes.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
        >
          <header className={classes.header}>
            <div className={classes.headerMain}>
              <span className={classes.headerIcon} aria-hidden="true">
                <Bell size={18} />
              </span>
              <div className={classes.headerText}>
                <h3 id="notification-center-title">{tn("title")}</h3>
                <p className={classes.headerMeta}>
                  {unreadCount > 0
                    ? tn("unread", { count: unreadCount })
                    : tn("allRead")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={classes.close}
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
          </header>

          <div
            className={classes.tabs}
            role="tablist"
            aria-label={tn("categoriesAria")}
          >
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`${classes.tab} ${tab === id ? classes.tabActive : ""}`}
                onClick={() => setTab(id)}
              >
                {t(TAB_LABEL_KEY[id])}
              </button>
            ))}
          </div>

          <div
            className={classes.body}
            ref={listRef}
            onScroll={onScroll}
          >
            {loading && list.length === 0 ? (
              <div className={classes.loading} role="status">
                <Loader2 className={classes.spinner} size={22} />
                <span>{tn("loading")}</span>
              </div>
            ) : isEmpty ? (
              <div className={classes.empty} role="status">
                <div className={classes.emptyIcon} aria-hidden="true">
                  <BellOff size={28} />
                </div>
                <h4 className={classes.emptyTitle}>{tn("emptyTitle")}</h4>
                <p className={classes.emptyText}>{tn("emptyText")}</p>
              </div>
            ) : (
              <ul className={classes.list}>
                {visibleList.map((n) => {
                  const unread = isUnread(n);
                  const tone = levelTone(n);
                  const title =
                    n?.title ||
                    n?.verb ||
                    n?.subject ||
                    tn("itemFallbackTitle");
                  const message =
                    n?.message ||
                    n?.description ||
                    n?.text ||
                    n?.body ||
                    "";
                  const actor =
                    n?.actor_name ||
                    n?.actor ||
                    n?.initiator_name ||
                    n?.initiator ||
                    "";
                  const ctaLabel = n?.cta_label || n?.action_label;

                  return (
                    <li key={idOf(n)}>
                      <div
                        className={[
                          classes.item,
                          classes[`item--${tone}`],
                          unread ? classes["item--unread"] : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          className={classes.itemMain}
                          onClick={() => handleClick(n)}
                        >
                          <div className={classes.itemBody}>
                            <div className={classes.itemTop}>
                              <span className={classes.itemTitle}>{title}</span>
                              {unread ? (
                                <span
                                  className={classes.dot}
                                  aria-label={tn("unreadDot")}
                                />
                              ) : null}
                            </div>
                            {message ? (
                              <span className={classes.itemMessage}>
                                {message}
                              </span>
                            ) : null}
                            <span className={classes.itemMeta}>
                              {actor ? `${actor} · ` : ""}
                              {fmtDateTime(
                                n?.created_at || n?.created || n?.date,
                              )}
                            </span>
                            {ctaLabel ? (
                              <span className={classes.cta}>{ctaLabel}</span>
                            ) : null}
                          </div>
                        </button>
                        {!isLocal(n) && !deleteUnsupported ? (
                          <button
                            type="button"
                            className={classes.deleteBtn}
                            aria-label={tn("deleteAria")}
                            onClick={(event) => handleDelete(event, n)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}

                {loadingMore ? (
                  <li className={classes.loadingMore} role="status">
                    <Loader2 className={classes.spinner} size={16} />
                    {t("common.loading")}
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          {unreadCount > 0 ? (
            <footer className={classes.footer}>
              <button
                type="button"
                className={classes.markAllBtn}
                onClick={markAll}
                disabled={markingAllRead}
              >
                <CheckCheck size={16} />
                {markingAllRead ? tn("markingAll") : tn("markAll")}
              </button>
            </footer>
          ) : null}
        </aside>
      </div>
    </ReactPortal>
  );
};

export default NotificationModal;
