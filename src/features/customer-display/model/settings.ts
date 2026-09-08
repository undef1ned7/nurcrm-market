const ENABLED_KEY = "market_customer_display_enabled";
const WELCOME_KEY = "market_customer_display_welcome";
const SLIDES_KEY = "market_customer_display_slides";
const THEME_KEY = "market_customer_display_theme";

export type CustomerDisplayTheme = "dark" | "light";

const safeGet = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
};

export const CUSTOMER_DISPLAY_PATH = "/crm/market/customer-display";

export function isCustomerDisplayEnabled() {
  return safeGet(ENABLED_KEY) === "1";
}

export function setCustomerDisplayEnabled(enabled: boolean) {
  safeSet(ENABLED_KEY, enabled ? "1" : "0");
}

export function getCustomerDisplayTheme(): CustomerDisplayTheme {
  return safeGet(THEME_KEY) === "light" ? "light" : "dark";
}

export function setCustomerDisplayTheme(theme: CustomerDisplayTheme) {
  safeSet(THEME_KEY, theme === "light" ? "light" : "dark");
}

export function getCustomerDisplayWelcome(companyName?: string) {
  const saved = String(safeGet(WELCOME_KEY) || "").trim();
  if (saved) return saved;
  const name = String(companyName || "").trim();
  return name ? `Добро пожаловать в ${name}` : "Добро пожаловать";
}

export function setCustomerDisplayWelcome(text: string) {
  safeSet(WELCOME_KEY, String(text || "").trim());
}

export function getCustomerDisplaySlides() {
  try {
    const raw = safeGet(SLIDES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") {
          return { imageUrl: item };
        }
        const imageUrl = String(item?.imageUrl || item?.url || "").trim();
        if (!imageUrl) return null;
        const caption = String(item?.caption || "").trim();
        return caption ? { imageUrl, caption } : { imageUrl };
      })
      .filter((item): item is { imageUrl: string; caption?: string } => Boolean(item));
  } catch {
    return [];
  }
}

export function setCustomerDisplaySlides(raw: string) {
  const urls = String(raw || "")
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((imageUrl) => ({ imageUrl }));
  safeSet(SLIDES_KEY, JSON.stringify(urls));
}

export function getCustomerDisplaySlidesText() {
  return getCustomerDisplaySlides()
    .map((s) => s.imageUrl)
    .join("\n");
}

export function openCustomerDisplayWindow() {
  if (typeof window === "undefined") return null;
  const url = `${window.location.origin}${CUSTOMER_DISPLAY_PATH}`;
  return window.open(url, "nur-market-customer-display", "noopener,noreferrer");
}
