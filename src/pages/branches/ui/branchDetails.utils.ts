import {
  FaBuilding,
  FaCashRegister,
  FaWarehouse,
  FaShoppingCart,
  FaChartLine,
  FaUsers,
  FaUserFriends,
  FaCalendarAlt,
  FaTags,
  FaClipboardList,
  FaBed,
  FaBook,
  FaCheckSquare,
  FaCut,
  FaUserTie,
  FaCogs,
  FaMoneyBill,
  FaBoxOpen,
  FaExchangeAlt,
  FaTruckLoading,
  FaTrashAlt,
  FaComments,
  FaClock,
  FaTruck,
  FaFileAlt,
} from "react-icons/fa";
import { BsListCheck } from "react-icons/bs";
import api from "@shared/api";

export const SECTOR_MAPPING = {
  строительная_компания: "building",
  ремонтные_и_отделочные_работы: "building",
  архитектура_и_дизайн: "building",
  барбершоп: "barber",
  гостиница: "hostel",
  школа: "school",
  магазин: "market",
  кафе: "cafe",
  цветочный_магазин: "market",
  производство: "production",
  консалтинг: "consulting",
  склад: "warehouse",
  пилорама: "pilorama",
};

export const getSectorKey = (sectorName) => {
  if (!sectorName) return null;
  const sectorKey = sectorName.toLowerCase().replace(/\s+/g, "_");
  return SECTOR_MAPPING[sectorKey] || sectorKey;
};

export const sectorTabIconMap = {
  listCheck: BsListCheck,
  building: FaBuilding,
  tags: FaTags,
  filePerson: FaUserFriends,
  calendar: FaCalendarAlt,
  clipboard: FaClipboardList,
  chartBar: FaChartLine,
  user: FaUsers,
  comments: FaComments,
  cashRegister: FaCashRegister,
  chalkboard: FaUsers,
  moneyBill: FaMoneyBill,
  shoppingCart: FaShoppingCart,
  cogs: FaCogs,
  boxOpen: FaBoxOpen,
  chartLine: FaChartLine,
  exchangeAlt: FaExchangeAlt,
  truckLoading: FaTruckLoading,
  trashAlt: FaTrashAlt,
  layers: FaBuilding,
  warehouse: FaWarehouse,
  cut: FaCut,
  userTie: FaUserTie,
  bed: FaBed,
  book: FaBook,
  checkSquare: FaCheckSquare,
  clock: FaClock,
  truck: FaTruck,
  file: FaFileAlt,
};

export const getSectorTabIcon = (iconName) => {
  return sectorTabIconMap[iconName] || FaBuilding;
};

export const baseTabIconMap = {
  cashRegister: FaCashRegister,
  warehouse: FaWarehouse,
  shoppingCart: FaShoppingCart,
  chartLine: FaChartLine,
  users: FaUsers,
  userFriends: FaUserFriends,
  exchange: FaExchangeAlt,
};

