#!/usr/bin/env node
/**
 * One-shot FSD file mover for nur-market.
 * Moves source trees into FSD layers and leaves thin re-export shims
 * at old paths where needed for gradual import rewrite.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function moveDir(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn("skip missing", fromRel);
    return;
  }
  ensureDir(path.dirname(to));
  if (fs.existsSync(to)) {
    // merge: move children
    for (const name of fs.readdirSync(from)) {
      const srcItem = path.join(from, name);
      const destItem = path.join(to, name);
      if (fs.existsSync(destItem)) {
        console.warn("exists, skip", path.join(toRel, name));
        continue;
      }
      fs.renameSync(srcItem, destItem);
    }
    try {
      fs.rmdirSync(from);
    } catch {
      /* non-empty leftovers */
    }
  } else {
    fs.renameSync(from, to);
  }
  console.log("moved", fromRel, "->", toRel);
}

function moveFile(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn("skip missing file", fromRel);
    return;
  }
  ensureDir(path.dirname(to));
  if (fs.existsSync(to)) {
    console.warn("exists, skip file", toRel);
    return;
  }
  fs.renameSync(from, to);
  console.log("moved file", fromRel, "->", toRel);
}

function writeFile(rel, content) {
  const full = path.join(SRC, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content);
  console.log("wrote", rel);
}

// --- shared foundation ---
moveFile("api/index.js", "shared/api/base.js");
moveFile("api/authInterceptors.js", "shared/api/authInterceptors.js");
moveDir("utils", "shared/lib");
moveDir("hooks", "shared/hooks");
moveDir("theme", "shared/theme");
moveDir("constants", "shared/constants");
moveDir("context", "shared/context");
moveDir("services", "shared/services");
moveDir("assets", "shared/assets");
moveDir("fonts", "shared/assets/fonts");
moveDir("data", "shared/config/data");
moveDir("pdf", "shared/lib/pdf");
moveFile("i18n.js", "shared/config/i18n.js");
moveFile("index.css", "app/styles/index.css");

// domain api modules -> entities
moveFile("api/auth.js", "entities/user/api/auth.js");
moveFile("api/products.js", "entities/product/api/products.js");
moveFile("api/warehouse.js", "entities/warehouse/api/warehouse.js");
moveFile("api/employees.js", "entities/employee/api/employees.js");
moveFile("api/departments.js", "entities/department/api/departments.js");
moveFile("api/analytics.js", "entities/analytics/api/analytics.js");
moveFile("api/notification.js", "entities/notification/api/notification.js");
moveFile("api/additionalServices.js", "shared/api/additionalServices.js");
moveFile("api/marketCashierSettings.js", "shared/api/marketCashierSettings.js");
moveFile("api/registerAccess.js", "shared/api/registerAccess.js");

// redux slices -> entities model
const sliceMap = [
  ["userSlice.js", "user"],
  ["productSlice.js", "product"],
  ["warehouseSlice.js", "warehouse"],
  ["saleSlice.js", "sale"],
  ["cashSlice.js", "cash"],
  ["shiftSlice.js", "shift"],
  ["ClientSlice.js", "client"],
  ["counterpartySlice.js", "counterparty"],
  ["employeeSlice.js", "employee"],
  ["branchSlice.js", "branch"],
  ["departmentSlice.js", "department"],
  ["notificationSlice.js", "notification"],
  ["analyticsSlice.js", "analytics"],
  ["sectorSlice.js", "sector"],
  ["uiSlice.js", "ui"],
];

for (const [file, entity] of sliceMap) {
  moveFile(`store/slices/${file}`, `entities/${entity}/model/${file}`);
}

const creatorMap = [
  ["userCreators.js", "user"],
  ["productCreators.js", "product"],
  ["warehouseCreators.js", "warehouse"],
  ["warehouseThunk.js", "warehouse"],
  ["saleThunk.js", "sale"],
  ["shiftThunk.js", "shift"],
  ["clientCreators.js", "client"],
  ["employeeCreators.js", "employee"],
  ["branchCreators.js", "branch"],
  ["departmentCreators.js", "department"],
  ["notificationCreators.js", "notification"],
  ["analyticsCreators.js", "analytics"],
  ["transferCreators.js", "warehouse"],
];

