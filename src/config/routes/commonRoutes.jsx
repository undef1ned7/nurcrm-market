/* eslint-disable react-refresh/only-export-components -- route lazy() bindings */
import { createProtectedRoute } from "./helpers";
import { lazy } from "react";

const Set = lazy(() => import("../../Components/pages/Info/Settings/Settings"));
const PosPrintSettings = lazy(
  () => import("../../Components/pages/Info/Settings/PosPrintSettings"),
);
const AdditionalServices = lazy(
  () => import("../../Components/pages/AdditionalServices/AdditionalServices"),
);
const Sell = lazy(() => import("../../Components/pages/Sell/Sell"));
const SellDetail = lazy(() => import("../../Components/pages/Sell/SellDetail"));
const Debts = lazy(() => import("../../Components/Debts/Debts"));
const Pending = lazy(() => import("../../Components/pages/Pending/Pending"));
const Branch = lazy(() => import("../../Components/pages/Branch/Branch"));
const BranchDetails = lazy(
  () => import("../../Components/pages/Branch/BranchDetails"),
);
const Shifts = lazy(() => import("../../Components/pages/Shifts/Shifts"));
const ShiftDetail = lazy(
  () => import("../../Components/pages/Shifts/ShiftDetail"),
);
const BarcodePrintPage = lazy(
  () => import("../../Components/Deposits/Sklad/BarcodePrintPage"),
);
const ScalesPage = lazy(
  () => import("../../Components/Deposits/Sklad/ScalesPage"),
);
const AddProductPage = lazy(
  () => import("../../Components/Deposits/Sklad/AddProductPage"),
);
const BrandCategoryPage = lazy(
  () => import("../../Components/Deposits/BrandCategoryPage/BrandCategoryPage"),
);
const Kassa = lazy(() => import("../../Components/Deposits/Kassa/Kassa"));
const KassaDet = lazy(
  () => import("../../Components/Deposits/KassaWorkerDet/Kassa"),
);
const Masters = lazy(
  () => import("../../Components/Sectors/Barber/Masters/Masters"),
);
const MarketEmployEmployeeDetail = lazy(
  () =>
    import("../../Components/Sectors/Barber/Masters/MarketEmployEmployeeDetail"),
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
  createProtectedRoute("sell", Sell),
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
