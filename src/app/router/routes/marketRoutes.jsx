/* eslint-disable react-refresh/only-export-components -- route lazy() bindings */
import { Route } from "react-router-dom";
import ProtectedRoute from "@app/providers/ProtectedRoute";
import { createProtectedRoute } from "./helpers";
import { lazy } from "react";

const MarketBar = lazy(() => import("@pages/bar"));
const MarketWarehouse = lazy(() => import("@pages/warehouse"));
const MarketProductDetail = lazy(() =>
  import("@pages/warehouse").then((m) => ({ default: m.ProductDetail })),
);
const MarketSupplierReceiptPage = lazy(() =>
  import("@pages/warehouse").then((m) => ({ default: m.SupplierReceiptPage })),
);
const MarketSupplierReceiptsListPage = lazy(() =>
  import("@pages/warehouse").then((m) => ({
    default: m.SupplierReceiptsListPage,
  })),
);
const MarketCashierPage = lazy(() => import("@pages/cashier"));
const MarketCategories = lazy(() => import("@pages/categories"));
const MarketClients = lazy(() => import("@pages/clients"));
const MarketClientDetails = lazy(() =>
  import("@pages/clients").then((m) => ({ default: m.ClientDetails })),
);
const MarketHistory = lazy(() => import("@pages/sales-history"));
const MarketDocuments = lazy(() => import("@pages/documents"));
const CreateSaleDocument = lazy(() =>
  import("@pages/documents").then((m) => ({ default: m.CreateSaleDocument })),
);
const MarketAnalytics = lazy(() => import("@pages/analytics"));

export const marketRoutes = () => [
  createProtectedRoute("market/bar", MarketBar),
  createProtectedRoute("market/procurement", MarketSupplierReceiptsListPage),
  <Route
    key="market/suppliers"
    path="market/suppliers"
    element={
      <ProtectedRoute>
        <MarketClients forcedTab="suppliers" hideTabs />
      </ProtectedRoute>
    }
  />,
  createProtectedRoute("sklad", MarketWarehouse),
  createProtectedRoute("sklad/:id", MarketProductDetail),
  createProtectedRoute("market/procurement/receipt", MarketSupplierReceiptPage),
  createProtectedRoute("market/cashier", MarketCashierPage),
  createProtectedRoute("market/categories", MarketCategories),
  createProtectedRoute("clients", MarketClients),
  createProtectedRoute("clients/:id", MarketClientDetails),
  createProtectedRoute("market/history", MarketHistory),
  createProtectedRoute("market/documents", MarketDocuments),
  createProtectedRoute("market/documents/create", CreateSaleDocument),
  createProtectedRoute("market/analytics", MarketAnalytics),
];
