import { Route } from "react-router-dom";
import { marketRoutes } from "./marketRoutes";
import { commonRoutes } from "./commonRoutes";

/** Стартовая страница CRM — без автоперехода в кассу. */
const CrmHome = () => (
  <div style={{ padding: "24px 16px", maxWidth: 560 }}>
    <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
      NurCRM Market
    </h1>
    <p style={{ margin: 0, color: "#64748b", fontSize: 15, lineHeight: 1.5 }}>
      Выберите раздел в меню слева, чтобы продолжить работу.
    </p>
  </div>
);

export const crmRoutes = (profile: any) => [
  <Route key="crm-index" index element={<CrmHome />} />,
  ...commonRoutes(profile),
  ...marketRoutes(profile),
];
