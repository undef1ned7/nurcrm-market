import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import employeeReducer from "./slices/employeeSlice";
import productsReducer from "./slices/productSlice";
import departmentReducer from "./slices/departmentSlice";
import clientReducer from "./slices/ClientSlice";
import saleReducer from "./slices/saleSlice";
import cashReducer from "./slices/cashSlice";
import uiReducer from "./slices/uiSlice";
import warehouseReducer from "./slices/warehouseSlice";
import counterpartyReducer from "./slices/counterpartySlice";
import sectorReducer from "./slices/sectorSlice";
import branchReducer from "./slices/branchSlice";
import shiftReducer from "./slices/shiftSlice";
import notificationReducer from "./slices/notificationSlice";
import analyticsReducer from "./slices/analyticsSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    employee: employeeReducer,
    product: productsReducer,
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

export * from "./slices/uiSlice";
export default store;
