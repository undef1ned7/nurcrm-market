/** Кросс-вкладочный advisory-lock на WebUSB-принтер (не замена OS claim). */

export const USB_LOCK_STORAGE_KEY = "escpos_usb_tab_lock";
export const USB_LOCK_CHANNEL = "nur-escpos-usb-lock";
export const USB_LOCK_TTL_MS = 12_000;
export const USB_LOCK_HEARTBEAT_MS = 4_000;
export const PRINTER_IN_USE_MESSAGE =
  "Принтер уже используется в другой вкладке";

type LockPayload = { tabId: string; ts: number };

let tabId = "";
let heartbeat: ReturnType<typeof setInterval> | null = null;
let channel: BroadcastChannel | null = null;
let listenersAttached = false;

export function getUsbTabId(): string {
  if (!tabId) {
    tabId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  return tabId;
}

function parseLock(raw: string | null): LockPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.tabId !== "string") return null;
    const ts = Number(parsed.ts);
    if (!Number.isFinite(ts)) return null;
    return { tabId: parsed.tabId, ts };
  } catch {
    return null;
  }
}

export function readUsbLock(now = Date.now()): LockPayload | null {
  try {
    const parsed = parseLock(localStorage.getItem(USB_LOCK_STORAGE_KEY));
    if (!parsed) return null;
    if (now - parsed.ts > USB_LOCK_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isUsbLockHeldByOtherTab(now = Date.now()): boolean {
  const lock = readUsbLock(now);
  return Boolean(lock && lock.tabId !== getUsbTabId());
}

export function assertUsbAvailableForThisTab(): void {
  if (isUsbLockHeldByOtherTab()) {
    throw new Error(PRINTER_IN_USE_MESSAGE);
  }
}

function postLockMessage(type: "acquired" | "released") {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    if (!channel) channel = new BroadcastChannel(USB_LOCK_CHANNEL);
    channel.postMessage({ type, tabId: getUsbTabId(), ts: Date.now() });
  } catch {
    // BroadcastChannel может быть недоступен (jsdom / старые браузеры).
  }
}

function writeLock(now = Date.now()) {
  localStorage.setItem(
    USB_LOCK_STORAGE_KEY,
    JSON.stringify({ tabId: getUsbTabId(), ts: now }),
  );
}

function startHeartbeat() {
  if (heartbeat != null) return;
  heartbeat = setInterval(() => {
    try {
      if (isUsbLockHeldByOtherTab()) {
        stopHeartbeat();
        return;
      }
      writeLock();
    } catch {
      // ignore
    }
  }, USB_LOCK_HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeat == null) return;
  clearInterval(heartbeat);
  heartbeat = null;
}

export function acquireUsbLock(): void {
  assertUsbAvailableForThisTab();
  writeLock();
  const confirm = readUsbLock();
  if (confirm && confirm.tabId !== getUsbTabId()) {
    throw new Error(PRINTER_IN_USE_MESSAGE);
  }
  startHeartbeat();
  postLockMessage("acquired");
}

export function releaseUsbLock(): void {
  try {
    const raw = localStorage.getItem(USB_LOCK_STORAGE_KEY);
    const parsed = parseLock(raw);
    if (parsed && parsed.tabId === getUsbTabId()) {
      localStorage.removeItem(USB_LOCK_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  stopHeartbeat();
  postLockMessage("released");
}

export function attachUsbLockListenersOnce(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const onGone = () => {
    releaseUsbLock();
  };
  window.addEventListener("pagehide", onGone);
  window.addEventListener("beforeunload", onGone);

  try {
    if (typeof BroadcastChannel !== "undefined" && !channel) {
      channel = new BroadcastChannel(USB_LOCK_CHANNEL);
    }
  } catch {
    // ignore
  }
}

/** Только для тестов: сменить tabId, не трогая lock в localStorage. */
export function setUsbTabIdForTests(nextTabId: string): void {
  stopHeartbeat();
  tabId = nextTabId;
}

/** Только для тестов: фиксирует tabId и сбрасывает heartbeat/lock. */
export function resetUsbLockForTests(nextTabId = "test-tab-a"): void {
  setUsbTabIdForTests(nextTabId);
  listenersAttached = false;
  try {
    channel?.close();
  } catch {
    // ignore
  }
  channel = null;
  try {
    localStorage.removeItem(USB_LOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}
