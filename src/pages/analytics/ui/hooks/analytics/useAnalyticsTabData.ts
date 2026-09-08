import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  normalizeLowStockStatusType,
  normalizeExpiryStatusType,
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
} from "./formatters";

export function useAnalyticsTabData({
  analyticsData,
  activeTab,
  isStartTariff,
  stockSort,
  salaryAnalyticsRows,
}: any) {
  const { t } = useTranslation();
  const som = t("common.currencySom");

  const translateLowStock = (status: string) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();
    if (normalized === "critical") {
      return t("crm.analytics.warehouse.statusCritical");
    }
    if (normalized === "low") {
      return t("crm.analytics.warehouse.statusLow");
    }
    return (
      String(status || t("crm.analytics.warehouse.statusLow")).trim() ||
      t("crm.analytics.warehouse.statusLow")
    );
  };

  const translateExpiryStatus = (status: string) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();
    if (["expired", "просрочен"].includes(normalized)) {
      return t("crm.analytics.products.statusExpired");
    }
    if (["critical", "истекает"].includes(normalized)) {
      return t("crm.analytics.products.statusExpiringSoon");
    }
    return String(status || t("crm.analytics.products.statusExpiringSoon")).trim();
  };

  const salesPaymentLabels = useMemo(
    () => ({
      cash: t("crm.analytics.sales.cash"),
      card: t("crm.analytics.sales.card"),
      transfer: t("crm.analytics.sales.transfer"),
    }),
    [t],
  );

  const cashierPaymentLabels = useMemo(
    () => ({
      cash: t("crm.analytics.sales.cash"),
      transfer: t("crm.analytics.cashiers.transfer"),
      card: t("crm.analytics.cashiers.card"),
      debt: t("crm.analytics.cashiers.debt"),
      deferred: t("crm.analytics.cashiers.deferred"),
    }),
    [t],
  );

  const weekdayLabels = useMemo(
    () => [
      t("crm.analytics.weekdays.sun"),
      t("crm.analytics.weekdays.mon"),
      t("crm.analytics.weekdays.tue"),
      t("crm.analytics.weekdays.wed"),
      t("crm.analytics.weekdays.thu"),
      t("crm.analytics.weekdays.fri"),
      t("crm.analytics.weekdays.sat"),
    ],
    [t],
  );

  const salesData = useMemo(() => {
    const filterSalesKpis = (kpis: any) =>
      isStartTariff
        ? kpis.filter(
            (kpi: any) => !START_HIDDEN_SALES_KPI_TITLES.has(kpi.titleKey),
          )
        : kpis;

    if (!analyticsData || activeTab !== "sales") {
      return {
        kpis: filterSalesKpis([
          {
            titleKey: "crm.analytics.sales.revenue",
            title: t("crm.analytics.sales.revenue"),
            value: "0",
            currency: som,
            icon: DollarSign,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.sales.transactions",
            title: t("crm.analytics.sales.transactions"),
            value: "0",
            icon: ShoppingCart,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.sales.avgCheck",
            title: t("crm.analytics.sales.avgCheck"),
            value: "0",
            currency: som,
            icon: BarChart3,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.sales.clients",
            title: t("crm.analytics.sales.clients"),
            value: "0",
            icon: Users,
            color: "#f7d617",
          },
        ]),
        salesChart: { labels: [], data: [] },
        topProducts: [],
        documents: [],
        paymentMethods: { labels: [], data: [] },
      };
    }

    const cards = analyticsData.cards || {};
    const charts = analyticsData.charts || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: filterSalesKpis([
        {
          titleKey: "crm.analytics.sales.revenue",
          title: t("crm.analytics.sales.revenue"),
          value: formatNumber(cards.revenue || "0"),
          raw: Number(cards.revenue || 0),
          currency: som,
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.sales.transactions",
          title: t("crm.analytics.sales.transactions"),
          value: formatNumber(cards.transactions || 0),
          raw: Number(cards.transactions || 0),
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.sales.avgCheck",
          title: t("crm.analytics.sales.avgCheck"),
          value: formatNumber(cards.avg_check || "0"),
          raw: Number(cards.avg_check || 0),
          currency: som,
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.sales.clients",
          title: t("crm.analytics.sales.clients"),
          value: formatNumber(cards.clients || 0),
          raw: Number(cards.clients || 0),
          icon: Users,
          color: "#f7d617",
        },
      ]),
      salesChart: {
        labels:
          charts.sales_dynamics?.map((item: any) =>
            formatDateForChart(item.date),
          ) || [],
        data:
          charts.sales_dynamics?.map((item: any) =>
            parseFloat(item.value || 0),
          ) || [],
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
            (item: any) =>
              salesPaymentLabels[
                item.method as keyof typeof salesPaymentLabels
              ] || item.method,
          ) || [],
        data:
          charts.payment_methods?.map((item: any) =>
            parseFloat(item.total || item.count || 0),
          ) || [],
      },
    };
  }, [analyticsData, activeTab, isStartTariff, t, som, salesPaymentLabels]);

  const warehouseData = useMemo(() => {
    if (!analyticsData || activeTab !== "warehouse") {
      return {
        kpis: [
          {
            titleKey: "crm.analytics.warehouse.totalProducts",
            title: t("crm.analytics.warehouse.totalProducts"),
            value: "0",
            subtitle: t("crm.analytics.warehouse.inCategories", { count: 0 }),
            icon: Package,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.warehouse.warehouseValue",
            title: t("crm.analytics.warehouse.warehouseValue"),
            value: "0",
            currency: som,
            icon: DollarSign,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.warehouse.runningOut",
            title: t("crm.analytics.warehouse.runningOut"),
            value: "0",
            subtitle: t("crm.analytics.warehouse.needReorder"),
            icon: TrendingUp,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.warehouse.turnover",
            title: t("crm.analytics.warehouse.turnover"),
            value: t("crm.analytics.warehouse.daysShort", { count: 0 }),
            icon: BarChart3,
            color: "#f7d617",
          },
        ],
        categoryChart: { labels: [], data: [], colors: [] },
        movementChart: { labels: [], data: [] },
        lowStock: [],
      };
    }

    const cards = analyticsData.cards || {};
    const charts = analyticsData.charts || {};
    const tables = analyticsData.tables || {};
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
          titleKey: "crm.analytics.warehouse.totalProducts",
          title: t("crm.analytics.warehouse.totalProducts"),
          value: formatNumber(cards.total_products || 0),
          subtitle: t("crm.analytics.warehouse.inCategories", {
            count: cards.categories_count || cards.categories || 0,
          }),
          icon: Package,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.warehouse.warehouseValue",
          title: t("crm.analytics.warehouse.warehouseValue"),
          value: formatNumber(cards.inventory_value || "0"),
          currency: som,
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.warehouse.totalStock",
          title: t("crm.analytics.warehouse.totalStock"),
          value: formatAnalyticsQty(
            cards.total_stock_quantity ?? cards.total_units ?? 0,
          ),
          subtitle: t("crm.analytics.warehouse.totalQtySubtitle"),
          icon: TrendingUp,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.warehouse.zeroQtyProducts",
          title: t("crm.analytics.warehouse.zeroQtyProducts"),
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
          status: translateLowStock(item.status),
          statusType: normalizeLowStockStatusType(item.status),
        })) || [],
    };
  }, [analyticsData, activeTab, t, som]);

  const cashierData = useMemo(() => {
    if (!analyticsData || activeTab !== "cashiers") {
      return {
        kpis: [
          {
            titleKey: "crm.analytics.cashiers.dailyRevenue",
            title: t("crm.analytics.cashiers.dailyRevenue"),
            value: "0",
            currency: som,
            icon: DollarSign,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.cashiers.transactions",
            title: t("crm.analytics.cashiers.transactions"),
            value: "0",
            icon: ShoppingCart,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.cashiers.avgCheck",
            title: t("crm.analytics.cashiers.avgCheck"),
            value: "0",
            currency: som,
            icon: BarChart3,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.cashiers.cashInRegister",
            title: t("crm.analytics.cashiers.cashInRegister"),
            value: "0",
            currency: som,
            subtitle: t("crm.analytics.cashiers.cashShareOfRevenue", {
              percent: 0,
            }),
            icon: DollarSign,
            color: "#f7d617",
          },
        ],
        hourlyChart: { labels: [], data: [] },
        paymentMethods: { labels: [], data: [], colors: [] },
        weeklyTransactions: { labels: [], data: [] },
        paymentDetails: [],
        peakHours: [],
      };
    }

    const cards = analyticsData.cards || {};
    const charts = analyticsData.charts || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: [
        {
          titleKey: "crm.analytics.cashiers.dailyRevenue",
          title: t("crm.analytics.cashiers.dailyRevenue"),
          value: formatNumber(cards.revenue || "0"),
          currency: som,
          icon: DollarSign,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.cashiers.transactions",
          title: t("crm.analytics.cashiers.transactions"),
          value: formatNumber(cards.transactions || 0),
          icon: ShoppingCart,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.cashiers.avgCheck",
          title: t("crm.analytics.cashiers.avgCheck"),
          value: formatNumber(cards.avg_check || "0"),
          currency: som,
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.cashiers.cashInRegister",
          title: t("crm.analytics.cashiers.cashInRegister"),
          value: formatNumber(cards.cash_in_box || "0"),
          currency: som,
          subtitle: t("crm.analytics.cashiers.cashShareOfRevenue", {
            percent: cards.cash_share_percent || 0,
          }),
          icon: DollarSign,
          color: "#f7d617",
        },
      ],
      hourlyChart: {
        labels:
          charts.sales_by_hours
            ?.sort((a: any, b: any) => (a.hour || 0) - (b.hour || 0))
            .map(
              (item: any) =>
                `${String(item.hour || 0).padStart(2, "0")}:00`,
            ) || [],
        data:
          charts.sales_by_hours
            ?.sort((a: any, b: any) => (a.hour || 0) - (b.hour || 0))
            .map((item: any) => parseFloat(item.revenue || 0)) || [],
      },
      paymentMethods: {
        labels:
          charts.payment_methods?.map(
            (item: any) =>
              cashierPaymentLabels[
                item.name as keyof typeof cashierPaymentLabels
              ] || item.name,
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
          method:
            cashierPaymentLabels[
              item.method as keyof typeof cashierPaymentLabels
            ] || item.method,
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
  }, [analyticsData, activeTab, t, som, cashierPaymentLabels, weekdayLabels]);

  const shiftsData = useMemo(() => {
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

    if (!analyticsData || activeTab !== "shifts") {
      return {
        kpis: [
          {
            titleKey: "crm.analytics.shifts.activeShifts",
            title: t("crm.analytics.shifts.activeShifts"),
            value: "0",
            subtitle: t("crm.analytics.shifts.currently"),
            icon: Calendar,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.shifts.shiftsToday",
            title: t("crm.analytics.shifts.shiftsToday"),
            value: "0",
            subtitle: t("crm.analytics.shifts.totalOpened"),
            icon: Calendar,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.shifts.avgDuration",
            title: t("crm.analytics.shifts.avgDuration"),
            value: t("crm.analytics.shifts.hoursShort", { count: 0 }),
            subtitle: t("crm.analytics.shifts.onShift"),
            icon: BarChart3,
            color: "#f7d617",
          },
          {
            titleKey: "crm.analytics.shifts.avgIncome",
            title: t("crm.analytics.shifts.avgIncome"),
            value: "0",
            currency: som,
            subtitle: t("crm.analytics.shifts.perShift"),
            icon: DollarSign,
            color: "#f7d617",
          },
        ],
        shiftsChart: { labels: [], data: [] },
        activeShifts: [],
        bestCashiers: [],
      };
    }

    const cards = analyticsData.cards || {};
    const charts = analyticsData.charts || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: [
        {
          titleKey: "crm.analytics.shifts.activeShifts",
          title: t("crm.analytics.shifts.activeShifts"),
          value: formatNumber(cards.active_shifts || 0),
          subtitle: t("crm.analytics.shifts.currently"),
          icon: Calendar,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.shifts.shiftsToday",
          title: t("crm.analytics.shifts.shiftsToday"),
          value: formatNumber(cards.shifts_today || 0),
          subtitle: t("crm.analytics.shifts.totalOpened"),
          icon: Calendar,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.shifts.avgDuration",
          title: t("crm.analytics.shifts.avgDuration"),
          value: t("crm.analytics.shifts.hoursShort", {
            count: formatNumber(cards.avg_duration_hours || 0),
          }),
          subtitle: t("crm.analytics.shifts.onShift"),
          icon: BarChart3,
          color: "#f7d617",
        },
        {
          titleKey: "crm.analytics.shifts.avgIncome",
          title: t("crm.analytics.shifts.avgIncome"),
          value: formatNumber(cards.avg_revenue_per_shift || "0"),
          currency: som,
          subtitle: t("crm.analytics.shifts.perShift"),
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
          status:
            shift.status === "open"
              ? t("crm.analytics.shifts.statusActive")
              : t("crm.analytics.shifts.statusClosed"),
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
  }, [analyticsData, activeTab, t, som]);

  const productsData = useMemo(() => {
    const filterProductsKpis = (kpis: any) =>
      isStartTariff
        ? kpis.filter(
            (kpi: any) =>
              !START_HIDDEN_PRODUCTS_KPI_TITLES.has(kpi.titleKey),
          )
        : kpis;

    const baseKpis = [
      {
        titleKey: "crm.analytics.products.totalQty",
        title: t("crm.analytics.products.totalQty"),
        value: "0",
        icon: Package,
        color: "#f7d617",
        subtitle: t("crm.analytics.products.inCatalog"),
      },
      {
        titleKey: "crm.analytics.products.stockValue",
        title: t("crm.analytics.products.stockValue"),
        value: "0",
        currency: som,
        icon: DollarSign,
        color: "#f7d617",
      },
      {
        titleKey: "crm.analytics.products.lowStock",
        title: t("crm.analytics.products.lowStock"),
        value: "0",
        icon: Package,
        color: "#f7d617",
        anchorKey: "lowStockProducts",
      },
      {
        titleKey: "crm.analytics.products.expiringProducts",
        title: t("crm.analytics.products.expiringProducts"),
        value: "0",
        icon: Calendar,
        color: "#f7d617",
        anchorKey: "expiringProducts",
      },
      {
        titleKey: "crm.analytics.products.rejected",
        title: t("crm.analytics.products.rejected"),
        value: "0",
        icon: X,
        color: "#f7d617",
        subtitle: "rejected_products_count",
      },
      {
        titleKey: "crm.analytics.products.salesWithoutProduct",
        title: t("crm.analytics.products.salesWithoutProduct"),
        value: "0",
        icon: HelpCircle,
        color: "#f7d617",
        subtitle: "sales_lines_missing_product_count",
      },
    ];

    if (!analyticsData || activeTab !== "products") {
      return {
        kpis: filterProductsKpis(baseKpis),
        topByRevenue: [],
        topByQuantity: [],
        categories: [],
        brands: [],
        lowStockProducts: [],
        expiringProducts: [],
      };
    }

    const cards = analyticsData.cards || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: filterProductsKpis([
        {
          ...baseKpis[0],
          value: formatNumber(cards.catalog_products_count || 0),
        },
        {
          ...baseKpis[1],
          value: formatNumber(cards.stock_value || "0"),
        },
        {
          ...baseKpis[2],
          value: formatNumber(cards.low_stock_count || 0),
        },
        {
          ...baseKpis[3],
          value: formatNumber(
            cards.expiring_products_count ?? cards.expiring_soon_count ?? 0,
          ),
        },
        {
          ...baseKpis[4],
          value: formatNumber(cards.rejected_products_count || 0),
        },
        {
          ...baseKpis[5],
          value: formatNumber(cards.sales_lines_missing_product_count || 0),
        },
      ]),
      topByRevenue: tables.top_by_revenue || [],
      topByQuantity: tables.top_by_quantity || [],
      categories: tables.categories || [],
      brands: tables.brands || [],
      lowStockProducts:
        (tables.low_stock_products || []).map((item: any) => ({
          ...item,
          status: translateLowStock(item.status),
          statusType: normalizeLowStockStatusType(item.status),
        })) || [],
      expiringProducts:
        (tables.expiring_products || []).map((item: any) => ({
          ...item,
          status: translateExpiryStatus(item.status),
          statusType: normalizeExpiryStatusType(item.status),
        })) || [],
    };
  }, [analyticsData, activeTab, isStartTariff, t, som]);

  const suppliersData = useMemo(() => {
    const kpiDefs = [
      {
        titleKey: "crm.analytics.suppliers.count",
        title: t("crm.analytics.suppliers.count"),
        icon: Users,
      },
      {
        titleKey: "crm.analytics.suppliers.stockValue",
        title: t("crm.analytics.suppliers.stockValue"),
        currency: som,
        icon: DollarSign,
      },
      {
        titleKey: "crm.analytics.suppliers.soldInPeriod",
        title: t("crm.analytics.suppliers.soldInPeriod"),
        icon: ShoppingCart,
      },
      {
        titleKey: "crm.analytics.suppliers.revenueInPeriod",
        title: t("crm.analytics.suppliers.revenueInPeriod"),
        currency: som,
        icon: TrendingUp,
      },
    ];

    if (!analyticsData || activeTab !== "suppliers") {
      return {
        kpis: kpiDefs.map((kpi) => ({ ...kpi, value: "0", color: "#f7d617" })),
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
          ...kpiDefs[0],
          value: formatNumber(cards.suppliers_count || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[1],
          value: formatNumber(cards.total_stock_value || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[2],
          value: formatAnalyticsQty(cards.total_period_qty_sold || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[3],
          value: formatNumber(cards.total_period_revenue || 0),
          color: "#f7d617",
        },
      ],
      suppliers: (tables.suppliers || []).map(normalizeSupplierRow),
      suppliersByStock: (tables.suppliers_by_stock || []).map(
        normalizeSupplierRow,
      ),
    };
  }, [analyticsData, activeTab, t, som]);

  const purchasesData = useMemo(() => {
    const kpiDefs = [
      {
        titleKey: "crm.analytics.purchases.skuInPurchases",
        title: t("crm.analytics.purchases.skuInPurchases"),
        icon: Package,
      },
      {
        titleKey: "crm.analytics.purchases.unitsPurchased",
        title: t("crm.analytics.purchases.unitsPurchased"),
        icon: ShoppingCart,
      },
      {
        titleKey: "crm.analytics.purchases.purchaseAmount",
        title: t("crm.analytics.purchases.purchaseAmount"),
        currency: som,
        icon: DollarSign,
      },
    ];

    if (!analyticsData || activeTab !== "purchases") {
      return {
        kpis: kpiDefs.map((kpi) => ({ ...kpi, value: "0", color: "#f7d617" })),
        bySupplier: [],
      };
    }

    const cards = analyticsData.cards || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: [
        {
          ...kpiDefs[0],
          value: formatNumber(cards.purchased_sku_count || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[1],
          value: formatAnalyticsQty(cards.purchased_units || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[2],
          value: formatNumber(cards.purchased_value || 0),
          color: "#f7d617",
        },
      ],
      bySupplier: tables.by_supplier || [],
    };
  }, [analyticsData, activeTab, t, som]);

  const usersData = useMemo(() => {
    const kpiDefs = [
      {
        titleKey: "crm.analytics.employees.totalShifts",
        title: t("crm.analytics.employees.totalShifts"),
        icon: Calendar,
      },
      {
        titleKey: "crm.analytics.employees.closedShifts",
        title: t("crm.analytics.employees.closedShifts"),
        icon: Calendar,
      },
      {
        titleKey: "crm.analytics.employees.openShifts",
        title: t("crm.analytics.employees.openShifts"),
        icon: Calendar,
      },
      {
        titleKey: "crm.analytics.employees.cashDiscrepancies",
        title: t("crm.analytics.employees.cashDiscrepancies"),
        icon: HelpCircle,
      },
    ];

    if (!analyticsData || activeTab !== "users") {
      return {
        kpis: kpiDefs.map((kpi) => ({ ...kpi, value: "0", color: "#f7d617" })),
        usersPerformance: [],
        shiftDiscrepancies: [],
      };
    }

    const cards = analyticsData.cards || {};
    const tables = analyticsData.tables || {};

    return {
      kpis: [
        {
          ...kpiDefs[0],
          value: formatNumber(cards.total || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[1],
          value: formatNumber(cards.closed || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[2],
          value: formatNumber(cards.open || 0),
          color: "#f7d617",
        },
        {
          ...kpiDefs[3],
          value: formatNumber(cards.discrepancies_count || 0),
          color: "#f7d617",
        },
      ],
      usersPerformance: tables.users_performance || [],
      shiftDiscrepancies: tables.shift_discrepancies || [],
    };
  }, [analyticsData, activeTab, t]);

  const isOtherCategory = (value: unknown) =>
    ["прочее", "прочие расходы", "other"].includes(
      String(value || "").trim().toLowerCase(),
    );

  const itemCategory = (item: any) =>
    item?.category ??
    item?.business_operation ??
    item?.business_operation_name ??
    item?.source_business_operation_id ??
    item?.article ??
    item?.name;

  const financeData = useMemo(() => {
    const kpiDefs = [
      {
        titleKey: "crm.analytics.finance.income",
        title: t("crm.analytics.finance.income"),
        currency: som,
        icon: DollarSign,
      },
      {
        titleKey: "crm.analytics.finance.expense",
        title: t("crm.analytics.finance.expense"),
        currency: som,
        icon: DollarSign,
      },
      {
        titleKey: "crm.analytics.finance.otherExpenses",
        title: t("crm.analytics.finance.otherExpenses"),
        currency: som,
        icon: HelpCircle,
        anchorKey: "otherExpenseItems",
      },
      {
        titleKey: "crm.analytics.finance.netFlow",
        title: t("crm.analytics.finance.netFlow"),
        currency: som,
        icon: TrendingUp,
      },
      {
        titleKey: "crm.analytics.finance.operations",
        title: t("crm.analytics.finance.operations"),
        icon: BarChart3,
      },
    ];

    if (!analyticsData || activeTab !== "finance") {
      return {
        kpis: kpiDefs.map((kpi) => ({ ...kpi, value: "0", color: "#f7d617" })),
        expenseBreakdown: [],
        incomeBreakdown: [],
        expenseItems: [],
        incomeItems: [],
        otherExpenseItems: [],
        salaryRows: [],
      };
    }

    const cards = analyticsData.cards || {};
    const tables = analyticsData.tables || {};

    const expenseItems = tables.expense_items || [];
    const otherExpenseItems = expenseItems.filter((item: any) =>
      isOtherCategory(itemCategory(item)),
    );
    const otherExpenseBreakdownRow = (tables.expense_breakdown || []).find(
      (row: any) => isOtherCategory(row?.name),
    );
    const otherExpenseTotal =
      cards.other_expense_total ??
      otherExpenseBreakdownRow?.total ??
      otherExpenseItems.reduce(
        (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
        0,
      );

    return {
      kpis: [
        {
          ...kpiDefs[0],
          value: formatNumber(cards.income_total || "0"),
          color: "#f7d617",
        },
        {
          ...kpiDefs[1],
          value: formatNumber(cards.expense_total || "0"),
          color: "#f7d617",
        },
        {
          ...kpiDefs[2],
          value: formatNumber(otherExpenseTotal || "0"),
          color: "#f7d617",
        },
        {
          ...kpiDefs[3],
          value: formatNumber(cards.net_flow || "0"),
          color: "#f7d617",
        },
        {
          ...kpiDefs[4],
          value: formatNumber(
            (cards.income_count || 0) + (cards.expense_count || 0),
          ),
          color: "#f7d617",
        },
      ],
      expenseBreakdown: tables.expense_breakdown || [],
      incomeBreakdown: tables.income_breakdown || [],
      expenseItems,
      incomeItems: tables.income_items || [],
      otherExpenseItems,
      salaryRows: Array.isArray(salaryAnalyticsRows) ? salaryAnalyticsRows : [],
    };
  }, [analyticsData, activeTab, salaryAnalyticsRows, t, som]);

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
    barPercentOfMax,
    sortStockList,
  };
}
