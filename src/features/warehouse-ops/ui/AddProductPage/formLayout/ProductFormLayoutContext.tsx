import { createContext, useContext, type ReactNode } from "react";
import {
  useProductFormLayout,
  type ProductFormLayoutApi,
} from "./useProductFormLayout";
import type { ProductFormLayoutValues } from "./types";

const ProductFormLayoutContext = createContext<ProductFormLayoutApi | null>(
  null,
);

export function ProductFormLayoutProvider({
  companyId,
  canCustomize = false,
  values,
  onSaveError,
  children,
}: {
  companyId?: string | number | null;
  canCustomize?: boolean;
  values?: ProductFormLayoutValues;
  onSaveError?: (message: string) => void;
  children: ReactNode;
}) {
  const api = useProductFormLayout({
    companyId,
    canCustomize,
    values,
    onSaveError,
  });

  return (
    <ProductFormLayoutContext.Provider value={api}>
      {children}
    </ProductFormLayoutContext.Provider>
  );
}

export function useOptionalProductFormLayout() {
  return useContext(ProductFormLayoutContext);
}

export function useProductFormLayoutContext() {
  const ctx = useContext(ProductFormLayoutContext);
  if (!ctx) {
    throw new Error("ProductFormLayoutProvider is required");
  }
  return ctx;
}
