 
import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "@features/auth/ui/Login/Login";
import RouteFallback from "@shared/ui/RouteFallback/RouteFallback";

const MarketCatalog = lazy(() => import("@pages/catalog"));
const RegisterGate = lazy(
  () => import("@features/auth/ui/Register/RegisterGate"),
);
const RegisterAccessSettings = lazy(
  () => import("@features/auth/ui/Register/RegisterAccessSettings"),
);

export const publicRoutes = [
  <Route
    key="root"
    path="/"
    element={
      localStorage.getItem("accessToken") ? (
        <Navigate to="/crm" replace />
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />,
  <Route key="login" path="/login" element={<Login />} />,
  <Route
    key="register"
    path="/register"
    element={
      <Suspense fallback={<RouteFallback />}>
        <RegisterGate />
      </Suspense>
    }
  />,
  <Route
    key="register-access"
    path="/register-access/settings"
    element={
      <Suspense fallback={<RouteFallback />}>
        <RegisterAccessSettings />
      </Suspense>
    }
  />,
  <Route
    key="catalog"
    path="/catalog/:slug"
    element={
      <Suspense fallback={<RouteFallback />}>
        <MarketCatalog />
      </Suspense>
    }
  />,
];