export const getIconByRoute = (route, label) => {
  const routeLower = route.toLowerCase();
  const labelLower = label.toLowerCase();

  if (routeLower.includes("shifts") || labelLower.includes("смен"))
    return "clock";
  if (routeLower.includes("supplier") || labelLower.includes("поставщик"))
    return "truck";
  if (routeLower.includes("documents") || labelLower.includes("документ"))
    return "file";
  if (routeLower.includes("work") || routeLower.includes("process"))
    return "listCheck";
  if (routeLower.includes("objects") || routeLower.includes("apartments"))
    return "building";
  if (routeLower.includes("services") || routeLower.includes("услуги"))
    return "tags";
  if (routeLower.includes("clients") || routeLower.includes("клиенты"))
    return "filePerson";
  if (
    routeLower.includes("calendar") ||
    routeLower.includes("records") ||
    routeLower.includes("bookings") ||
    routeLower.includes("reservations")
  )
    return "calendar";
  if (routeLower.includes("history") || routeLower.includes("clipboard"))
    return "clipboard";
  if (
    routeLower.includes("analytics") ||
    routeLower.includes("reports") ||
    routeLower.includes("cash-reports")
  )
    return "chartBar";
  if (
    routeLower.includes("masters") ||
    routeLower.includes("teachers") ||
    routeLower.includes("employees")
  )
    return "user";
  if (routeLower.includes("comments") || routeLower.includes("leads"))
    return "comments";
  if (routeLower.includes("kassa") || routeLower.includes("cash"))
    return "cashRegister";
  if (routeLower.includes("salary") || routeLower.includes("payroll"))
    return "moneyBill";
  if (routeLower.includes("sale") || routeLower.includes("orders"))
    return "shoppingCart";
  if (routeLower.includes("services") && routeLower.includes("consulting"))
    return "cogs";
  if (routeLower.includes("products") || routeLower.includes("stocks"))
    return "boxOpen";
  if (routeLower.includes("movements") || routeLower.includes("operations"))
    return "exchangeAlt";
  if (routeLower.includes("supply") || routeLower.includes("purchasing"))
    return "truckLoading";
  if (routeLower.includes("write") || routeLower.includes("write_offs"))
    return "trashAlt";
  if (routeLower.includes("catalog") || routeLower.includes("directories"))
    return "layers";
  if (
    routeLower.includes("warehouse") ||
    routeLower.includes("stock") ||
    routeLower.includes("sklad")
  )
    return "warehouse";
  if (routeLower.includes("rooms")) return "bed";
  if (routeLower.includes("students") || routeLower.includes("groups"))
    return "filePerson";
  if (routeLower.includes("lessons")) return "book";
  if (routeLower.includes("attendance")) return "checkSquare";
  if (routeLower.includes("cut") || routeLower.includes("barber/services"))
    return "cut";
  if (routeLower.includes("masters") && routeLower.includes("barber"))
    return "userTie";
  if (routeLower.includes("tables")) return "building";
  if (routeLower.includes("menu")) return "tags";
  if (routeLower.includes("cook")) return "building";
  if (routeLower.includes("inventory")) return "clipboard";
  if (routeLower.includes("agents")) return "filePerson";

  if (labelLower.includes("процесс") || labelLower.includes("работа"))
    return "listCheck";
  if (labelLower.includes("квартир")) return "building";
  if (labelLower.includes("услуг")) return "tags";
  if (labelLower.includes("клиент")) return "filePerson";
  if (labelLower.includes("запис") || labelLower.includes("бронь"))
    return "calendar";
  if (labelLower.includes("истори")) return "clipboard";
  if (labelLower.includes("аналитик") || labelLower.includes("отчет"))
    return "chartBar";
  if (
    labelLower.includes("мастер") ||
    labelLower.includes("сотрудник") ||
    labelLower.includes("учител")
  )
    return "user";
  if (labelLower.includes("заявк") || labelLower.includes("запрос"))
    return "comments";
  if (labelLower.includes("касс")) return "cashRegister";
  if (labelLower.includes("зарплат")) return "moneyBill";
  if (labelLower.includes("продаж") || labelLower.includes("заказ"))
    return "shoppingCart";
  if (labelLower.includes("товар") || labelLower.includes("остатк"))
    return "boxOpen";
  if (labelLower.includes("перемещен") || labelLower.includes("операци"))
    return "exchangeAlt";
  if (labelLower.includes("поставк") || labelLower.includes("закупк"))
    return "truckLoading";
  if (labelLower.includes("списан")) return "trashAlt";
  if (labelLower.includes("каталог") || labelLower.includes("справочник"))
    return "layers";
  if (labelLower.includes("склад")) return "warehouse";
  if (labelLower.includes("комнат")) return "bed";
  if (labelLower.includes("ученик") || labelLower.includes("групп"))
    return "filePerson";
  if (labelLower.includes("урок")) return "book";
  if (labelLower.includes("посещаемост")) return "checkSquare";
  if (labelLower.includes("стол")) return "building";
  if (labelLower.includes("меню")) return "tags";
  if (labelLower.includes("кухн")) return "building";
  if (labelLower.includes("инвентаризац")) return "clipboard";
  if (labelLower.includes("агент")) return "filePerson";

  return "building";
};

const BRANCH_FIELDS = [
  "branch",
  "branch_id",
  "branch_uuid",
  "primary_branch_id",
  "branches",
  "branch_ids",
  "allowed_branch_ids",
];

const branchIdsOf = (item: any): string[] => {
  const out: string[] = [];
  const push = (v: any) => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) return v.forEach(push);
    if (typeof v === "object") return push(v.id);
    out.push(String(v));
  };
  BRANCH_FIELDS.forEach((f) => push(item?.[f]));
  return out;
};

