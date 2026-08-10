import { Suspense } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "@app/providers/ProtectedRoute";
import RouteFallback from "@shared/ui/RouteFallback/RouteFallback";

export const createProtectedRoute = (
  path: string,
  Component: any,
  props?: any,
) => (
  <Route
    key={path}
    path={path}
    element={
      <ProtectedRoute>
        <Suspense fallback={<RouteFallback />}>
          <Component />
        </Suspense>
      </ProtectedRoute>
    }
    {...props}
  />
);
