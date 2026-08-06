import { Suspense, useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.scss";
import { AuthGuard, Logout } from "@features/auth";
import { Layout } from "@widgets/layout";
import { ScrollToTop } from "@shared/hooks/ScrollToTop.jsx";
import { publicRoutes } from "@app/router/routes.jsx";
import RouteFallback from "@shared/ui/RouteFallback/RouteFallback.jsx";
import ErrorBoundary from "@shared/ui/ErrorBoundary/ErrorBoundary.jsx";
import { ThemeModeProvider } from "@shared/theme/ThemeModeProvider.jsx";
import { Box } from "@mui/system";
import "@shared/config/i18n";
import { ModalProvider } from "@shared/context/modal";

function AppRoutes({ profile }) {
  const { pathname } = useLocation();
  const [crmRoutesElements, setCrmRoutesElements] = useState(null);

  useEffect(() => {
    if (!pathname.startsWith("/crm")) {
      return undefined;
    }

    let cancelled = false;

    const loadRoutes = () =>
      import("@app/router/routes/index.jsx")
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
  const [profile, setProfile] = useState(null);

  const handleProfileLoaded = useCallback((profileData) => {
    setProfile(profileData);
  }, []);

  return (
    <ThemeModeProvider>
      <ModalProvider>
        <Box sx={{ minHeight: "100vh", bgcolor: "transparent" }}>
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
