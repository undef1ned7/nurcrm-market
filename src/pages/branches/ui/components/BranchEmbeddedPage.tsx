import { Suspense, lazy, useEffect, useRef, type ComponentType } from "react";
import {
  holdBranchScope,
  releaseBranchScope,
} from "@shared/lib/tools/branchContext";

/**
 * Страницы раздела «Магазин», которые карточка филиала показывает как есть
 * (те же компоненты, что в /crm/market/*, /crm/shifts, /crm/pending).
 * Данные ограничиваются филиалом через `BranchScope`: axios-интерсептор
 * добавляет `branch=<id>` ко всем GET-запросам встроенной страницы.
 */
const EMBEDDED_PAGES: Record<string, ComponentType<any>> = {
  "/crm/market/analytics": lazy(() => import("@pages/analytics")),
  "/crm/employ": lazy(() => import("@pages/employees")),
  "/crm/clients": lazy(() => import("@pages/clients")),
  "/crm/pending": lazy(() => import("@pages/pending")),
  "/crm/shifts": lazy(() => import("@pages/shifts")),
  "/crm/market/procurement": lazy(() =>
    import("@pages/warehouse").then((m) => ({
      default: m.SupplierReceiptsListPage,
    })),
  ),
  "/crm/market/suppliers": lazy(() =>
    import("@pages/clients").then((m) => {
      const Clients = m.default as ComponentType<any>;
      return {
        default: () => <Clients forcedTab="suppliers" hideTabs />,
      };
    }),
  ),
  "/crm/market/documents": lazy(() => import("@pages/documents")),
};

export const ANALYTICS_ROUTE = "/crm/market/analytics";
export const EMPLOYEES_ROUTE = "/crm/employ";
export const CLIENTS_ROUTE = "/crm/clients";

export const isEmbeddedRoute = (route?: string | null) =>
  Boolean(route && EMBEDDED_PAGES[route.toLowerCase()]);

function BranchScope({
  scopeKey,
  branchId,
  children,
}: {
  scopeKey: string;
  branchId: string;
  children: React.ReactNode;
}) {
  // Захват в render, а не только в эффекте: эффекты дочерних страниц (первые
  // запросы) выполняются раньше эффектов родителя.
  const tokenRef = useRef(0);
  if (tokenRef.current === 0) {
    tokenRef.current = holdBranchScope(scopeKey, branchId);
  }
  useEffect(() => {
    tokenRef.current = holdBranchScope(scopeKey, branchId);
    const token = tokenRef.current;
    return () => releaseBranchScope(scopeKey, token);
  }, [scopeKey, branchId]);
  return <>{children}</>;
}

export default function BranchEmbeddedPage({
  route,
  branchId,
}: {
  route: string;
  branchId: string;
}) {
  const Page = EMBEDDED_PAGES[route.toLowerCase()];
  if (!Page) return null;
  return (
    <BranchScope
      key={`${route}:${branchId}`}
      scopeKey={`${route}:${branchId}`}
      branchId={branchId}
    >
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </BranchScope>
  );
}
