import { Navigate, Route } from "react-router-dom";
import { marketRoutes } from "./marketRoutes";
import { commonRoutes } from "./commonRoutes";

export const crmRoutes = (profile) => [
  <Route
    key="crm-index"
    index
    element={<Navigate to="market/cashier" replace />}
  />,
  ...commonRoutes(profile),
  ...marketRoutes(profile),
];
