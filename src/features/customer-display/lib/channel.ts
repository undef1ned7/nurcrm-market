import type { CustomerDisplayMessage } from "../model/types";

export const CUSTOMER_DISPLAY_CHANNEL = "nur-market-customer-display";
const STORAGE_KEY = "nur-market-customer-display-msg";

type Handler = (message: CustomerDisplayMessage) => void;

export const isCustomerDisplayMessage = (
  value: unknown,
): value is CustomerDisplayMessage => {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "hello" ||
    type === "idle" ||
    type === "cart" ||
    type === "payment" ||
    type === "thanks" ||
    type === "age-check" ||
    type === "age-check-dismiss" ||
    type === "clear"
  );
};

export function publishCustomerDisplay(message: CustomerDisplayMessage) {
  if (typeof window === "undefined") return;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.postMessage(message);
      channel.close();
    }
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ t: Date.now(), message }),
    );
  } catch {
    /* ignore */
  }
}

export function subscribeCustomerDisplay(handler: Handler) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let channel: BroadcastChannel | null = null;
  const onMessage = (event: MessageEvent) => {
    if (isCustomerDisplayMessage(event.data)) handler(event.data);
  };

  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.addEventListener("message", onMessage);
    }
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      if (isCustomerDisplayMessage(parsed?.message)) handler(parsed.message);
    } catch {
      /* ignore */
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      channel?.removeEventListener("message", onMessage);
      channel?.close();
    } catch {
      /* ignore */
    }
  };
}
