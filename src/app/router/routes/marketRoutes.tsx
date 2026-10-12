import { Route } from "react-router";
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
const MarketSummary = lazy(() => import("@pages/market-summary"));
const MarketCalculator = lazy(() => import("@pages/market-calculator"));
const MarketAbc = lazy(() => import("@pages/market-abc"));
const MarketKnowledgeBase = lazy(() => import("@pages/knowledge-base"));
const MarketErrorLog = lazy(() => import("@pages/error-log"));
// Разделы по виду магазина (company.market_sphere)
const MarketRentals = lazy(() => import("@pages/rentals"));
const MarketAppointments = lazy(() => import("@pages/appointments"));
const MarketWorkOrders = lazy(() => import("@pages/work-orders"));

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
  createProtectedRoute("market/summary", MarketSummary),
  createProtectedRoute("market/calculator", MarketCalculator),
  createProtectedRoute("market/abc", MarketAbc),
  createProtectedRoute("market/knowledge-base", MarketKnowledgeBase),
  createProtectedRoute("market/error-log", MarketErrorLog),
  createProtectedRoute("market/rentals", MarketRentals),
  createProtectedRoute("market/appointments", MarketAppointments),
  createProtectedRoute("market/work-orders", MarketWorkOrders),
];
