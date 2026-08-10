import { useMemo } from "react";
import {
  DollarSign,
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  TrendingUp,
  Calendar,
  HelpCircle,
  X,
} from "lucide-react";
import {
  translateLowStockStatus,
  normalizeLowStockStatusType,
  barPercentOfMax,
  sortStockList,
} from "../../analytics.utils";
import {
  START_HIDDEN_SALES_KPI_TITLES,
  START_HIDDEN_PRODUCTS_KPI_TITLES,
} from "../../analytics.constants";
import {
  formatNumber,
  formatAnalyticsQty,
  formatDateForChart,
  formatCurrency,
} from "./formatters";

export function useAnalyticsTabData({
  analyticsData,
  activeTab,
  isStartTariff,
  stockSort,
  salaryAnalyticsRows,
}: any) {
// Данные для вкладки "Продажи"
const salesData = useMemo(() => {
  const filterSalesKpis = (kpis: any) =>
    isStartTariff
      ? kpis.filter((kpi: any) => !START_HIDDEN_SALES_KPI_TITLES.has(kpi.title))
      : kpis;

  if (!analyticsData || activeTab !== "sales") {
    return {
      kpis: filterSalesKpis([
        {
          title: "Выручка",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Транзакции",
          value: "0",
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          title: "Средний чек",
          value: "0",
          currency: "сом",
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          title: "Клиенты",
          value: "0",
          icon: Users,
          color: "#f7d617",
        },
      ]),
      salesChart: {
        labels: [],
        data: [],
      },
      topProducts: [],
      documents: [],
      paymentMethods: {
        labels: [],
        data: [],
      },
    };
  }

  const cards = analyticsData.cards || {};
  const charts = analyticsData.charts || {};
  const tables = analyticsData.tables || {};

  const paymentMethodLabels = {
    cash: "Наличные",
    card: "Карта",
    transfer: "Перевод",
  };

  return {
    kpis: filterSalesKpis([
      {
        title: "Выручка",
        value: formatNumber(cards.revenue || "0"),
        raw: Number(cards.revenue || 0),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Транзакции",
        value: formatNumber(cards.transactions || 0),
        raw: Number(cards.transactions || 0),
        icon: ShoppingCart,
        color: "#f7d617",
      },
      {
        title: "Средний чек",
        value: formatNumber(cards.avg_check || "0"),
        raw: Number(cards.avg_check || 0),
        currency: "сом",
        icon: BarChart3,
        color: "#f7d617",
      },
      {
        title: "Клиенты",
        value: formatNumber(cards.clients || 0),
        raw: Number(cards.clients || 0),
        icon: Users,
        color: "#f7d617",
      },
    ]),
    salesChart: {
      labels:
        charts.sales_dynamics?.map((item: any) => formatDateForChart(item.date)) ||
        [],
      data:
        charts.sales_dynamics?.map((item: any) => parseFloat(item.value || 0)) ||
        [],
    },
    topProducts:
      tables.top_products?.map((product: any) => ({
        name: product.name,
        sold: product.sold || 0,
        revenue: parseFloat(product.revenue || 0),
      })) || [],
    documents:
      tables.documents?.map((doc: any) => ({
        name: doc.name,
        quantity: doc.count || 0,
        amount: parseFloat(doc.sum || 0),
        warehouse: doc.stock ? parseFloat(doc.stock) : 0,
      })) || [],
    paymentMethods: {
      labels:
        charts.payment_methods?.map(
          (item: any) => paymentMethodLabels[item.method] || item.method,
        ) || [],
      data:
        charts.payment_methods?.map((item: any) =>
          parseFloat(item.total || item.count || 0),
        ) || [],
    },
  };
}, [analyticsData, activeTab, isStartTariff]);

// Данные для вкладки "Склад"
const warehouseData = useMemo(() => {
  if (!analyticsData || activeTab !== "warehouse") {
    return {
      kpis: [
        {
          title: "Всего товаров",
          value: "0",
          subtitle: "В 0 категориях",
          icon: Package,
          color: "#f7d617",
        },
        {
          title: "Стоимость склада",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Заканчиваются",
          value: "0",
          subtitle: "Требуют заказа",
          icon: TrendingUp,
          color: "#f7d617",
        },
        {
          title: "Оборачиваемость",
          value: "0 дн.",
          icon: BarChart3,
          color: "#f7d617",
        },
      ],
      categoryChart: {
        labels: [],
        data: [],
        colors: [],
      },
      movementChart: {
        labels: [],
        data: [],
      },
      lowStock: [],
    };
  }

  const cards = analyticsData.cards || {};
  const charts = analyticsData.charts || {};
  const tables = analyticsData.tables || {};

  // Генерируем цвета для категорий
  const colors = [
    "#f7d617",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#9ca3af",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];

  return {
    kpis: [
      {
        title: "Всего товаров",
        value: formatNumber(cards.total_products || 0),
        subtitle: `В ${cards.categories_count || cards.categories || 0} категориях`,
        icon: Package,
        color: "#f7d617",
      },
      {
        title: "Стоимость склада",
        value: formatNumber(cards.inventory_value || "0"),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Общий остаток",
        value: formatAnalyticsQty(
          cards.total_stock_quantity ?? cards.total_units ?? 0,
        ),
        subtitle: "Сумма количеств всех товаров",
        icon: TrendingUp,
        color: "#f7d617",
      },
      {
        title: "Товаров с нулём",
        value: formatNumber(
          cards.zero_stock_products_count ??
            cards.zero_stock_count ??
            cards.out_of_stock_count ??
            0,
        ),
        icon: BarChart3,
        color: "#f7d617",
      },
    ],
    categoryChart: {
      labels: charts.category_distribution?.map((item: any) => item.name) || [],
      data: charts.category_distribution?.map((item: any) => item.percent) || [],
      colors: colors.slice(0, charts.category_distribution?.length || 0),
    },
    movementChart: {
      labels:
        (charts.movement_units || charts.movement || []).map((item: any) =>
          formatDateForChart(item.date),
        ) || [],
      data:
        (charts.movement_units || charts.movement || []).map(
          (item: any) => item.units || 0,
        ) || [],
    },
    lowStock:
      (tables.products_stock || tables.low_stock || []).map((item: any) => ({
        name: item.name,
        stock: item.quantity ?? item.qty ?? 0,
        minimum: item.min || 0,
        status: translateLowStockStatus(item.status),
        statusType: normalizeLowStockStatusType(item.status),
      })) || [],
  };
}, [analyticsData, activeTab]);

// Данные для вкладки "Кассы"
const cashierData = useMemo(() => {
  if (!analyticsData || activeTab !== "cashiers") {
    return {
      kpis: [
        {
          title: "Выручка за день",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Транзакций",
          value: "0",
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          title: "Средний чек",
          value: "0",
          currency: "сом",
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          title: "Наличных в кассе",
          value: "0",
          currency: "сом",
          subtitle: "0% от выручки",
          icon: DollarSign,
          color: "#f7d617",
        },
      ],
      hourlyChart: {
        labels: [],
        data: [],
      },
      paymentMethods: {
        labels: [],
        data: [],
        colors: [],
      },
      weeklyTransactions: {
        labels: [],
        data: [],
      },
      paymentDetails: [],
      peakHours: [],
    };
  }

  const cards = analyticsData.cards || {};
  const charts = analyticsData.charts || {};
  const tables = analyticsData.tables || {};

  // Маппинг способов оплаты
  const paymentMethodLabels = {
    cash: "Наличные",
    transfer: "Безналичные",
    card: "Карта",
    debt: "Долг",
    deferred: "Отсрочка",
  };

  // Маппинг дней недели
  const weekdayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  return {
    kpis: [
      {
        title: "Выручка за день",
        value: formatNumber(cards.revenue || "0"),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Транзакций",
        value: formatNumber(cards.transactions || 0),
        icon: ShoppingCart,
        color: "#f7d617",
      },
      {
        title: "Средний чек",
        value: formatNumber(cards.avg_check || "0"),
        currency: "сом",
        icon: BarChart3,
        color: "#f7d617",
      },
      {
        title: "Наличных в кассе",
        value: formatNumber(cards.cash_in_box || "0"),
        currency: "сом",
        subtitle: `${cards.cash_share_percent || 0}% от выручки`,
        icon: DollarSign,
        color: "#f7d617",
      },
    ],
    hourlyChart: {
      labels:
        charts.sales_by_hours
          ?.sort((a, b) => (a.hour || 0) - (b.hour || 0))
          .map((item: any) => `${String(item.hour || 0).padStart(2, "0")}:00`) ||
        [],
      data:
        charts.sales_by_hours
          ?.sort((a, b) => (a.hour || 0) - (b.hour || 0))
          .map((item: any) => parseFloat(item.revenue || 0)) || [],
    },
    paymentMethods: {
      labels:
        charts.payment_methods?.map(
          (item: any) => paymentMethodLabels[item.name] || item.name,
        ) || [],
      data: charts.payment_methods?.map((item: any) => item.percent) || [],
      colors: ["#f7d617", "#f59e0b", "#10b981"],
    },
    weeklyTransactions: {
      labels: weekdayLabels,
      data: charts.transactions_by_weekday
        ? weekdayLabels.map((_: any, index: any) => {
            const weekday = charts.transactions_by_weekday.find(
              (item: any) => item.weekday === index,
            );
            return weekday?.transactions || 0;
          })
        : [],
    },
    paymentDetails:
      tables.payment_detail?.map((item: any) => ({
        method: paymentMethodLabels[item.method] || item.method,
        transactions: item.transactions || 0,
        amount: parseFloat(item.sum || 0),
        share: `${item.share || 0}%`,
      })) || [],
    peakHours:
      tables.peak_hours?.map((item: any) => ({
        time: `${item.hour}:00`,
        transactions: item.transactions || 0,
        revenue: parseFloat(item.revenue || 0),
        avgCheck: parseFloat(item.avg_check || 0),
      })) || [],
  };
}, [analyticsData, activeTab]);

// Данные для вкладки "Смены"
const shiftsData = useMemo(() => {
  if (!analyticsData || activeTab !== "shifts") {
    return {
      kpis: [
        {
          title: "Активных смен",
          value: "0",
          subtitle: "В данный момент",
          icon: Calendar,
          color: "#f7d617",
        },
        {
          title: "Смен сегодня",
          value: "0",
          subtitle: "Всего открыто",
          icon: Calendar,
          color: "#f7d617",
        },
        {
          title: "Средняя длит.",
          value: "0 ч",
          subtitle: "На смену",
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          title: "Средний доход",
          value: "0",
          currency: "сом",
          subtitle: "За смену",
          icon: DollarSign,
          color: "#f7d617",
        },
      ],
      shiftsChart: {
        labels: [],
        data: [],
      },
      activeShifts: [],
      bestCashiers: [],
    };
  }

  const cards = analyticsData.cards || {};
  const charts = analyticsData.charts || {};
  const tables = analyticsData.tables || {};

  // Форматирование времени
  const formatTime = (dateString: any) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  return {
    kpis: [
      {
        title: "Активных смен",
        value: formatNumber(cards.active_shifts || 0),
        subtitle: "В данный момент",
        icon: Calendar,
        color: "#f7d617",
      },
      {
        title: "Смен сегодня",
        value: formatNumber(cards.shifts_today || 0),
        subtitle: "Всего открыто",
        icon: Calendar,
        color: "#f7d617",
      },
      {
        title: "Средняя длит.",
        value: `${formatNumber(cards.avg_duration_hours || 0)} ч`,
        subtitle: "На смену",
        icon: BarChart3,
        color: "#f7d617",
      },
      {
        title: "Средний доход",
        value: formatNumber(cards.avg_revenue_per_shift || "0"),
        currency: "сом",
        subtitle: "За смену",
        icon: DollarSign,
        color: "#f7d617",
      },
    ],
    shiftsChart: {
      labels: charts.sales_by_shift_bucket?.map((item: any) => item.name) || [],
      data:
        charts.sales_by_shift_bucket?.map((item: any) =>
          parseFloat(item.revenue || 0),
        ) || [],
    },
    activeShifts:
      tables.active_shifts?.map((shift: any) => ({
        cashier: shift.cashier || "-",
        register: shift.cashbox || "-",
        start: formatTime(shift.opened_at),
        sales: parseFloat(shift.sales || 0),
        status: shift.status === "open" ? "Активна" : "Закрыта",
      })) || [],
    bestCashiers:
      tables.best_cashiers?.map((cashier: any) => ({
        place: cashier.place || 0,
        cashier: cashier.cashier || "-",
        shifts: cashier.shifts || 0,
        sales: parseFloat(cashier.sales || 0),
        avgCheck: parseFloat(cashier.avg_check || 0),
      })) || [],
  };
}, [analyticsData, activeTab]);

// Данные для вкладки "Товары"
const productsData = useMemo(() => {
  const filterProductsKpis = (kpis: any) =>
    isStartTariff
      ? kpis.filter(
          (kpi) => !START_HIDDEN_PRODUCTS_KPI_TITLES.has(kpi.title),
        )
      : kpis;

  if (!analyticsData || activeTab !== "products") {
    return {
      kpis: filterProductsKpis([
        {
          title: "Общее кол-во товаров",
          value: "0",
          icon: Package,
          color: "#f7d617",
          subtitle: "В каталоге",
        },
        {
          title: "Стоимость остатков",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Товаров с низким остатком",
          value: "0",
          icon: Package,
          color: "#f7d617",
          anchorKey: "lowStockProducts",
        },
        {
          title: "Отклоненные товары",
          value: "0",
          icon: X,
          color: "#f7d617",
          subtitle: "rejected_products_count",
        },
        {
          title: "Продажи без товара",
          value: "0",
          icon: HelpCircle,
          color: "#f7d617",
          subtitle: "sales_lines_missing_product_count",
        },
      ]),
      topByRevenue: [],
      topByQuantity: [],
      categories: [],
      brands: [],
      lowStockProducts: [],
    };
  }

  const cards = analyticsData.cards || {};
  const tables = analyticsData.tables || {};

  return {
    kpis: filterProductsKpis([
      {
        title: "Общее кол-во товаров",
        value: formatNumber(cards.catalog_products_count || 0),
        icon: Package,
        color: "#f7d617",
        subtitle: "В каталоге",
      },
      {
        title: "Стоимость остатков",
        value: formatNumber(cards.stock_value || "0"),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Товаров с низким остатком",
        value: formatNumber(cards.low_stock_count || 0),
        icon: Package,
        color: "#f7d617",
        anchorKey: "lowStockProducts",
      },
      {
        title: "Отклоненные товары",
        value: formatNumber(cards.rejected_products_count || 0),
        icon: X,
        color: "#f7d617",
        subtitle: "rejected_products_count",
      },
      {
        title: "Продажи без товара",
        value: formatNumber(cards.sales_lines_missing_product_count || 0),
        icon: HelpCircle,
        color: "#f7d617",
        subtitle: "sales_lines_missing_product_count",
      },
    ]),
    topByRevenue: tables.top_by_revenue || [],
    topByQuantity: tables.top_by_quantity || [],
    categories: tables.categories || [],
    brands: tables.brands || [],
    lowStockProducts:
      (tables.low_stock_products || []).map((item: any) => ({
        ...item,
        status: translateLowStockStatus(item.status),
        statusType: normalizeLowStockStatusType(item.status),
      })) || [],
  };
}, [analyticsData, activeTab, isStartTariff]);

const suppliersData = useMemo(() => {
  if (!analyticsData || activeTab !== "suppliers") {
    return {
      kpis: [
        {
          title: "Поставщиков",
          value: "0",
          icon: Users,
          color: "#f7d617",
        },
        {
          title: "Стоимость остатков",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Продано за период",
          value: "0",
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          title: "Выручка за период",
          value: "0",
          currency: "сом",
          icon: TrendingUp,
          color: "#f7d617",
        },
      ],
      suppliers: [],
      suppliersByStock: [],
    };
  }

  const cards = analyticsData.cards || {};
  const tables = analyticsData.tables || {};

  const normalizeSupplierRow = (row: any) => ({
    supplier_id: row?.supplier_id || row?.id || "",
    name: row?.name || "—",
    phone: row?.phone || "—",
    products_count: row?.products_count || 0,
    stock_qty: row?.stock_qty || 0,
    stock_value: row?.stock_value || 0,
    period_qty_sold: row?.period_qty_sold || 0,
    period_revenue: row?.period_revenue || 0,
    period_transactions: row?.period_transactions || 0,
    rank_by_qty: row?.rank_by_qty || "—",
    rank_by_stock: row?.rank_by_stock || "—",
    rating: row?.rating || 0,
  });

  return {
    kpis: [
      {
        title: "Поставщиков",
        value: formatNumber(cards.suppliers_count || 0),
        icon: Users,
        color: "#f7d617",
      },
      {
        title: "Стоимость остатков",
        value: formatNumber(cards.total_stock_value || 0),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Продано за период",
        value: formatAnalyticsQty(cards.total_period_qty_sold || 0),
        icon: ShoppingCart,
        color: "#f7d617",
      },
      {
        title: "Выручка за период",
        value: formatNumber(cards.total_period_revenue || 0),
        currency: "сом",
        icon: TrendingUp,
        color: "#f7d617",
      },
    ],
    suppliers: (tables.suppliers || []).map(normalizeSupplierRow),
    suppliersByStock: (tables.suppliers_by_stock || []).map(
      normalizeSupplierRow,
    ),
  };
}, [analyticsData, activeTab]);

const purchasesData = useMemo(() => {
  if (!analyticsData || activeTab !== "purchases") {
    return {
      kpis: [
        {
          title: "SKU в закупках",
          value: "0",
          icon: Package,
          color: "#f7d617",
        },
        {
          title: "Ед. закуплено",
          value: "0",
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          title: "Сумма закупок",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
      ],
      bySupplier: [],
    };
  }

  const cards = analyticsData.cards || {};
  const tables = analyticsData.tables || {};

  return {
    kpis: [
      {
        title: "SKU в закупках",
        value: formatNumber(cards.purchased_sku_count || 0),
        icon: Package,
        color: "#f7d617",
      },
      {
        title: "Ед. закуплено",
        value: formatAnalyticsQty(cards.purchased_units || 0),
        icon: ShoppingCart,
        color: "#f7d617",
      },
      {
        title: "Сумма закупок",
        value: formatNumber(cards.purchased_value || 0),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
    ],
    bySupplier: tables.by_supplier || [],
  };
}, [analyticsData, activeTab]);

// Данные для вкладки "Сотрудники"
const usersData = useMemo(() => {
  if (!analyticsData || activeTab !== "users") {
    return {
      kpis: [
        {
          title: "Всего смен",
          value: "0",
          icon: Calendar,
          color: "#f7d617",
        },
        {
          title: "Закрытых смен",
          value: "0",
          icon: Calendar,
          color: "#f7d617",
        },
        {
          title: "Открытых смен",
          value: "0",
          icon: Calendar,
          color: "#f7d617",
        },
        {
          title: "Расхождений в кассах",
          value: "0",
          icon: HelpCircle,
          color: "#f7d617",
        },
      ],
      usersPerformance: [],
      shiftDiscrepancies: [],
    };
  }

  const cards = analyticsData.cards || {};
  const tables = analyticsData.tables || {};

  return {
    kpis: [
      {
        title: "Всего смен",
        value: formatNumber(cards.total || 0),
        icon: Calendar,
        color: "#f7d617",
      },
      {
        title: "Закрытых смен",
        value: formatNumber(cards.closed || 0),
        icon: Calendar,
        color: "#f7d617",
      },
      {
        title: "Открытых смен",
        value: formatNumber(cards.open || 0),
        icon: Calendar,
        color: "#f7d617",
      },
      {
        title: "Расхождений в кассах",
        value: formatNumber(cards.discrepancies_count || 0),
        icon: HelpCircle,
        color: "#f7d617",
      },
    ],
    usersPerformance: tables.users_performance || [],
    shiftDiscrepancies: tables.shift_discrepancies || [],
  };
}, [analyticsData, activeTab]);

// Данные для вкладки "Финансы"
const financeData = useMemo(() => {
  if (!analyticsData || activeTab !== "finance") {
    return {
      kpis: [
        {
          title: "Доходы",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Расходы",
          value: "0",
          currency: "сом",
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          title: "Чистый поток",
          value: "0",
          currency: "сом",
          icon: TrendingUp,
          color: "#f7d617",
        },
        {
          title: "Операций",
          value: "0",
          icon: BarChart3,
          color: "#f7d617",
        },
      ],
      expenseBreakdown: [],
      incomeBreakdown: [],
      expenseItems: [],
      incomeItems: [],
      salaryRows: [],
    };
  }

  const cards = analyticsData.cards || {};
  const tables = analyticsData.tables || {};

  return {
    kpis: [
      {
        title: "Доходы",
        value: formatNumber(cards.income_total || "0"),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Расходы",
        value: formatNumber(cards.expense_total || "0"),
        currency: "сом",
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        title: "Чистый поток",
        value: formatNumber(cards.net_flow || "0"),
        currency: "сом",
        icon: TrendingUp,
        color: "#f7d617",
      },
      {
        title: "Операций",
        value: formatNumber(
          (cards.income_count || 0) + (cards.expense_count || 0),
        ),
        icon: BarChart3,
        color: "#f7d617",
      },
    ],
    expenseBreakdown: tables.expense_breakdown || [],
    incomeBreakdown: tables.income_breakdown || [],
    expenseItems: tables.expense_items || [],
    incomeItems: tables.income_items || [],
    salaryRows: Array.isArray(salaryAnalyticsRows) ? salaryAnalyticsRows : [],
  };
}, [analyticsData, activeTab, salaryAnalyticsRows]);

  return {
    salesData,
    warehouseData,
    cashierData,
    shiftsData,
    productsData,
    suppliersData,
    purchasesData,
    usersData,
    financeData,
  };
}