/**
 * Запросы карточки филиала уходят с `branch=id`, сервер уже отфильтровал
 * данные, а у записей поля филиала может не быть (товары, движения кассы,
 * сотрудники). Строгий `item.branch === id` скрывал такие записи, поэтому
 * клиентски фильтруем только те, у которых информация о филиале есть;
 * записи без неё считаем отфильтрованными сервером.
 */
export const filterByBranch = (data, id, _branchField = "branch") => {
  if (!id || !Array.isArray(data)) return data;
  const anyHasField = data.some((item) => branchIdsOf(item).length > 0);
  if (!anyHasField) return data;
  return data.filter((item) => {
    const ids = branchIdsOf(item);
    return ids.length === 0 || ids.includes(String(id));
  });
};

export const filterSalesByBranch = (sales, id) => {
  if (!Array.isArray(sales)) return [];

  const hasBranchField =
    sales.length > 0 &&
    sales.some(
      (item) =>
        item.branch !== undefined ||
        item.branch_id !== undefined ||
        item.branch_uuid !== undefined
    );

  if (!hasBranchField) {
    return sales;
  }

  return sales.filter((item) => {
    if (!id) return true;
    const itemBranch = item.branch || item.branch_id || item.branch_uuid;
    if (itemBranch === undefined || itemBranch === null) return false;
    return String(itemBranch) === String(id);
  });
};

export const filterByDateRange = (data, dateFrom, dateTo, dateField = "created_at") => {
  if (!dateFrom && !dateTo) return data;

  return data.filter((item) => {
    if (!item[dateField]) return false;
    const itemDate = new Date(item[dateField]);

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (itemDate < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (itemDate > toDate) return false;
    }

    return true;
  });
};

