import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { getCompany } from "@entities/user";
import { getProfile, useUser } from "@entities/user";
import {
  isAllowedPathWithoutToken,
  shouldRedirectToCrm,
  clearTokens,
} from "@shared/lib/authUtils";
import {
  tryRedirectToBuildingApp,
  shouldSkipBuildingRedirect,
  clearSkipBuildingRedirectParam,
} from "@shared/lib/crossAppAuth";
import { captureBuildingAppUrlFromSearch } from "@shared/lib/appUrls";
import { getCompanySubscriptionStatus } from "@shared/lib/companySubscription";
import {
  DEFAULT_AUTHENTICATED_PATH,
  DEFAULT_UNAUTHENTICATED_PATH,
} from "@shared/constants/routes";
import Loading from "@shared/ui/Loading/Loading";
import { useAppDispatch } from "@app/store";

/**
 * Компонент для проверки аутентификации при загрузке и смене маршрута.
 * Должен жить внутри BrowserRouter (нужен useLocation).
 */
const AuthGuard = ({ children, onProfileLoaded }: any) => {
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { accessToken } = useUser();
  const { profile, loading } = useUser();
  const bootstrappedRef = useRef(false);

  const getProfileFunc = useCallback(async () => {
    await dispatch(getProfile({} as any) as any).unwrap();
  }, [dispatch]);

  useEffect(() => {
    if (loading) return;
    if (onProfileLoaded) {
      onProfileLoaded(profile);
    }
  }, [loading, onProfileLoaded, profile]);

  // Быстрая проверка при каждой смене пути (закрывает / → /crm без токена)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const path = location.pathname;
    if (!token && !isAllowedPathWithoutToken(path)) {
      window.location.replace(DEFAULT_UNAUTHENTICATED_PATH);
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkTokenValidity = async () => {
      const currentPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      // Logout из building (stroy): токены на stage живут в другом origin —
      // без очистки AuthGuard сразу вернёт в stroy.
      const logoutFromBuilding = searchParams.get("logout") === "1";
      if (logoutFromBuilding || currentPath === "/crm/logout") {
        clearTokens();

        if (logoutFromBuilding) {
          searchParams.delete("logout");
          const search = searchParams.toString();
          const cleanUrl =
            window.location.pathname +
            (search ? `?${search}` : "") +
            window.location.hash;
          window.history.replaceState({}, "", cleanUrl);
        }

        if (currentPath === "/crm/logout") {
          window.location.replace("/login");
          return;
        }

        setIsCheckingToken(false);
        bootstrappedRef.current = true;
        return;
      }

      captureBuildingAppUrlFromSearch();

      const token = localStorage.getItem("accessToken");
      if (!token) {
        if (!isAllowedPathWithoutToken(currentPath)) {
          window.location.href = DEFAULT_UNAUTHENTICATED_PATH;
          return;
        }
        setIsCheckingToken(false);
        bootstrappedRef.current = true;
        return;
      }

      if (!navigator.onLine) {
        console.warn("AuthGuard: нет сети, токен принят без проверки");
        setIsCheckingToken(false);
        bootstrappedRef.current = true;
        return;
      }

      try {
        await getProfileFunc();

        if (shouldSkipBuildingRedirect()) {
          clearSkipBuildingRedirectParam();
        } else {
          const company = await dispatch(getCompany({} as any) as any).unwrap();
          const subscription = getCompanySubscriptionStatus(company);
          const wantsAppEntry =
            shouldRedirectToCrm(currentPath) ||
            currentPath.startsWith("/crm/building");

          // Истёкшая подписка: не пускаем в CRM/building, оставляем на лендинге
          if (
            wantsAppEntry &&
            !subscription.ok &&
            subscription.reason !== "unknown"
          ) {
            if (currentPath !== "/") {
              window.location.replace("/");
              return;
            }
            setIsCheckingToken(false);
            bootstrappedRef.current = true;
            return;
          }

          if (wantsAppEntry) {
            const handoff = tryRedirectToBuildingApp(company, currentPath);
            if (handoff === "redirected") {
              return;
            }
          }
        }

        if (shouldRedirectToCrm(currentPath)) {
          window.location.href = DEFAULT_AUTHENTICATED_PATH;
          return;
        }
      } catch (err: any) {
        const isNetworkError =
          !err?.response &&
          (err?.code === "ERR_NETWORK" ||
            err?.code === "ECONNABORTED" ||
            err?.message === "Network Error" ||
            !navigator.onLine);

        if (isNetworkError) {
          console.warn("AuthGuard: нет сети, сессия сохранена");
        } else {
          console.error("Ошибка проверки токена:", err);
          clearTokens();

          if (!isAllowedPathWithoutToken(currentPath)) {
            window.location.href = DEFAULT_UNAUTHENTICATED_PATH;
            return;
          }
        }
      } finally {
        setIsCheckingToken(false);
        bootstrappedRef.current = true;
      }
    };

    // Полная bootstrap-проверка только один раз; смена пути — лёгкий effect выше
    if (!bootstrappedRef.current) {
      checkTokenValidity();
    }
  }, [dispatch, getProfileFunc]);

  useEffect(() => {
    if (accessToken) {
      dispatch(getCompany({} as any) as any);
    }
  }, [accessToken, dispatch]);

  if (isCheckingToken) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default AuthGuard;
