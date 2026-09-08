export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  exiting?: boolean;
};

type Listener = () => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

const MAX_TOASTS = 5;
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4500,
  info: 5000,
  warning: 7000,
  error: 8000,
};

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastsSnapshot(): ToastItem[] {
  return toasts;
}

export function addToast(
  item: Omit<ToastItem, "id" | "exiting" | "duration"> & {
    duration?: number;
  },
): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const duration = item.duration ?? DEFAULT_DURATION[item.type];

  toasts = [{ ...item, id, duration, exiting: false }, ...toasts].slice(
    0,
    MAX_TOASTS,
  );
  emit();

  window.setTimeout(() => dismissToast(id), duration);
  return id;
}

export function dismissToast(id: string) {
  const target = toasts.find((toast) => toast.id === id);
  if (!target || target.exiting) return;

  toasts = toasts.map((toast) =>
    toast.id === id ? { ...toast, exiting: true } : toast,
  );
  emit();

  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }, 220);
}
