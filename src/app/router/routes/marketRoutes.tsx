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
const MarketProcurementRecommendationsPage = lazy(() =>
  import("@pages/procurement").then((m) => ({
    default: m.ProcurementRecommendationsPage,
  })),
);
const MarketSupplierReturnPage = lazy(() =>
  import("@pages/procurement").then((m) => ({
    default: m.SupplierReturnPage,
  })),
);
const MarketCashierPage = lazy(() => import("@pages/cashier"));
const MarketCustomerDisplayPage = lazy(() => import("@pages/customer-display"));
const MarketMassScanPage = lazy(() =>
  import("@pages/warehouse").then((m) => ({ default: m.MassScanPage })),
);
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

export const marketRoutes = (_profile?: any) => [
  createProtectedRoute("market/bar", MarketBar),
  createProtectedRoute("market/procurement", MarketSupplierReceiptsListPage),
  createProtectedRoute(
    "market/procurement/recommendations",
    MarketProcurementRecommendationsPage,
  ),
  <Route
    key="market/suppliers"
    path="market/suppliers"
    element={
      <ProtectedRoute>
        <MarketClients forcedTab={"suppliers" as any} hideTabs />
      </ProtectedRoute>
    }
  />,
  createProtectedRoute("market/customer-display", MarketCustomerDisplayPage),
  createProtectedRoute("sklad/mass-scan", MarketMassScanPage),
  createProtectedRoute("sklad", MarketWarehouse),
  createProtectedRoute("sklad/:id", MarketProductDetail),
  createProtectedRoute("market/procurement/receipt", MarketSupplierReceiptPage),
  createProtectedRoute("market/procurement/return", MarketSupplierReturnPage),
  createProtectedRoute("market/cashier", MarketCashierPage),
  createProtectedRoute("market/categories", MarketCategories),
  createProtectedRoute("clients", MarketClients),
  createProtectedRoute("clients/:id", MarketClientDetails),
  createProtectedRoute("market/history", MarketHistory),
  createProtectedRoute("market/documents", MarketDocuments),
  createProtectedRoute("market/documents/create", CreateSaleDocument),
  createProtectedRoute("market/analytics", MarketAnalytics),
];
