const GITHUB_REPO = "beknazar93/Nurmarket";
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
// Резервная ссылка на случай, если GitHub API недоступен (rate limit, сеть и т.п.).
const FALLBACK_DOWNLOAD_URL =
  "https://github.com/beknazar93/Nurmarket/releases/download/v1.17.30/NurMarketKassa-win-Setup.exe";

export const CASHIER_DESKTOP_BUTTON_STORAGE_KEY = "cashierDesktopButtonEnabled";

export function isCashierDesktopButtonEnabled(): boolean {
  try {
    const saved = localStorage.getItem(CASHIER_DESKTOP_BUTTON_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

/** Находит ссылку на .exe самой свежей версии десктоп-кассы через GitHub Releases API. */
export async function getLatestDesktopCashierDownloadUrl(): Promise<string> {
  try {
    const res = await fetch(LATEST_RELEASE_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return FALLBACK_DOWNLOAD_URL;

    const release = await res.json();
    const assets: any[] = Array.isArray(release?.assets) ? release.assets : [];
    const setupAsset = assets.find(
      (asset) => typeof asset?.name === "string" && /setup\.exe$/i.test(asset.name),
    );

    return setupAsset?.browser_download_url || FALLBACK_DOWNLOAD_URL;
  } catch {
    return FALLBACK_DOWNLOAD_URL;
  }
}

export function triggerFileDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