for (const [file, entity] of creatorMap) {
  moveFile(`store/creators/${file}`, `entities/${entity}/model/${file}`);
}

if (fs.existsSync(path.join(SRC, "store/creators/utils"))) {
  moveDir("store/creators/utils", "entities/warehouse/model/utils");
}

moveFile("store/pagination.js", "shared/lib/pagination.js");

// app shell
moveFile("App.jsx", "app/App.jsx");
moveFile("App.scss", "app/App.scss");
moveFile("ProtectedRoute.jsx", "app/providers/ProtectedRoute.jsx");
moveFile("main.jsx", "app/main.jsx");

// widgets
moveDir("Components/Layout", "widgets/layout/ui");
moveDir("Components/Sidebar", "widgets/sidebar/ui");
moveDir("Components/Header", "widgets/header/ui");
moveDir("Components/common", "shared/ui");
moveDir("Components/NotificationModal", "widgets/notification-modal/ui");
moveDir("Components/Photo", "shared/ui/Photo");
moveDir("Components/DepartmentDetails", "shared/ui/DepartmentDetails");

// features
moveDir("Components/Auth", "features/auth/ui");
moveDir("Components/Deposits/Sklad", "features/warehouse-ops/ui");
moveDir("Components/Deposits/Kassa", "features/kassa/ui");
moveDir("Components/Deposits/KassaWorkerDet", "features/kassa-worker/ui");
moveDir("Components/Deposits/BrandCategoryPage", "features/brand-category/ui");
moveDir("Components/Debts", "features/debts/ui");

// pages from Market sector
moveDir("Components/Sectors/Market/CashierPage", "pages/cashier/ui");
moveDir("Components/Sectors/Market/Warehouse", "pages/warehouse/ui");
moveDir("Components/Sectors/Market/Clients", "pages/clients/ui");
moveDir("Components/Sectors/Market/ClientDetails", "pages/clients/ui/ClientDetails");
moveDir("Components/Sectors/Market/Counterparties", "pages/clients/ui/Counterparties");
moveDir("Components/Sectors/Market/Documents", "pages/documents/ui");
moveDir("Components/Sectors/Market/History", "pages/sales-history/ui");
moveDir("Components/Sectors/Market/Analytics", "pages/analytics/ui");
moveDir("Components/Sectors/Market/Catalog", "pages/catalog/ui");
moveDir("Components/Sectors/Market/Categories", "pages/categories/ui");
moveDir("Components/Sectors/Market/Bar", "pages/bar/ui");

// pages from Components/pages
moveDir("Components/pages/Info", "pages/settings/ui");
moveDir("Components/pages/Shifts", "pages/shifts/ui");
moveDir("Components/pages/Branch", "pages/branches/ui");
moveDir("Components/pages/Sell", "pages/sell/ui");
moveDir("Components/pages/Pending", "pages/pending/ui");
moveDir("Components/pages/AdditionalServices", "pages/additional-services/ui");
moveDir("Components/pages/Analytics", "pages/analytics/ui/legacy");
moveDir("Components/pages/Landing", "pages/auth/ui/Landing");
moveDir("Components/pages/Registration", "pages/auth/ui/Registration");

// employees (barber masters stub used by market)
moveDir("Components/Sectors/Barber", "pages/employees/ui/Barber");

// leftover sector stubs that other code may import
if (fs.existsSync(path.join(SRC, "Components/Sectors/Hostel"))) {
  moveDir("Components/Sectors/Hostel", "shared/ui/legacy-hostel");
}
if (fs.existsSync(path.join(SRC, "Components/Sectors/Production"))) {
  moveDir("Components/Sectors/Production", "shared/ui/legacy-production");
}
if (fs.existsSync(path.join(SRC, "Components/Sectors/Warehouse"))) {
  moveDir("Components/Sectors/Warehouse", "shared/ui/legacy-warehouse-sector");
}
if (fs.existsSync(path.join(SRC, "Components/Sectors/cafe"))) {
  moveDir("Components/Sectors/cafe", "shared/ui/legacy-cafe");
}

// router config
moveDir("config", "app/router");

console.log("\nFile moves done.");
