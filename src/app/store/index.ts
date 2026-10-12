import { configureStore } from "@reduxjs/toolkit";
import { userReducer } from "@entities/user";
import { employeeReducer } from "@entities/employee";
import { productReducer } from "@entities/product";
import { departmentReducer } from "@entities/department";
import { clientReducer } from "@entities/client";
import { saleReducer } from "@entities/sale";
import { cashReducer } from "@entities/cash";
import { uiReducer } from "@entities/ui";
import { warehouseReducer } from "@entities/warehouse";
import { counterpartyReducer } from "@entities/counterparty";
import { sectorReducer } from "@entities/sector";
import { branchReducer } from "@entities/branch";
import { shiftReducer } from "@entities/shift";
import { notificationReducer } from "@entities/notification";
import { analyticsReducer } from "@entities/analytics";

const store = configureStore({
  reducer: {
    user: userReducer,
    employee: employeeReducer,
    product: productReducer,
    departments: departmentReducer,
    client: clientReducer,
    sale: saleReducer,
    cash: cashReducer,
    ui: uiReducer,
    warehouse: warehouseReducer,
    counterparty: counterpartyReducer,
    sector: sectorReducer,
    branches: branchReducer,
    shifts: shiftReducer,
    notification: notificationReducer,
    analytics: analyticsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "products/getProductInvoice/fulfilled",
          "products/getProductCheckout/fulfilled",
        ],
      },
    }),
});

export * from "@entities/ui";
export { useAppDispatch, useAppSelector } from "./hooks";
export default store;
