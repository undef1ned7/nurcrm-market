import { useSyncExternalStore } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import {
  dismissToast,
  getToastsSnapshot,
  subscribeToasts,
  type ToastItem,
} from "@shared/lib/notifications";
import "./ToastContainer.scss";

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const Icon = ICONS[toast.type];

  return (
    <div
      className={`nur-toast nur-toast--${toast.type} ${
        toast.exiting ? "nur-toast--exit" : "nur-toast--enter"
      }`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <Icon className="nur-toast__icon" size={18} aria-hidden="true" />
      <div className="nur-toast__body">
        {toast.title ? (
          <div className="nur-toast__title">{toast.title}</div>
        ) : null}
        <div className="nur-toast__message">{toast.message}</div>
      </div>
      <button
        type="button"
        className="nur-toast__close"
        aria-label="Закрыть"
        onClick={() => dismissToast(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToastsSnapshot,
    getToastsSnapshot,
  );

  if (!toasts.length) return null;

  return (
    <div className="nur-toast-stack" aria-label="Уведомления">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
