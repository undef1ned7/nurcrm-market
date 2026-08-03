/* eslint-disable react-refresh/only-export-components -- public route table */
import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "../Components/Auth/Login/Login";
import RouteFallback from "../Components/common/RouteFallback/RouteFallback";

const MarketCatalog = lazy(
  () => import("../Components/Sectors/Market/Catalog/Catalog"),
);
const RegisterGate = lazy(
  () => import("../Components/Auth/Register/RegisterGate"),
);
const RegisterAccessSettings = lazy(
  () => import("../Components/Auth/Register/RegisterAccessSettings"),
);

export const publicRoutes = [
  <Route key="root" path="/" element={<Navigate to="/crm" replace />} />,
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
