import { getBuildingAppPath, isAllowedBuildingAppOrigin } from "./appUrls";
import { isBuildingSector } from "./sectorMapping";
import { isCompanySubscriptionActive } from "./companySubscription";

const AUTH_PARAM_ACCESS = "accessToken";
const AUTH_PARAM_REFRESH = "refreshToken";
const AUTH_PARAM_SECTOR = "sector";

/**
 * Кладёт токены в URL hash (не уходит в Referer/прокси-логи),
 * sector — в query для совместимости с роутингом.
 */
export const buildAuthRedirectUrl = (targetUrl, tokens = {}) => {
  const url = new URL(targetUrl, window.location.origin);

  if (!isAllowedBuildingAppOrigin(url.origin)) {
    throw new Error(
      `buildAuthRedirectUrl: origin не в allowlist: ${url.origin}`,
    );
  }

  const access = tokens.access || tokens.accessToken;
  const refresh = tokens.refresh || tokens.refreshToken;
  const hashParams = new URLSearchParams();

  if (access) {
    hashParams.set(AUTH_PARAM_ACCESS, access);
  }
  if (refresh) {
    hashParams.set(AUTH_PARAM_REFRESH, refresh);
  }
  if (tokens.sector) {
    url.searchParams.set(AUTH_PARAM_SECTOR, tokens.sector);
    hashParams.set(AUTH_PARAM_SECTOR, tokens.sector);
  }

  const hash = hashParams.toString();
  if (hash) {
    url.hash = hash;
  }

  return url.toString();
};

/**
 * Читает токены из hash (предпочтительно) или query (legacy handoff).
 * После чтения очищает их из URL.
 */
export const consumeAuthParamsFromUrl = () => {
  const hashParams = new URLSearchParams(
    String(window.location.hash || "").replace(/^#/, ""),
  );
  const queryParams = new URLSearchParams(window.location.search);

  const access =
    hashParams.get(AUTH_PARAM_ACCESS) || queryParams.get(AUTH_PARAM_ACCESS);
  const refresh =
    hashParams.get(AUTH_PARAM_REFRESH) || queryParams.get(AUTH_PARAM_REFRESH);
  const sector =
    hashParams.get(AUTH_PARAM_SECTOR) || queryParams.get(AUTH_PARAM_SECTOR);

  const hadAuthInUrl =
    hashParams.has(AUTH_PARAM_ACCESS) ||
    hashParams.has(AUTH_PARAM_REFRESH) ||
    queryParams.has(AUTH_PARAM_ACCESS) ||
    queryParams.has(AUTH_PARAM_REFRESH);

  if (hadAuthInUrl) {
    hashParams.delete(AUTH_PARAM_ACCESS);
    hashParams.delete(AUTH_PARAM_REFRESH);
    hashParams.delete(AUTH_PARAM_SECTOR);
    queryParams.delete(AUTH_PARAM_ACCESS);
    queryParams.delete(AUTH_PARAM_REFRESH);

    const search = queryParams.toString();
    const nextHash = hashParams.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname +
        (search ? `?${search}` : "") +
        (nextHash ? `#${nextHash}` : ""),
    );
  }

  return { access, refresh, sector };
};

export const getStoredAuthTokens = () => ({
  access: localStorage.getItem("accessToken"),
  refresh: localStorage.getItem("refreshToken"),
});

export const resolveBuildingAppPath = (currentPath) => {
  if (currentPath?.startsWith("/crm/building")) {
    return currentPath.replace(/^\/crm/, "");
  }
  return "/building/projects";
};

/**
 * Можно ли отправить пользователя в standalone building-приложение.
 * Нужны: строительная сфера + активная подписка + токены.
 */
export const canHandoffToBuildingApp = (company) => {
  if (!isBuildingSector(company?.sector?.name)) return false;
  if (!isCompanySubscriptionActive(company)) return false;
  if (!localStorage.getItem("accessToken")) return false;
  return true;
};

export const redirectToBuildingApp = (currentPath = "/building/projects") => {
  const targetPath = resolveBuildingAppPath(currentPath);
  const tokens = {
    ...getStoredAuthTokens(),
    sector: "building",
  };

  if (!tokens.access) {
    console.warn("redirectToBuildingApp: нет accessToken, редирект отменён");
    return false;
  }

  try {
    window.location.href = buildAuthRedirectUrl(
      getBuildingAppPath(targetPath),
      tokens,
    );
    return true;
  } catch (err) {
    console.error("redirectToBuildingApp:", err);
    return false;
  }
};

/**
 * Безопасный handoff: редирект только при активной подписке и строй-сфере.
 * @returns {'redirected' | 'expired' | 'skipped'}
 */
export const tryRedirectToBuildingApp = (company, currentPath) => {
  if (!isBuildingSector(company?.sector?.name)) {
    return "skipped";
  }

  if (!isCompanySubscriptionActive(company)) {
    return "expired";
  }

  const ok = redirectToBuildingApp(currentPath);
  return ok ? "redirected" : "skipped";
};

export const shouldSkipBuildingRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("skipBuildingRedirect") === "1";
};

export const clearSkipBuildingRedirectParam = () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("skipBuildingRedirect")) return;

  params.delete("skipBuildingRedirect");
  const search = params.toString();
  const cleanUrl =
    window.location.pathname +
    (search ? `?${search}` : "") +
    window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
};
