import { useEffect, useRef, useCallback } from "react";
import { X, CheckCheck, BellOff, Bell, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import classes from "./NotificationModal.module.scss";
import {
  fetchNotificationsAsync,
  markAllNotificationsReadAsync,
  markNotificationReadAsync,
} from "@entities/notification";
import { resolveConsultingNotificationUrl } from "@shared/lib/consultingLeadSources";

const PAGE_SIZE = 20;

const fmtDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString("ru-RU");
};

const idOf = (n) => n?.id ?? n?.uuid ?? n?.pk;
const isUnread = (n) => !(n?.is_read ?? n?.read ?? false);

const levelTone = (n) => {
  const lvl = String(
    n?.level ?? n?.importance ?? n?.priority ?? "",
  ).toLowerCase();
  if (["critical", "urgent", "high", "danger", "error"].includes(lvl))
    return "danger";
  if (["warning", "medium", "warn"].includes(lvl)) return "warning";
  if (["success", "ok"].includes(lvl)) return "success";
  return "info";
};

const NotificationModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const listRef = useRef(null);

  const {
    list = [],
    unreadCount = 0,
    hasMore = false,
    loading = false,
    loadingMore = false,
    markingAllRead = false,
  } = useSelector((state) => state.notification);

  useEffect(() => {
    if (list.length === 0 && !loading) {
      dispatch(fetchNotificationsAsync({ limit: PAGE_SIZE, offset: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    dispatch(
      fetchNotificationsAsync({
        limit: PAGE_SIZE,
        offset: list.length,
        append: true,
      }),
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
      if (isUnread(n)) dispatch(markNotificationReadAsync(idOf(n)));
      const url = resolveConsultingNotificationUrl(n);
      if (url) {
        onClose?.();
        if (/^https?:\/\//i.test(url)) window.location.assign(url);
        else navigate(url);
      }
    },
    [dispatch, navigate, onClose],
  );

  const markAll = useCallback(() => {
    if (unreadCount > 0) dispatch(markAllNotificationsReadAsync());
  }, [dispatch, unreadCount]);

  const isEmpty = !loading && list.length === 0;

  return (
    <ReactPortal wrapperId="notification-center-portal">
      <div className={classes.root} role="presentation">
        <button
          type="button"
          className={classes.backdrop}
          aria-label="Закрыть уведомления"
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
                <h3 id="notification-center-title">Центр уведомлений</h3>
                <p className={classes.headerMeta}>
                  {unreadCount > 0
                    ? `${unreadCount} непрочитанн${
                        unreadCount === 1 ? "ое" : "ых"
                      }`
                    : "Все прочитаны"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={classes.close}
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </header>

          <div
            className={classes.body}
            ref={listRef}
            onScroll={onScroll}
          >
            {loading && list.length === 0 ? (
              <div className={classes.loading} role="status">
                <Loader2 className={classes.spinner} size={22} />
                <span>Загрузка уведомлений…</span>
              </div>
            ) : isEmpty ? (
              <div className={classes.empty} role="status">
                <div className={classes.emptyIcon} aria-hidden="true">
                  <BellOff size={28} />
                </div>
                <h4 className={classes.emptyTitle}>Уведомлений нет</h4>
                <p className={classes.emptyText}>
                  Когда появятся новые события, они отобразятся здесь.
                </p>
              </div>
            ) : (
              <ul className={classes.list}>
                {list.map((n) => {
                  const unread = isUnread(n);
                  const tone = levelTone(n);
                  const title =
                    n?.title || n?.verb || n?.subject || "Уведомление";
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

                  return (
                    <li key={idOf(n)}>
                      <button
                        type="button"
                        className={[
                          classes.item,
                          classes[`item--${tone}`],
                          unread ? classes["item--unread"] : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleClick(n)}
                      >
                        <div className={classes.itemBody}>
                          <div className={classes.itemTop}>
                            <span className={classes.itemTitle}>{title}</span>
                            {unread ? (
                              <span
                                className={classes.dot}
                                aria-label="Непрочитано"
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
                        </div>
                      </button>
                    </li>
                  );
                })}

                {loadingMore ? (
                  <li className={classes.loadingMore} role="status">
                    <Loader2 className={classes.spinner} size={16} />
                    Загрузка…
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
                {markingAllRead ? "Отмечаем…" : "Прочитать все"}
              </button>
            </footer>
          ) : null}
        </aside>
      </div>
    </ReactPortal>
  );
};

export default NotificationModal;
