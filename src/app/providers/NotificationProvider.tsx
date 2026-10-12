import { useEffect } from "react";
import i18n from "i18next";
import { ToastContainer } from "@shared/ui/Toast";
import { useNotificationsSocket } from "@entities/notification";
import { notify } from "@shared/lib/notifications";

type Props = {
  /** Подключать WS только для авторизованных CRM-сессий */
  realtimeEnabled?: boolean;
};

/**
 * Глобальный провайдер toast + realtime bridge.
 * WS подключается здесь (не только в Header), чтобы уведомления работали
 * на fullscreen-экранах кассы/продаж без шапки.
 */
export function NotificationProvider({
  realtimeEnabled = true,
}: Props) {
  useNotificationsSocket({ enabled: realtimeEnabled });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onOnline = () => {
      notify.info(i18n.t("notifications.realtime.reconnected"), {
        duration: 3000,
      });
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return <ToastContainer />;
}

export default NotificationProvider;
