/* eslint-disable react-refresh/only-export-components -- route lazy() bindings */
import { Navigate } from "react-router-dom";
import { createProtectedRoute } from "./helpers";
import { lazy } from "react";

const Set = lazy(() => import("@pages/settings"));
const PosPrintSettings = lazy(() =>
  import("@pages/settings").then((m) => ({ default: m.PosPrintSettings })),
);
const AdditionalServices = lazy(() => import("@pages/additional-services"));
const SellRedirect = () => <Navigate to="/crm/market/cashier" replace />;
const SellDetail = lazy(() =>
  import("@pages/sell").then((m) => ({ default: m.SellDetail })),
);
const Debts = lazy(() => import("@features/debts"));
const Pending = lazy(() => import("@pages/pending"));
const Branch = lazy(() => import("@pages/branches"));
const BranchDetails = lazy(() =>
  import("@pages/branches").then((m) => ({ default: m.BranchDetails })),
);
const Shifts = lazy(() => import("@pages/shifts"));
const ShiftDetail = lazy(() =>
  import("@pages/shifts").then((m) => ({ default: m.ShiftDetail })),
);
const BarcodePrintPage = lazy(() => import("@features/print-barcode"));
const ScalesPage = lazy(() => import("@features/scales"));
const AddProductPage = lazy(() => import("@features/add-product"));
const BrandCategoryPage = lazy(() => import("@features/brand-category"));
const Kassa = lazy(() => import("@features/kassa"));
const KassaDet = lazy(() => import("@features/kassa-worker"));
const Masters = lazy(() => import("@pages/employees"));
const MarketEmployEmployeeDetail = lazy(() =>
  import("@pages/employees").then((m) => ({
    default: m.MarketEmployEmployeeDetail,
  })),
);

export const commonRoutes = () => [
  createProtectedRoute("set", Set),
  createProtectedRoute("pos-print-settings", PosPrintSettings),
  createProtectedRoute("employ/market/:employeeId", MarketEmployEmployeeDetail),
  createProtectedRoute("employ", Masters),
  createProtectedRoute("sklad/add-product", AddProductPage),
  createProtectedRoute("sklad/add-product/:id", AddProductPage),
  createProtectedRoute("barcodes", BarcodePrintPage),
  createProtectedRoute("scales", ScalesPage),
  createProtectedRoute("sell", SellRedirect),
  createProtectedRoute("sell/:id", SellDetail),
  createProtectedRoute("brand-category", BrandCategoryPage),
  createProtectedRoute("additional-services", AdditionalServices),
  createProtectedRoute("shifts", Shifts),
  createProtectedRoute("shifts/:id", ShiftDetail),
  createProtectedRoute("branch", Branch),
  createProtectedRoute("branch/:id", BranchDetails),
  createProtectedRoute("kassa/*", Kassa),
  createProtectedRoute("kassa/:id", KassaDet),
  createProtectedRoute("debts", Debts),
  createProtectedRoute("pending", Pending),
];
