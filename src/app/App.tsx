import { Suspense, useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import "./App.scss";
import { AuthGuard, Logout } from "@features/auth";
import { Layout } from "@widgets/layout";
import { ScrollToTop } from "@shared/hooks/ScrollToTop";
import { publicRoutes } from "@app/router/routes";
import RouteFallback from "@shared/ui/RouteFallback/RouteFallback";
import ErrorBoundary from "@shared/ui/ErrorBoundary/ErrorBoundary";
import { ThemeModeProvider } from "@shared/theme/ThemeModeProvider";
import { Box } from "@mui/system";
import "@shared/config/i18n";
import { ModalProvider } from "@shared/context/modal";
import NotificationProvider from "@app/providers/NotificationProvider";

function AppRoutes({ profile }: { profile: any }) {
  const { pathname } = useLocation();
  const [crmRoutesElements, setCrmRoutesElements] = useState<any>(null);

  useEffect(() => {
    if (!pathname.startsWith("/crm")) {
      return undefined;
    }

    let cancelled = false;

    const loadRoutes = () =>
      import("@app/router/routes/index")
        .then((mod) => {
          if (!cancelled) {
            setCrmRoutesElements(mod.crmRoutes(profile));
          }
        })
        .catch((err) => {
          console.error("Не удалось загрузить CRM-маршруты:", err);
          if (!cancelled) {
            setTimeout(() => {
              if (!cancelled) loadRoutes();
            }, 1500);
          }
        });

    loadRoutes();

    return () => {
      cancelled = true;
    };
  }, [pathname, profile]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {publicRoutes}
        <Route key="/crm" path="/crm" element={<Layout />}>
          <Route path="logout" element={<Logout />} />
          {crmRoutesElements ?? (
            <Route key="crm-fallback" path="*" element={<RouteFallback />} />
          )}
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  const [profile, setProfile] = useState<any>(null);

  const handleProfileLoaded = useCallback((profileData: any) => {
    setProfile(profileData);
  }, []);

  return (
    <ThemeModeProvider>
      <ModalProvider>
        <NotificationProvider />
        <Box
          sx={{
            minHeight: "var(--app-viewport-height, 100dvh)",
            bgcolor: "transparent",
          }}
        >
          <ErrorBoundary>
            <BrowserRouter>
              <AuthGuard onProfileLoaded={handleProfileLoaded}>
                <ScrollToTop />
                <AppRoutes profile={profile} />
              </AuthGuard>
            </BrowserRouter>
          </ErrorBoundary>
        </Box>
      </ModalProvider>
    </ThemeModeProvider>
  );
}

export default App;
