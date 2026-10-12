#!/usr/bin/env node
/**
 * Rewrite imports after FSD move. Replaces known legacy paths with FSD aliases.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

const REPLACEMENTS = [
  // Absolute @ aliases
  [/@\/api\/authInterceptors/g, "@shared/api/authInterceptors"],
  [/@\/api\/auth/g, "@entities/user/api/auth"],
  [/@\/api\/products/g, "@entities/product/api/products"],
  [/@\/api\/warehouse/g, "@entities/warehouse/api/warehouse"],
  [/@\/api\/employees/g, "@entities/employee/api/employees"],
  [/@\/api\/departments/g, "@entities/department/api/departments"],
  [/@\/api\/analytics/g, "@entities/analytics/api/analytics"],
  [/@\/api\/notification/g, "@entities/notification/api/notification"],
  [/@\/api\/additionalServices/g, "@shared/api/additionalServices"],
  [/@\/api\/marketCashierSettings/g, "@shared/api/marketCashierSettings"],
  [/@\/api\/registerAccess/g, "@shared/api/registerAccess"],
  [/@\/api(?:\/index)?/g, "@shared/api"],

  [/@\/store\/slices\/userSlice/g, "@entities/user"],
  [/@\/store\/slices\/productSlice/g, "@entities/product"],
  [/@\/store\/slices\/warehouseSlice/g, "@entities/warehouse"],
  [/@\/store\/slices\/saleSlice/g, "@entities/sale"],
  [/@\/store\/slices\/cashSlice/g, "@entities/cash"],
  [/@\/store\/slices\/shiftSlice/g, "@entities/shift"],
  [/@\/store\/slices\/ClientSlice/g, "@entities/client"],
  [/@\/store\/slices\/counterpartySlice/g, "@entities/counterparty"],
  [/@\/store\/slices\/employeeSlice/g, "@entities/employee"],
  [/@\/store\/slices\/branchSlice/g, "@entities/branch"],
  [/@\/store\/slices\/departmentSlice/g, "@entities/department"],
  [/@\/store\/slices\/notificationSlice/g, "@entities/notification"],
  [/@\/store\/slices\/analyticsSlice/g, "@entities/analytics"],
  [/@\/store\/slices\/sectorSlice/g, "@entities/sector"],
  [/@\/store\/slices\/uiSlice/g, "@entities/ui"],

  [/@\/store\/creators\/userCreators/g, "@entities/user"],
  [/@\/store\/creators\/productCreators/g, "@entities/product"],
  [/@\/store\/creators\/warehouseCreators/g, "@entities/warehouse"],
  [/@\/store\/creators\/warehouseThunk/g, "@entities/warehouse"],
  [/@\/store\/creators\/saleThunk/g, "@entities/sale"],
  [/@\/store\/creators\/shiftThunk/g, "@entities/shift"],
  [/@\/store\/creators\/clientCreators/g, "@entities/client"],
  [/@\/store\/creators\/employeeCreators/g, "@entities/employee"],
  [/@\/store\/creators\/branchCreators/g, "@entities/branch"],
  [/@\/store\/creators\/departmentCreators/g, "@entities/department"],
  [/@\/store\/creators\/notificationCreators/g, "@entities/notification"],
  [/@\/store\/creators\/analyticsCreators/g, "@entities/analytics"],
  [/@\/store\/creators\/transferCreators/g, "@entities/warehouse"],
  [/@\/store\/pagination/g, "@shared/lib/pagination"],
  [/@\/store/g, "@app/store"],

  [/@\/hooks\//g, "@shared/hooks/"],
  [/@\/utils\//g, "@shared/lib/"],
  [/@\/theme\//g, "@shared/theme/"],
  [/@\/constants\//g, "@shared/constants/"],
  [/@\/context\//g, "@shared/context/"],
  [/@\/services\//g, "@shared/services/"],
  [/@\/assets\//g, "@shared/assets/"],
  [/@\/i18n/g, "@shared/config/i18n"],

  // Component path aliases used with @/
  [/@\/Components\/Layout/g, "@widgets/layout"],
  [/@\/Components\/Sidebar/g, "@widgets/sidebar"],
  [/@\/Components\/Header/g, "@widgets/header"],
  [/@\/Components\/common/g, "@shared/ui"],
  [/@\/Components\/Auth/g, "@features/auth"],
  [/@\/Components\/Debts/g, "@features/debts"],
  [/@\/Components\/NotificationModal/g, "@widgets/notification-modal"],
  [/@\/Components\/Photo/g, "@shared/ui/Photo"],
  [/@\/Components\/DepartmentDetails/g, "@shared/ui/DepartmentDetails"],
  [/@\/Components\/Deposits\/Sklad/g, "@features/warehouse-ops"],
  [/@\/Components\/Deposits\/KassaWorkerDet/g, "@features/kassa-worker"],
  [/@\/Components\/Deposits\/Kassa/g, "@features/kassa"],
  [/@\/Components\/Deposits\/BrandCategoryPage/g, "@features/brand-category"],
  [/@\/Components\/Sectors\/Market\/CashierPage/g, "@pages/cashier"],
  [/@\/Components\/Sectors\/Market\/Warehouse/g, "@pages/warehouse"],
  [/@\/Components\/Sectors\/Market\/Clients/g, "@pages/clients"],
  [/@\/Components\/Sectors\/Market\/ClientDetails/g, "@pages/clients/ui/ClientDetails"],
  [/@\/Components\/Sectors\/Market\/Counterparties/g, "@pages/clients/ui/Counterparties"],
  [/@\/Components\/Sectors\/Market\/Documents/g, "@pages/documents"],
  [/@\/Components\/Sectors\/Market\/History/g, "@pages/sales-history"],
  [/@\/Components\/Sectors\/Market\/Analytics/g, "@pages/analytics"],
  [/@\/Components\/Sectors\/Market\/Catalog/g, "@pages/catalog"],
  [/@\/Components\/Sectors\/Market\/Categories/g, "@pages/categories"],
  [/@\/Components\/Sectors\/Market\/Bar/g, "@pages/bar"],
  [/@\/Components\/Sectors\/Barber/g, "@pages/employees/ui/Barber"],
  [/@\/Components\/Sectors\/Hostel/g, "@shared/ui/legacy-hostel"],
  [/@\/Components\/Sectors\/Production/g, "@shared/ui/legacy-production"],
  [/@\/Components\/Sectors\/Warehouse/g, "@shared/ui/legacy-warehouse-sector"],
  [/@\/Components\/Sectors\/cafe/g, "@shared/ui/legacy-cafe"],
  [/@\/Components\/pages\/Info/g, "@pages/settings"],
  [/@\/Components\/pages\/Shifts/g, "@pages/shifts"],
  [/@\/Components\/pages\/Branch/g, "@pages/branches"],
  [/@\/Components\/pages\/Sell/g, "@pages/sell"],
  [/@\/Components\/pages\/Pending/g, "@pages/pending"],
  [/@\/Components\/pages\/AdditionalServices/g, "@pages/additional-services"],
  [/@\/Components\/pages\/Analytics/g, "@pages/analytics/ui/legacy"],
  [/@\/Components\/pages\/Landing/g, "@pages/auth/ui/Landing"],
  [/@\/Components\/pages\/Registration/g, "@pages/auth/ui/Registration"],
  [/@\/ProtectedRoute/g, "@app/providers/ProtectedRoute"],
  [/@\/config\//g, "@app/router/"],
];

/** Relative import patterns — rewritten to aliases regardless of depth */
const RELATIVE_PATTERNS = [
  // api
  [/from\s+(["'])(?:\.\.\/)+api\/authInterceptors(?:\.js)?\1/g, 'from "@shared/api/authInterceptors"'],
  [/from\s+(["'])(?:\.\.\/)+api\/auth(?:\.js)?\1/g, 'from "@entities/user/api/auth"'],
  [/from\s+(["'])(?:\.\.\/)+api\/products(?:\.js)?\1/g, 'from "@entities/product/api/products"'],
  [/from\s+(["'])(?:\.\.\/)+api\/warehouse(?:\.js)?\1/g, 'from "@entities/warehouse/api/warehouse"'],
  [/from\s+(["'])(?:\.\.\/)+api\/employees(?:\.js)?\1/g, 'from "@entities/employee/api/employees"'],
  [/from\s+(["'])(?:\.\.\/)+api\/departments(?:\.js)?\1/g, 'from "@entities/department/api/departments"'],
  [/from\s+(["'])(?:\.\.\/)+api\/analytics(?:\.js)?\1/g, 'from "@entities/analytics/api/analytics"'],
  [/from\s+(["'])(?:\.\.\/)+api\/notification(?:\.js)?\1/g, 'from "@entities/notification/api/notification"'],
  [/from\s+(["'])(?:\.\.\/)+api\/additionalServices(?:\.js)?\1/g, 'from "@shared/api/additionalServices"'],
  [/from\s+(["'])(?:\.\.\/)+api\/marketCashierSettings(?:\.js)?\1/g, 'from "@shared/api/marketCashierSettings"'],
  [/from\s+(["'])(?:\.\.\/)+api\/registerAccess(?:\.js)?\1/g, 'from "@shared/api/registerAccess"'],
  [/from\s+(["'])(?:\.\.\/)+api(?:\/index)?(?:\.js)?\1/g, 'from "@shared/api"'],
  [/import\s+(["'])(?:\.\.\/)+api(?:\/index)?(?:\.js)?\1/g, 'import "@shared/api"'],

  // store slices
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/userSlice(?:\.js)?\1/g, 'from "@entities/user"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/productSlice(?:\.js)?\1/g, 'from "@entities/product"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/warehouseSlice(?:\.js)?\1/g, 'from "@entities/warehouse"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/saleSlice(?:\.js)?\1/g, 'from "@entities/sale"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/cashSlice(?:\.js)?\1/g, 'from "@entities/cash"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/shiftSlice(?:\.js)?\1/g, 'from "@entities/shift"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/ClientSlice(?:\.js)?\1/g, 'from "@entities/client"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/counterpartySlice(?:\.js)?\1/g, 'from "@entities/counterparty"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/employeeSlice(?:\.js)?\1/g, 'from "@entities/employee"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/branchSlice(?:\.js)?\1/g, 'from "@entities/branch"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/departmentSlice(?:\.js)?\1/g, 'from "@entities/department"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/notificationSlice(?:\.js)?\1/g, 'from "@entities/notification"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/analyticsSlice(?:\.js)?\1/g, 'from "@entities/analytics"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/sectorSlice(?:\.js)?\1/g, 'from "@entities/sector"'],
  [/from\s+(["'])(?:\.\.\/)+store\/slices\/uiSlice(?:\.js)?\1/g, 'from "@entities/ui"'],

  // store creators
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/userCreators(?:\.js)?\1/g, 'from "@entities/user"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/productCreators(?:\.js)?\1/g, 'from "@entities/product"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/warehouseCreators(?:\.js)?\1/g, 'from "@entities/warehouse"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/warehouseThunk(?:\.js)?\1/g, 'from "@entities/warehouse"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/saleThunk(?:\.js)?\1/g, 'from "@entities/sale"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/shiftThunk(?:\.js)?\1/g, 'from "@entities/shift"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/clientCreators(?:\.js)?\1/g, 'from "@entities/client"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/employeeCreators(?:\.js)?\1/g, 'from "@entities/employee"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/branchCreators(?:\.js)?\1/g, 'from "@entities/branch"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/departmentCreators(?:\.js)?\1/g, 'from "@entities/department"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/notificationCreators(?:\.js)?\1/g, 'from "@entities/notification"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/analyticsCreators(?:\.js)?\1/g, 'from "@entities/analytics"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/transferCreators(?:\.js)?\1/g, 'from "@entities/warehouse"'],
  [/from\s+(["'])(?:\.\.\/)+store\/creators\/utils\/([^"']+)\1/g, 'from "@entities/warehouse/model/utils/$2"'],
  [/from\s+(["'])(?:\.\.\/)+store\/pagination(?:\.js)?\1/g, 'from "@shared/lib/pagination"'],
  [/from\s+(["'])(?:\.\.\/)+store(?:\/index)?(?:\.js)?\1/g, 'from "@app/store"'],

  // shared libs
  [/from\s+(["'])(?:\.\.\/)+hooks\/([^"']+)\1/g, 'from "@shared/hooks/$2"'],
  [/from\s+(["'])(?:\.\.\/)+utils\/([^"']+)\1/g, 'from "@shared/lib/$2"'],
  [/from\s+(["'])(?:\.\.\/)+theme\/([^"']+)\1/g, 'from "@shared/theme/$2"'],
  [/from\s+(["'])(?:\.\.\/)+constants\/([^"']+)\1/g, 'from "@shared/constants/$2"'],
  [/from\s+(["'])(?:\.\.\/)+context\/([^"']+)\1/g, 'from "@shared/context/$2"'],
  [/from\s+(["'])(?:\.\.\/)+services\/([^"']+)\1/g, 'from "@shared/services/$2"'],
  [/from\s+(["'])(?:\.\.\/)+assets\/([^"']+)\1/g, 'from "@shared/assets/$2"'],
  [/from\s+(["'])(?:\.\.\/)+i18n(?:\.js)?\1/g, 'from "@shared/config/i18n"'],
  [/import\s+(["'])(?:\.\.\/)+i18n(?:\.js)?\1/g, 'import "@shared/config/i18n"'],
  [/from\s+(["'])(?:\.\.\/)+pdf\/([^"']+)\1/g, 'from "@shared/lib/pdf/$2"'],
  [/from\s+(["'])(?:\.\.\/)+data\/([^"']+)\1/g, 'from "@shared/config/data/$2"'],

  // Components relative
  [/from\s+(["'])(?:\.\.\/)+Components\/Layout\/([^"']+)\1/g, 'from "@widgets/layout/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sidebar\/([^"']+)\1/g, 'from "@widgets/sidebar/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Header\/([^"']+)\1/g, 'from "@widgets/header/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/common\/([^"']+)\1/g, 'from "@shared/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Auth\/([^"']+)\1/g, 'from "@features/auth/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Debts\/([^"']+)\1/g, 'from "@features/debts/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/NotificationModal\/([^"']+)\1/g, 'from "@widgets/notification-modal/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Photo\/([^"']+)\1/g, 'from "@shared/ui/Photo/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/DepartmentDetails\/([^"']+)\1/g, 'from "@shared/ui/DepartmentDetails/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Deposits\/Sklad\/([^"']+)\1/g, 'from "@features/warehouse-ops/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Deposits\/KassaWorkerDet\/([^"']+)\1/g, 'from "@features/kassa-worker/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Deposits\/Kassa\/([^"']+)\1/g, 'from "@features/kassa/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Deposits\/BrandCategoryPage\/([^"']+)\1/g, 'from "@features/brand-category/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/CashierPage\/([^"']+)\1/g, 'from "@pages/cashier/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Warehouse\/([^"']+)\1/g, 'from "@pages/warehouse/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Clients\/([^"']+)\1/g, 'from "@pages/clients/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/ClientDetails\/([^"']+)\1/g, 'from "@pages/clients/ui/ClientDetails/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Counterparties\/([^"']+)\1/g, 'from "@pages/clients/ui/Counterparties/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Documents\/([^"']+)\1/g, 'from "@pages/documents/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/History\/([^"']+)\1/g, 'from "@pages/sales-history/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Analytics\/([^"']+)\1/g, 'from "@pages/analytics/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Catalog\/([^"']+)\1/g, 'from "@pages/catalog/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Categories\/([^"']+)\1/g, 'from "@pages/categories/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Market\/Bar\/([^"']+)\1/g, 'from "@pages/bar/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Barber\/([^"']+)\1/g, 'from "@pages/employees/ui/Barber/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Hostel\/([^"']+)\1/g, 'from "@shared/ui/legacy-hostel/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Production\/([^"']+)\1/g, 'from "@shared/ui/legacy-production/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/Warehouse\/([^"']+)\1/g, 'from "@shared/ui/legacy-warehouse-sector/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/Sectors\/cafe\/([^"']+)\1/g, 'from "@shared/ui/legacy-cafe/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Info\/([^"']+)\1/g, 'from "@pages/settings/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Shifts\/([^"']+)\1/g, 'from "@pages/shifts/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Branch\/([^"']+)\1/g, 'from "@pages/branches/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Sell\/([^"']+)\1/g, 'from "@pages/sell/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Pending\/([^"']+)\1/g, 'from "@pages/pending/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/AdditionalServices\/([^"']+)\1/g, 'from "@pages/additional-services/ui/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Analytics\/([^"']+)\1/g, 'from "@pages/analytics/ui/legacy/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Landing\/([^"']+)\1/g, 'from "@pages/auth/ui/Landing/$2"'],
  [/from\s+(["'])(?:\.\.\/)+Components\/pages\/Registration\/([^"']+)\1/g, 'from "@pages/auth/ui/Registration/$2"'],
  [/from\s+(["'])(?:\.\.\/)+ProtectedRoute(?:\.jsx)?\1/g, 'from "@app/providers/ProtectedRoute"'],
  [/from\s+(["'])(?:\.\.\/)+config\/([^"']+)\1/g, 'from "@app/router/$2"'],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|ts|tsx|scss|css)$/.test(name)) out.push(full);
  }
  return out;
}

function rewriteContent(content) {
  let next = content;
  for (const [re, to] of RELATIVE_PATTERNS) {
    next = next.replace(re, to);
  }
  for (const [re, to] of REPLACEMENTS) {
    next = next.replace(re, to);
  }
  return next;
}

let changed = 0;
for (const file of walk(SRC)) {
  const before = fs.readFileSync(file, "utf8");
  const after = rewriteContent(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
  }
}
console.log(`Rewrote imports in ${changed} files`);