export const computeAnalyticsData = (kassaData, salesData, warehouseData, filterByDate) => {
  const filteredKassa = filterByDate(kassaData);
  const filteredSales = filterByDate(salesData);
  const filteredWarehouse = filterByDate(warehouseData);

  const kassaIncome = filteredKassa
    .filter((item) => item.type === "income" || item.amount > 0)
    .reduce((sum, item) => sum + (Math.abs(Number(item.amount)) || 0), 0);

  const kassaExpense = filteredKassa
    .filter((item) => item.type === "expense" || item.amount < 0)
    .reduce((sum, item) => sum + (Math.abs(Number(item.amount)) || 0), 0);

  const kassaBalance = kassaIncome - kassaExpense;
  const kassaOperationsCount = filteredKassa.length;

  const salesTotal = filteredSales.reduce(
    (sum, item) => sum + Number(item.total || item.amount || 0),
    0
  );
  const salesCount = filteredSales.length;
  const salesAverage = salesCount > 0 ? salesTotal / salesCount : 0;

  const salesByStatus = filteredSales.reduce((acc, item) => {
    const status = item.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const warehouseTotalValue = filteredWarehouse.reduce((sum, item) => {
    const quantity = Number(item.quantity || item.remainder || 0);
    const price = Number(item.price || 0);
    return sum + quantity * price;
  }, 0);
  const warehouseTotalQuantity = filteredWarehouse.reduce(
    (sum, item) => sum + Number(item.quantity || item.remainder || 0),
    0
  );
  const warehouseItemsCount = filteredWarehouse.length;
  const warehouseAveragePrice =
    warehouseItemsCount > 0
      ? filteredWarehouse.reduce(
          (sum, item) => sum + Number(item.price || 0),
          0
        ) / warehouseItemsCount
      : 0;

  return {
    kassa: {
      income: kassaIncome,
      expense: kassaExpense,
      balance: kassaBalance,
      operationsCount: kassaOperationsCount,
    },
    sales: {
      total: salesTotal,
      count: salesCount,
      average: salesAverage,
      byStatus: salesByStatus,
    },
    warehouse: {
      totalValue: warehouseTotalValue,
      totalQuantity: warehouseTotalQuantity,
      itemsCount: warehouseItemsCount,
      averagePrice: warehouseAveragePrice,
    },
  };
};

export const fetchAllPages = async (url: any, params: any = {}) => {
  const acc: any[] = [];
  let next: any = url;
  while (next) {
    try {
      const { data } = await api.get(next, {
        params: next === url ? params : {},
      });
      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      acc.push(...results);
      next = data?.next;
    } catch (err: any) {
      console.error(`Ошибка загрузки ${url}:`, err);
      break;
    }
  }
  return acc;
};

export const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

export const formatDateTable = (dateString) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "0";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "KGS",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getSectorTableColumns = (routeLower) => {
  if (routeLower.includes("clients") || routeLower.includes("client")) {
    return ["Имя", "Телефон", "Email", "Статус"];
  } else if (routeLower.includes("services") || routeLower.includes("menu")) {
    return ["Название", "Цена", "Время", "Статус"];
  } else if (
    routeLower.includes("appointments") ||
    routeLower.includes("records") ||
    routeLower.includes("bookings")
  ) {
    return ["Дата", "Клиент", "Услуга", "Статус"];
  } else if (routeLower.includes("rooms")) {
    return ["Название", "Тип", "Цена", "Статус"];
  } else if (routeLower.includes("students")) {
    return ["Имя", "Группа", "Телефон", "Email"];
  } else if (routeLower.includes("groups")) {
    return ["Название", "Направление", "Количество", "Преподаватель"];
  } else if (routeLower.includes("lessons")) {
    return ["Название", "Дата", "Группа", "Преподаватель"];
  } else if (routeLower.includes("orders")) {
    return ["Дата", "Стол", "Сумма", "Статус"];
  } else if (routeLower.includes("tables")) {
    return ["Название", "Зона", "Статус", "Вместимость"];
  } else if (
    routeLower.includes("products") ||
    routeLower.includes("stock") ||
    routeLower.includes("warehouse")
  ) {
    return ["Название", "Количество", "Цена", "Единица"];
  } else if (routeLower.includes("work") || routeLower.includes("process")) {
    return ["Название", "Статус", "Дата начала", "Дата окончания"];
  } else if (routeLower.includes("objects")) {
    return ["Название", "Адрес", "Тип", "Статус"];
  } else if (
    routeLower.includes("cash-reports") ||
    routeLower.includes("cashflows") ||
    routeLower.includes("kassa")
  ) {
    return ["Дата", "Тип", "Сумма", "Описание"];
  } else if (routeLower.includes("analytics")) {
    return ["Период", "Показатель", "Значение", "Изменение"];
  } else if (
    routeLower.includes("inventory") ||
    routeLower.includes("equipment")
  ) {
    return ["Название", "Категория", "Состояние", "Серийный номер"];
  } else if (routeLower.includes("cook")) {
    return ["Заказ", "Блюдо", "Количество", "Статус"];
  } else if (
    routeLower.includes("payroll") ||
    routeLower.includes("staff") ||
    routeLower.includes("salary")
  ) {
    return ["Сотрудник", "Период", "Сумма", "Статус"];
  } else if (
    routeLower.includes("purchasing") ||
    routeLower.includes("purchases")
  ) {
    return ["Дата", "Поставщик", "Сумма", "Статус"];
  } else if (routeLower.includes("reports")) {
    return ["Дата", "Тип отчёта", "Сумма", "Статус"];
  } else if (routeLower.includes("reservations")) {
    return ["Дата", "Стол", "Клиент", "Статус"];
  } else if (routeLower.includes("bar")) {
    return ["Товар", "Количество", "Цена", "Сумма"];
  } else if (routeLower.includes("history") || routeLower.includes("sales")) {
    return ["Дата", "Клиент", "Сумма", "Статус"];
  } else if (
    routeLower.includes("directories") ||
    routeLower.includes("categories") ||
    routeLower.includes("brands")
  ) {
    return ["Название", "Тип", "Описание", "Статус"];
  } else if (routeLower.includes("movements")) {
    return ["Дата", "Тип", "Товар", "Количество"];
  } else if (routeLower.includes("supply")) {
    return ["Дата", "Поставщик", "Товар", "Количество"];
  } else if (
    routeLower.includes("write") ||
    routeLower.includes("write-offs")
  ) {
    return ["Дата", "Причина", "Товар", "Количество"];
  } else if (routeLower.includes("agents")) {
    return ["Имя", "Телефон", "Email", "Статус"];
  } else if (routeLower.includes("catalog")) {
    return ["Название", "Категория", "Цена", "Наличие"];
  } else if (routeLower.includes("leads")) {
    return ["Имя", "Телефон", "Источник", "Дата"];
  } else if (routeLower.includes("invoices")) {
    return ["Дата", "Студент", "Сумма", "Статус"];
  } else if (routeLower.includes("hotels") || routeLower.includes("beds")) {
    return ["Название", "Тип", "Цена", "Статус"];
  } else {
    return ["Название", "Описание", "Дата", "Статус"];
  }
};

export const getSectorRowValues = (item, routeLower) => {
  if (routeLower.includes("clients") || routeLower.includes("client")) {
    return [
      item.full_name || item.name || "—",
      item.phone || item.phone_number || "—",
      item.email || "—",
      item.status || "—",
    ];
  } else if (routeLower.includes("services") || routeLower.includes("menu")) {
    return [
      item.service_name || item.name || item.title || "—",
      formatCurrency(item.price || 0),
      item.time || item.duration || "—",
      item.is_active !== false ? "Активен" : "Неактивен",
    ];
  } else if (
    routeLower.includes("appointments") ||
    routeLower.includes("records") ||
    routeLower.includes("bookings")
  ) {
    return [
      formatDate(item.start_at || item.start_time || item.created_at),
      item.client_name ||
        item.client?.full_name ||
        item.client_label ||
        "—",
      item.service_name || item.service?.name || "—",
      item.status || "—",
    ];
  } else if (routeLower.includes("rooms")) {
    return [
      item.name || item.title || "—",
      item.type || item.room_type || "—",
      formatCurrency(item.price || 0),
      item.status || item.is_available !== false ? "Доступна" : "Занята",
    ];
  } else if (routeLower.includes("students")) {
    return [
      item.full_name || item.name || "—",
      item.group_name || item.group?.name || "—",
      item.phone || "—",
      item.email || "—",
    ];
  } else if (routeLower.includes("groups")) {
    return [
      item.name || item.title || "—",
      item.direction || item.course || item.course_name || "—",
      item.students_count || item.students?.length || 0,
      item.teacher_name || item.teacher?.full_name || "—",
    ];
  } else if (routeLower.includes("lessons")) {
    return [
      item.name || item.title || "—",
      formatDate(item.date || item.start_time || item.created_at),
      item.group_name || item.group?.name || "—",
      item.teacher_name || item.teacher?.full_name || "—",
    ];
  } else if (routeLower.includes("orders")) {
    return [
      formatDate(item.created_at || item.date),
      item.table_name || item.table?.name || item.table || "—",
      formatCurrency(item.total || item.total_amount || 0),
      item.status || "—",
    ];
  } else if (routeLower.includes("tables")) {
    return [
      item.name || item.title || "—",
      item.zone_name || item.zone?.title || item.zone || "—",
      item.status || (item.is_occupied ? "Занят" : "Свободен"),
      item.capacity || item.seats || "—",
    ];
  } else if (
    routeLower.includes("products") ||
    routeLower.includes("stock") ||
    routeLower.includes("warehouse")
  ) {
    return [
      item.name || item.title || "—",
      item.quantity || item.remainder || 0,
      formatCurrency(item.price || 0),
      item.unit || "—",
    ];
  } else if (routeLower.includes("work") || routeLower.includes("process")) {
    return [
      item.name || item.title || "—",
      item.status || "—",
      formatDate(item.start_date || item.created_at),
      formatDate(item.end_date || item.completed_at),
    ];
  } else if (routeLower.includes("objects")) {
    return [
      item.name || item.title || "—",
      item.address || "—",
      item.type || item.object_type || "—",
      item.status || "—",
    ];
  } else if (
    routeLower.includes("cash-reports") ||
    routeLower.includes("cashflows") ||
    routeLower.includes("kassa")
  ) {
    return [
      formatDate(item.created_at || item.date),
      item.type || item.operation_type || "—",
      formatCurrency(item.amount || 0),
      item.description || item.comment || "—",
    ];
  } else if (routeLower.includes("analytics")) {
    return [
      formatDate(item.period || item.date || item.created_at),
      item.metric || item.indicator || "—",
      formatCurrency(item.value || item.amount || 0),
      item.change
        ? `${item.change > 0 ? "+" : ""}${item.change}%`
        : "—",
    ];
  } else if (
    routeLower.includes("inventory") ||
    routeLower.includes("equipment")
  ) {
    return [
      item.title || item.name || "—",
      item.category || "—",
      item.condition || item.status || "—",
      item.serial_number || "—",
    ];
  } else if (routeLower.includes("cook")) {
    return [
      item.order_id || item.order || "—",
      item.menu_item_name || item.dish || "—",
      item.quantity || 0,
      item.status || item.cooking_status || "—",
    ];
  } else if (
    routeLower.includes("payroll") ||
    routeLower.includes("staff") ||
    routeLower.includes("salary")
  ) {
    return [
      item.employee_name || item.full_name || item.name || "—",
      item.period || formatDate(item.date || item.created_at),
      formatCurrency(item.amount || item.salary || 0),
      item.status || item.payment_status || "—",
    ];
  } else if (
    routeLower.includes("purchasing") ||
    routeLower.includes("purchases")
  ) {
    return [
      formatDate(item.date || item.created_at),
      item.supplier_name || item.supplier || "—",
      formatCurrency(item.total || item.amount || 0),
      item.status || "—",
    ];
  } else if (routeLower.includes("reports")) {
    return [
      formatDate(item.date || item.created_at),
      item.report_type || item.type || "—",
      formatCurrency(item.total || item.amount || 0),
      item.status || "—",
    ];
  } else if (routeLower.includes("reservations")) {
    return [
      formatDate(item.date || item.start_time || item.created_at),
      item.table_name || item.table || "—",
      item.client_name || item.client || "—",
      item.status || "—",
    ];
  } else if (routeLower.includes("bar")) {
    return [
      item.product_name || item.name || item.title || "—",
      item.quantity || 0,
      formatCurrency(item.price || 0),
      formatCurrency((item.quantity || 0) * (item.price || 0)),
    ];
  } else if (routeLower.includes("history") || routeLower.includes("sales")) {
    return [
      formatDate(item.created_at || item.date),
      item.client_name || item.client || "—",
      formatCurrency(item.total || item.amount || 0),
      item.status || "—",
    ];
  } else if (
    routeLower.includes("directories") ||
    routeLower.includes("categories") ||
    routeLower.includes("brands")
  ) {
    return [
      item.name || item.title || "—",
      item.type ||
        (routeLower.includes("categories")
          ? "Категория"
          : routeLower.includes("brands")
          ? "Бренд"
          : "—"),
      item.description || "—",
      item.is_active !== false ? "Активен" : "Неактивен",
    ];
  } else if (routeLower.includes("movements")) {
    return [
      formatDate(item.date || item.created_at),
      item.movement_type || item.type || "—",
      item.product_name || item.product || "—",
      item.quantity || 0,
    ];
  } else if (routeLower.includes("supply")) {
    return [
      formatDate(item.date || item.created_at),
      item.supplier_name || item.supplier || "—",
      item.product_name || item.product || "—",
      item.quantity || 0,
    ];
  } else if (
    routeLower.includes("write") ||
    routeLower.includes("write-offs")
  ) {
    return [
      formatDate(item.date || item.created_at),
      item.reason || item.write_off_reason || "—",
      item.product_name || item.product || "—",
      item.quantity || 0,
    ];
  } else if (routeLower.includes("agents")) {
    return [
      item.full_name || item.name || "—",
      item.phone || "—",
      item.email || "—",
      item.status || item.is_active !== false ? "Активен" : "Неактивен",
    ];
  } else if (routeLower.includes("catalog")) {
    return [
      item.name || item.title || "—",
      item.category_name || item.category || "—",
      formatCurrency(item.price || 0),
      item.in_stock !== false ? "В наличии" : "Нет в наличии",
    ];
  } else if (routeLower.includes("leads")) {
    return [
      item.name || item.full_name || "—",
      item.phone || "—",
      item.source || "—",
      formatDate(item.created_at || item.date),
    ];
  } else if (routeLower.includes("invoices")) {
    return [
      formatDate(item.date || item.created_at),
      item.student_name || item.student || "—",
      formatCurrency(item.amount || item.total || 0),
      item.status || item.payment_status || "—",
    ];
  } else if (routeLower.includes("hotels") || routeLower.includes("beds")) {
    return [
      item.name || item.title || "—",
      item.type || (routeLower.includes("beds") ? "Койко-место" : "Отель"),
      formatCurrency(item.price || 0),
      item.status || item.is_available !== false ? "Доступен" : "Занят",
    ];
  } else {
    return [
      item.name || item.title || item.full_name || "—",
      item.description || item.notes || "—",
      formatDate(item.created_at || item.date),
      item.status || "—",
    ];
  }
};

export const loadSectorRouteData = async (route, id) => {
  let data: any[] = [];
  const routeLower = route.toLowerCase();

  // Барбершоп
  if (routeLower.includes("barber/clients")) {
    data = await fetchAllPages("/barbershop/clients/", { branch: id });
  } else if (routeLower.includes("barber/services")) {
    data = await fetchAllPages("/barbershop/services/", { branch: id });
  } else if (
    routeLower.includes("barber/records") ||
    routeLower.includes("barber/appointments")
  ) {
    data = await fetchAllPages("/barbershop/appointments/", { branch: id });
  } else if (routeLower.includes("barber/history")) {
    data = await fetchAllPages("/barbershop/appointments/", { branch: id });
  } else if (routeLower.includes("barber/masters")) {
    data = await fetchAllPages("/users/employees/", { branch: id });
  } else if (routeLower.includes("barber/warehouse")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("barber/cash-reports")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  }
  // Гостиница
  else if (routeLower.includes("hostel/rooms")) {
    data = await fetchAllPages("/booking/rooms/", { branch: id });
  } else if (routeLower.includes("hostel/bookings")) {
    data = await fetchAllPages("/booking/bookings/", { branch: id });
  } else if (routeLower.includes("hostel/clients")) {
    data = await fetchAllPages("/main/clients/", { branch: id });
  } else if (routeLower.includes("hostel/bar")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("hostel/analytics")) {
    const [bookings, hotels, rooms] = await Promise.all([
      fetchAllPages("/booking/bookings/", { branch: id }),
      fetchAllPages("/booking/hotels/", { branch: id }),
      fetchAllPages("/booking/rooms/", { branch: id }),
    ]);
    data = [...bookings, ...hotels, ...rooms];
  } else if (routeLower.includes("hostel/kassa")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  }
  // Школа
  else if (routeLower.includes("school/students")) {
    data = await fetchAllPages("/education/students/", { branch: id });
  } else if (routeLower.includes("school/groups")) {
    data = await fetchAllPages("/education/groups/", { branch: id });
  } else if (routeLower.includes("school/lessons")) {
    data = await fetchAllPages("/education/lessons/", { branch: id });
  } else if (routeLower.includes("school/teachers")) {
    data = await fetchAllPages("/users/employees/", { branch: id });
  } else if (routeLower.includes("school/leads")) {
    data = await fetchAllPages("/education/leads/", { branch: id });
  } else if (routeLower.includes("school/invoices")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  }
  // Кафе
  else if (routeLower.includes("cafe/menu")) {
    data = await fetchAllPages("/cafe/menu-items/", { branch: id });
  } else if (routeLower.includes("cafe/orders")) {
    data = await fetchAllPages("/cafe/orders/", { branch: id });
  } else if (routeLower.includes("cafe/tables")) {
    data = await fetchAllPages("/cafe/tables/", { branch: id });
  } else if (routeLower.includes("cafe/clients")) {
    data = await fetchAllPages("/cafe/clients/", { branch: id });
  } else if (routeLower.includes("cafe/stock")) {
    data = await fetchAllPages("/cafe/warehouse/", { branch: id });
  } else if (routeLower.includes("cafe/inventory")) {
    const [equipment, sessions] = await Promise.all([
      fetchAllPages("/cafe/equipment/", { branch: id }).catch(() => []),
      fetchAllPages("/cafe/inventory/sessions/", { branch: id }).catch(() => []),
    ]);
    data = [...equipment, ...sessions];
  } else if (routeLower.includes("cafe/cook")) {
    data = await fetchAllPages("/cafe/orders/", { branch: id });
  } else if (routeLower.includes("cafe/payroll")) {
    data = await fetchAllPages("/cafe/staff/", { branch: id });
  } else if (routeLower.includes("cafe/purchasing")) {
    data = await fetchAllPages("/cafe/purchases/", { branch: id });
  } else if (routeLower.includes("cafe/reports")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  } else if (routeLower.includes("cafe/reservations")) {
    data = await fetchAllPages("/cafe/bookings/", { branch: id });
  } else if (routeLower.includes("cafe/analytics")) {
    data = await fetchAllPages("/cafe/staff/", { branch: id });
  } else if (routeLower.includes("cafe/kassa")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  }
  // Строительство
  else if (routeLower.includes("building/work")) {
    data = await fetchAllPages("/main/contractor-works/", { branch: id });
  } else if (routeLower.includes("building/objects")) {
    data = await fetchAllPages("/main/object-sales/", { branch: id });
  }
  // Консалтинг
  else if (
    routeLower.includes("consulting/client") &&
    !routeLower.includes("client-requests")
  ) {
    data = await fetchAllPages("/main/clients/", { branch: id });
  } else if (routeLower.includes("consulting/client-requests")) {
    data = await fetchAllPages("/consalting/requests/", { branch: id });
  } else if (routeLower.includes("consulting/bookings")) {
    data = await fetchAllPages("/booking/bookings/", { branch: id });
  } else if (routeLower.includes("consulting/kassa")) {
    data = await fetchAllPages("/construction/cashflows/", { branch: id });
  } else if (routeLower.includes("consulting/teachers")) {
    data = await fetchAllPages("/users/employees/", { branch: id });
  } else if (routeLower.includes("consulting/salary")) {
    data = await fetchAllPages("/consalting/salaries/", { branch: id }).catch(
      () => []
    );
  } else if (routeLower.includes("consulting/sale")) {
    data = await fetchAllPages("/consalting/sales/", { branch: id }).catch(
      () => []
    );
  } else if (routeLower.includes("consulting/services")) {
    try {
      const response = await api.get("/consalting/services/", {
        params: { branch: id },
      });
      data = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
        ? response.data
        : [];
    } catch {
      data = [];
    }
  } else if (routeLower.includes("consulting/analytics")) {
    const [rows, services, requests] = await Promise.all([
      fetchAllPages("/consalting/sales/", { branch: id }).catch(() => []),
      api
        .get("/consulting/services/", { params: { branch: id } })
        .then((r) =>
          Array.isArray(r.data?.results)
            ? r.data.results
            : Array.isArray(r.data)
            ? r.data
            : []
        )
        .catch(() => []),
      fetchAllPages("/consulting/client-requests/", { branch: id }).catch(
        () => []
      ),
    ]);
    data = [...rows, ...services, ...requests];
  }
  // Склад
  else if (routeLower.includes("warehouse/products")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("warehouse/stocks")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("warehouse/movements")) {
    data = await fetchAllPages("/warehouse/movements/", { branch: id });
  } else if (routeLower.includes("warehouse/supply")) {
    data = await fetchAllPages("/warehouse/supply/", { branch: id });
  } else if (routeLower.includes("warehouse/write")) {
    data = await fetchAllPages("/warehouse/write-offs/", { branch: id });
  } else if (routeLower.includes("warehouse/clients")) {
    data = await fetchAllPages("/main/clients/", { branch: id });
  } else if (routeLower.includes("warehouse/analytics")) {
    const [products, movements, supply] = await Promise.all([
      fetchAllPages("/main/products/list/", { branch: id }),
      fetchAllPages("/warehouse/movements/", { branch: id }).catch(() => []),
      fetchAllPages("/warehouse/supply/", { branch: id }).catch(() => []),
    ]);
    data = [...products, ...movements, ...supply];
  } else if (routeLower.includes("warehouse/directories")) {
    const [categories, brands] = await Promise.all([
      fetchAllPages("/main/categories/", { branch: id }).catch(() => []),
      fetchAllPages("/main/brands/", { branch: id }).catch(() => []),
    ]);
    data = [...categories, ...brands];
  }
  // Производство
  else if (routeLower.includes("production/warehouse")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("production/agents")) {
    data = await fetchAllPages("/main/owners/agents/products/", { branch: id });
  } else if (routeLower.includes("production/catalog")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  }
  // Пилорама
  else if (routeLower.includes("pilorama/warehouse")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  }
  // Магазин
  else if (routeLower.includes("market/bar")) {
    data = await fetchAllPages("/main/products/list/", { branch: id });
  } else if (routeLower.includes("market/history")) {
    data = await fetchAllPages("/main/pos/sales/", { branch: id });
  } else if (routeLower.includes("market/analytics")) {
    data = await fetchAllPages("/main/pos/sales/", { branch: id });
  }

  return filterByBranch(data, id);
};
