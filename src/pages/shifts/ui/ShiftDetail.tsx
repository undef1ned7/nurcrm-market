import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Wallet,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronDown,
  FileText,
  Banknote,
  CreditCard,
  AlertCircle,
  Store,
  User,
  Receipt,
  Package,
} from "lucide-react";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import api from "@shared/api";
import {
  fetchShiftByIdAsync,
  fetchShiftSalesAsync,
  resolveShiftPaymentBreakdown,
  ShiftPaymentBreakdown,
  CashboxWarningBanner,
} from "@entities/shift";
import {
  PageShell,
  PageHeader,
  PagePanel,
  StatGrid,
  StatCard,
  StatusChip,
  EmptyState,
  LoadingState,
  FilterBar,
} from "@shared/ui/page-shell";
import "./ShiftDetail.scss";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";

// Бэк теперь поддерживает page_size до 500 (раньше был жёстко зафиксирован
// на 100) — берём смену почти всегда одним запросом, без ручной пагинации.
const SHIFT_SALES_PAGE_SIZE = 500;

const ShiftDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;
  const { currentShift, loading } = useSelector((state: any) => state.shifts);
  const [activeTab, setActiveTab] = useState("products");
  const [alertModal, setAlertModal] = useState<any>({
    open: false,
    type: "error",
    title: "",
    message: "",
    onConfirm: null,
  });
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<any>(null);
  // Раскрытая продажа (позиции чека) в списке «Движение товаров».
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [saleItemsById, setSaleItemsById] = useState<
    Record<string, { loading: boolean; error: string | null; items: any[] }>
  >({});
  const [moneyMovements, setMoneyMovements] = useState<any[]>([]);
  const [moneyLoading, setMoneyLoading] = useState(false);
  const [moneyError, setMoneyError] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "",
    payment_method: "",
    q: "",
    cashier: "",
  });
  const [moneyFilters, setMoneyFilters] = useState({
    status: "",
    payment_method: "",
    q: "",
    cashier: "",
  });

  const shift = currentShift;
  const paymentBreakdown = resolveShiftPaymentBreakdown(
    shift,
    filters.status || filters.payment_method || filters.q || filters.cashier
      ? []
      : salesHistory,
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchShiftByIdAsync(id));
    }
  }, [id, dispatch]);

  // Загрузка истории продаж
  useEffect(() => {
    const loadSalesHistory = async () => {
      if (!id) return;

      setSalesLoading(true);
      setSalesError(null);
      setExpandedSaleId(null);
      setSaleItemsById({});

      try {
        const searchParams: any = {};

        if (filters.status) {
          searchParams.status = filters.status;
        }

        if (filters.payment_method) {
          searchParams.payment_method = filters.payment_method;
        }

        if (filters.q) {
          searchParams.q = filters.q;
        }

        if (filters.cashier) {
          searchParams.cashier = filters.cashier;
        }

        searchParams.page_size = SHIFT_SALES_PAGE_SIZE;

        const result = await dispatch(
          fetchShiftSalesAsync({
            shiftId: id,
            params: searchParams,
          }),
        ).unwrap();
        setSalesHistory(result?.results || []);
      } catch (error: any) {
        console.error("Ошибка при загрузке истории продаж:", error);
        setSalesError(t("crm.shifts.detail.salesLoadError"));
        setSalesHistory([]);
      } finally {
        setSalesLoading(false);
      }
    };

    // Debounce для поиска
    const timeoutId = setTimeout(
      () => {
        loadSalesHistory();
      },
      filters.q ? 500 : 0,
    );

    return () => clearTimeout(timeoutId);
  }, [
    id,
    dispatch,
    filters.status,
    filters.payment_method,
    filters.q,
    filters.cashier,
  ]);

  // Загрузка движения денег
  useEffect(() => {
    const loadMoneyMovements = async () => {
      if (!id) return;

      setMoneyLoading(true);
      setMoneyError(null);

      try {
        const searchParams: any = {};

        if (moneyFilters.status) {
          searchParams.status = moneyFilters.status;
        }

        if (moneyFilters.payment_method) {
          searchParams.payment_method = moneyFilters.payment_method;
        }

        if (moneyFilters.q) {
          searchParams.q = moneyFilters.q;
        }

        if (moneyFilters.cashier) {
          searchParams.cashier = moneyFilters.cashier;
        }

        searchParams.page_size = SHIFT_SALES_PAGE_SIZE;

        const result = await dispatch(
          fetchShiftSalesAsync({
            shiftId: id,
            params: searchParams,
          }),
        ).unwrap();

        // Преобразуем продажи в движение денег
        const movements = (result?.results || []).map((sale) => ({
          id: sale.id,
          type: "income",
          date: sale.created_at || sale.paid_at,
          counterparty: sale.client_name || "—",
          account: shift?.cashbox_name || t("crm.kassa.pageTitle"),
          tag: t("crm.shifts.detail.clientPayment"),
          amount: parseFloat(sale.total || 0),
          payment_method: sale.payment_method || "—",
          cashier: sale.cashier_display || "—",
        }));

        setMoneyMovements(movements);
      } catch (error: any) {
        console.error("Ошибка при загрузке движения денег:", error);
        const errorMessage = validateResErrors(
          error,
          t("crm.shifts.detail.moneyLoadError"),
        );
        setMoneyError(errorMessage);
        setMoneyMovements([]);
      } finally {
        setMoneyLoading(false);
      }
    };

    // Debounce для поиска
    const timeoutId = setTimeout(
      () => {
        loadMoneyMovements();
      },
      moneyFilters.q ? 500 : 0,
    );

    return () => clearTimeout(timeoutId);
  }, [
    id,
    dispatch,
    moneyFilters.status,
    moneyFilters.payment_method,
    moneyFilters.q,
    moneyFilters.cashier,
    shift?.cashbox_name,
  ]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString("ru-RU", { month: "long" });
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const handleConfirm = () => {
    if (alertModal.onConfirm) {
      alertModal.onConfirm();
    }
    closeAlert();
  };

  /**
   * Разворачивает/сворачивает позиции чека под строкой продажи. Список
   * продаж смены (`.../shifts/{id}/sales/`) отдаёт позиции не всегда — если
   * они уже пришли в самой продаже, используем их, иначе догружаем детально
   * по `GET /main/pos/sales/{id}/` (тот же контракт, что и превью чека).
   * См. docs/backend/kassa/shift-sale-positions-backend.md.
   */
  const toggleSaleExpand = async (movement: {
    id: string;
    items: any[] | null;
  }) => {
    const saleId = movement.id;
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      return;
    }
    setExpandedSaleId(saleId);
    if (saleItemsById[saleId]) return;

    if (Array.isArray(movement.items) && movement.items.length > 0) {
      setSaleItemsById((prev) => ({
        ...prev,
        [saleId]: {
          loading: false,
          error: null,
          items: movement.items as any[],
        },
      }));
      return;
    }

    setSaleItemsById((prev) => ({
      ...prev,
      [saleId]: { loading: true, error: null, items: [] },
    }));
    try {
      const { data } = await api.get(`/main/pos/sales/${saleId}/`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setSaleItemsById((prev) => ({
        ...prev,
        [saleId]: { loading: false, error: null, items },
      }));
    } catch (e: any) {
      const message = validateResErrors(
        e,
        t("crm.shifts.detail.positionsLoadError"),
      );
      setSaleItemsById((prev) => ({
        ...prev,
        [saleId]: { loading: false, error: message, items: [] },
      }));
    }
  };

  // Опции фильтра «Кассир» — из готовой разбивки бэка (id + display + итоги
  // по смене), а не из уже загруженной страницы продаж: так в списке виден
  // весь фактический состав кассиров смены независимо от текущих status/q.
  const cashierOptions: { id: string; display: string }[] = Array.isArray(
    shift?.cashier_breakdown,
  )
    ? shift.cashier_breakdown
        .filter((row: any) => row?.cashier_id)
        .map((row: any) => ({
          id: String(row.cashier_id),
          display: row.cashier_display || "—",
        }))
    : [];

  // Преобразование данных продаж для отображения. Фильтр по кассиру
  // применяется на бэке (`cashier=<id>` в searchParams выше), клиент больше
  // ничего не отсеивает.
  const productMovements = salesHistory.map((sale) => ({
    // У summary-ответа позиции обычно отсутствуют, но количество приходит
    // отдельным полем. Не показываем «0 позиций» до открытия чека.
    id: String(sale.id),
    docNumber: sale.doc_number,
    type: "sale",
    date: sale.created_at || sale.paid_at,
    store: sale.branch || shift?.branch || null,
    client: sale.client_name || null,
    cashier: sale.cashier_display || "—",
    status: sale.status || "paid",
    positions: Number(
      sale.items_count ??
        sale.itemsCount ??
        sale.item_count ??
        sale.itemCount ??
        sale.items?.length ??
        0,
    ),
    items: Array.isArray(sale.items) ? sale.items : null,
    amount: parseFloat(sale.total || 0),
  }));

  const productList = [
    { name: "Дрож кова 80г", quantity: 2.0, salesAmount: 70.0, profit: 70.0 },
    { name: "Кар туз", quantity: 1.0, salesAmount: 25.0, profit: 25.0 },
    { name: "Кок пияз", quantity: 1.0, salesAmount: 22.0, profit: 22.0 },
    {
      name: "Колбаса Тойбосс",
      quantity: 2.0,
      salesAmount: 940.0,
      profit: 940.0,
    },
    {
      name: 'Минеральная вода "Жалал-Абад 27 источник"',
      quantity: 2.0,
      salesAmount: 0.0,
      profit: 0.0,
    },
    {
      name: "Мойенез 10кг",
      quantity: 1.0,
      salesAmount: 1500.0,
      profit: 1500.0,
    },
    {
      name: "Огурцы SONUN 3л",
      quantity: 1.0,
      salesAmount: 290.0,
      profit: 290.0,
    },
  ];

  const shiftNumber =
    shift?.code ||
    (() => {
      const idStr = shift?.id?.toString() || "";
      const digitsOnly = idStr.replace(/\D/g, "");
      return digitsOnly.length >= 4
        ? digitsOnly.slice(-8)
        : idStr.replace(/-/g, "").slice(-8).toUpperCase();
    })() ||
    "—";

  if (loading) {
    return (
      <PageShell className="shift-detail-page">
        <PageHeader
          title={t("crm.shifts.detail.title")}
          subtitle={t("crm.shifts.detail.loadingSubtitle")}
        />
        <PagePanel flush>
          <LoadingState rows={6} />
        </PagePanel>
      </PageShell>
    );
  }

  if (!shift) {
    return (
      <PageShell className="shift-detail-page">
        <PageHeader
          title={t("crm.shifts.detail.title")}
          subtitle={t("crm.shifts.detail.subtitle")}
          actions={
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/shifts")}
            >
              {t("common.back")}
            </button>
          }
        />
        <EmptyState
          title={t("crm.shifts.detail.notFound")}
          text={t("crm.shifts.detail.notFoundHint")}
          action={
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => navigate("/crm/shifts")}
            >
              {t("crm.shifts.detail.backToList")}
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="shift-detail-page">
      <PageHeader
        title={t("crm.shifts.shiftTitle", { number: shiftNumber })}
        subtitle={t("crm.shifts.detail.headerSubtitle", {
          cashier: shift.cashier_display || "—",
        })}
        actions={
          <div className="shift-detail-page__header-actions">
            <StatusChip tone={shift.status === "open" ? "success" : "danger"}>
              {shift.status === "open" ? (
                <>
                  <CheckCircle size={16} />
                  <span>{t("crm.shifts.statusOpen")}</span>
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  <span>{t("crm.shifts.statusClosed")}</span>
                </>
              )}
            </StatusChip>
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={() => navigate("/crm/shifts")}
              aria-label={t("crm.shifts.detail.backToShifts")}
              title={t("common.back")}
            >
              <X size={18} />
              <span className="nur-btn__label">{t("common.back")}</span>
            </button>
          </div>
        }
      />

      <div className="shift-detail-page__dates">
        <span className="shift-detail-page__meta-line">
          <Calendar size={14} />
          {t("crm.shifts.detail.opened", { date: formatDate(shift.opened_at) })}
        </span>
        {shift.closed_at && (
          <span className="shift-detail-page__meta-line">
            <Calendar size={14} />
            {t("crm.shifts.detail.closed", {
              date: formatDate(shift.closed_at),
            })}
          </span>
        )}
      </div>

      <CashboxWarningBanner warning={shift.cashbox_warning} />

      <StatGrid className="shift-detail-page__metrics">
        <StatCard
          label={t("crm.shifts.revenue")}
          value={`${parseFloat(shift.sales_total || 0).toFixed(2)} ${t("common.currencySom")}`}
        />
        <StatCard
          label={t("crm.shifts.sales")}
          value={shift.sales_count || 0}
        />
        <StatCard
          label={t("crm.shifts.cashbox")}
          value={shift.cashbox_name || "—"}
        />
        <StatCard
          label={t("crm.shifts.detail.store")}
          value={shift.branch || "—"}
        />
      </StatGrid>

      <div className="shift-detail-page__details">
        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <TrendingUp
              size={20}
              className="shift-detail-page__icon--success"
            />
            <h3 className="shift-detail-page__detail-title">
              {t("crm.shifts.detail.revenueCard")}
            </h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.salesCount")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {shift.sales_count || 0}
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.salesTotal")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.sales_total || 0).toFixed(2)} сом
                </div>
              </div>
            </div>
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  <Banknote
                    size={14}
                    style={{ display: "inline", marginRight: "4px" }}
                  />
                  {t("crm.shifts.detail.cash")}
                </div>
                <div className="shift-detail-page__detail-value shift-detail-page__detail-value--green">
                  {parseFloat(shift.cash_sales_total || 0).toFixed(2)} сом
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  <CreditCard
                    size={14}
                    style={{ display: "inline", marginRight: "4px" }}
                  />
                  {t("crm.shifts.detail.noncash")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.noncash_sales_total || 0).toFixed(2)} сом
                </div>
              </div>
            </div>
            <div className="shift-detail-page__payments">
              <ShiftPaymentBreakdown rows={paymentBreakdown} />
            </div>
          </div>
        </div>

        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <RefreshCw size={20} className="shift-detail-page__icon--warning" />
            <h3 className="shift-detail-page__detail-title">
              {t("crm.shifts.detail.returns")}
            </h3>
          </div>
          <div className="shift-detail-page__detail-content">
            {/*
              Раньше все 4 значения были захардкожены нулями — карточка ни к
              чему не была привязана. Бэк пока не отдаёт returns_*-поля на
              объекте смены (см. docs/sale-flow-bugs.md, пункт 11 и
              docs/sale-flow-fixes/11-shift-returns-reporting.md) — поэтому
              `?? 0` сейчас фактически всегда даёт тот же ноль, но как только
              бэк добавит поля, карточка заработает без правок на фронте.
            */}
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.returnsCount")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {shift.returns_count ?? 0}
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.cashPlain")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.returns_cash || 0).toFixed(2)} сом
                </div>
              </div>
            </div>
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.returnsAmount")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.returns_total || 0).toFixed(2)} сом
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.noncash")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.returns_noncash || 0).toFixed(2)} сом
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <Wallet size={20} className="shift-detail-page__icon--info" />
            <h3 className="shift-detail-page__detail-title">
              {t("crm.shifts.detail.cashInRegister")}
            </h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.openingCash")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.opening_cash || 0).toFixed(2)} сом
                </div>
              </div>
              {shift.closed_at && shift.closing_cash !== null && (
                <div className="shift-detail-page__detail-item">
                  <div className="shift-detail-page__detail-label">
                    {t("crm.shifts.detail.actualAmount")}
                  </div>
                  <div className="shift-detail-page__detail-value">
                    {parseFloat(shift.closing_cash || 0).toFixed(2)} сом
                  </div>
                </div>
              )}
            </div>
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  {t("crm.shifts.detail.expectedAmount")}
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.expected_cash || 0).toFixed(2)} сом
                </div>
              </div>
              {shift.closed_at && shift.cash_diff !== null && (
                <div className="shift-detail-page__detail-item">
                  <div className="shift-detail-page__detail-label">
                    <AlertCircle
                      size={14}
                      style={{ display: "inline", marginRight: "4px" }}
                    />
                    {t("crm.shifts.detail.discrepancy")}
                  </div>
                  <div
                    className={`shift-detail-page__detail-value ${
                      parseFloat(shift.cash_diff || 0) === 0
                        ? "shift-detail-page__detail-value--green"
                        : parseFloat(shift.cash_diff || 0) > 0
                          ? "shift-detail-page__detail-value--green"
                          : "shift-detail-page__detail-value--red"
                    }`}
                  >
                    {parseFloat(shift.cash_diff || 0) === 0 ? (
                      <>
                        ✓ {Number(Math.abs(shift.cash_diff || 0)).toFixed(2)}{" "}
                        сом
                      </>
                    ) : parseFloat(shift.cash_diff || 0) > 0 ? (
                      <>+{parseFloat(shift.cash_diff || 0).toFixed(2)} сом</>
                    ) : (
                      <>{parseFloat(shift.cash_diff || 0).toFixed(2)} сом</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <TrendingUp
              size={20}
              className="shift-detail-page__icon--success"
            />
            <h3 className="shift-detail-page__detail-title">
              {t("crm.shifts.detail.incomeExpense")}
            </h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  <TrendingUp
                    size={14}
                    style={{ display: "inline", marginRight: "4px" }}
                  />
                  {t("crm.shifts.detail.otherIncome")}
                </div>
                <div className="shift-detail-page__detail-value shift-detail-page__detail-value--green">
                  {parseFloat(shift.income_total || 0).toFixed(2)} сом
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  <TrendingDown
                    size={14}
                    style={{ display: "inline", marginRight: "4px" }}
                  />
                  {t("crm.shifts.detail.expenses")}
                </div>
                <div className="shift-detail-page__detail-value shift-detail-page__detail-value--red">
                  {parseFloat(shift.expense_total || 0).toFixed(2)} сом
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shift-detail-page__total">
        <DollarSign size={24} />
        <span className="shift-detail-page__total-label">
          {t("crm.shifts.detail.totalRevenue")}
        </span>
        <span className="shift-detail-page__total-value">
          {parseFloat(shift.sales_total || 0).toFixed(2)} сом
        </span>
      </div>

      <PagePanel className="shift-detail-page__operations">
        <h2 className="shift-detail-page__operations-title">
          {t("crm.shifts.detail.recentOperations")}
        </h2>
        <div
          className="nur-tabs shift-detail-page__tabs"
          role="tablist"
          aria-label={t("crm.shifts.detail.operationsAriaLabel")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "products"}
            className={`nur-tabs__tab${activeTab === "products" ? " is-active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            {t("crm.shifts.detail.productMovement")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "money"}
            className={`nur-tabs__tab${activeTab === "money" ? " is-active" : ""}`}
            onClick={() => setActiveTab("money")}
          >
            {t("crm.shifts.detail.moneyMovement")}
          </button>
        </div>

        {activeTab === "products" && (
          <div className="shift-detail-page__operations-list">
            <FilterBar className="shift-detail-page__filters">
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("common.status")}</label>
                <select
                  className="nur-select"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  <option value="paid">{t("crm.shifts.detail.paid")}</option>
                  <option value="unpaid">
                    {t("crm.shifts.detail.unpaid")}
                  </option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">
                  {t("crm.shifts.detail.paymentMethod")}
                </label>
                <select
                  className="nur-select"
                  value={filters.payment_method}
                  onChange={(e) =>
                    setFilters({ ...filters, payment_method: e.target.value })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  <option value="cash">
                    {t("crm.shifts.detail.cashPlain")}
                  </option>
                  <option value="transfer">
                    {t("crm.shifts.detail.noncashShort")}
                  </option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("crm.shifts.cashier")}</label>
                <select
                  className="nur-select"
                  value={filters.cashier}
                  onChange={(e) =>
                    setFilters({ ...filters, cashier: e.target.value })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  {cashierOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("common.search")}</label>
                <input
                  type="text"
                  className="nur-input"
                  placeholder={t("crm.shifts.detail.searchReceipt")}
                  value={filters.q}
                  onChange={(e) =>
                    setFilters({ ...filters, q: e.target.value })
                  }
                />
              </div>
            </FilterBar>

            {/* Индикатор загрузки */}
            {salesLoading && <LoadingState rows={3} />}

            {/* Ошибка */}
            {salesError && (
              <div className="shift-detail-page__error-message">
                {salesError}
              </div>
            )}

            {/* Список продаж */}
            <DataContainer className="gap-2 flex flex-col">
              {!salesLoading && !salesError && (
                <>
                  {productMovements.length === 0 ? (
                    <EmptyState
                      title={t("crm.shifts.detail.salesNotFound")}
                      text={t("crm.shifts.detail.salesNotFoundHint")}
                    />
                  ) : (
                    productMovements.map((movement, idx) => {
                      const isExpanded = expandedSaleId === movement.id;
                      const itemsState = saleItemsById[movement.id];
                      const isPaid = movement.status === "paid";
                      return (
                        <div
                          key={movement.id}
                          className={`shift-detail-page__operation-card${
                            isExpanded
                              ? " shift-detail-page__operation-card--open"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="shift-detail-page__operation"
                            aria-expanded={isExpanded}
                            onClick={() => toggleSaleExpand(movement)}
                          >
                            <span
                              className={`shift-detail-page__operation-avatar${
                                isPaid
                                  ? " shift-detail-page__operation-avatar--paid"
                                  : " shift-detail-page__operation-avatar--unpaid"
                              }`}
                            >
                              <Receipt size={19} />
                            </span>

                            <div className="shift-detail-page__operation-main">
                              <div className="shift-detail-page__operation-heading">
                                <span className="shift-detail-page__operation-title">
                                  {t("crm.shifts.detail.saleTitle", {
                                    number: idx + 1,
                                  })}
                                </span>
                                <span className="shift-detail-page__operation-doc">
                                  #
                                  {movement.docNumber ||
                                    movement.id.slice(0, 8)}
                                </span>
                              </div>

                              <div className="shift-detail-page__operation-meta">
                                <span className="shift-detail-page__operation-meta-item">
                                  <User size={13} />
                                  {movement.cashier}
                                </span>
                                <span className="shift-detail-page__operation-dot" />
                                <span className="shift-detail-page__operation-meta-item">
                                  <Calendar size={13} />
                                  {formatDate(movement.date)}
                                </span>
                                {movement.store && (
                                  <>
                                    <span className="shift-detail-page__operation-dot" />
                                    <span className="shift-detail-page__operation-meta-item">
                                      <Store size={13} />
                                      {movement.store}
                                    </span>
                                  </>
                                )}
                                {movement.client && (
                                  <>
                                    <span className="shift-detail-page__operation-dot" />
                                    <span className="shift-detail-page__operation-meta-item">
                                      <User size={13} />
                                      {movement.client}
                                    </span>
                                  </>
                                )}
                              </div>

                              <span className="shift-detail-page__operation-positions">
                                <Package size={12} />
                                {t("crm.shifts.detail.positions", {
                                  count: movement.positions,
                                })}
                              </span>
                            </div>

                            <div className="shift-detail-page__operation-side">
                              <span
                                className={`shift-detail-page__operation-status shift-detail-page__operation-status--${
                                  isPaid ? "paid" : "unpaid"
                                }`}
                              >
                                {isPaid ? (
                                  <CheckCircle size={13} />
                                ) : (
                                  <XCircle size={13} />
                                )}
                                {isPaid
                                  ? t("crm.shifts.detail.documentPaid")
                                  : t("crm.shifts.detail.documentUnpaid")}
                              </span>
                              <span className="shift-detail-page__operation-amount">
                                {movement.amount.toFixed(2)}
                                <span className="shift-detail-page__operation-currency">
                                  {t("common.currencySom")}
                                </span>
                              </span>
                            </div>

                            <span className="shift-detail-page__operation-chevron">
                              <ChevronDown
                                size={18}
                                className={
                                  isExpanded
                                    ? "shift-detail-page__operation-expand shift-detail-page__operation-expand--open"
                                    : "shift-detail-page__operation-expand"
                                }
                              />
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="shift-detail-page__operation-items">
                              <div className="shift-detail-page__operation-items-header">
                                <Package size={14} />
                                {t(
                                  "crm.shifts.detail.positionsTitle",
                                  "Позиции чека",
                                )}
                              </div>
                              {itemsState?.loading && (
                                <div className="shift-detail-page__operation-items-state">
                                  {t("common.loading")}
                                </div>
                              )}
                              {itemsState?.error && (
                                <div className="shift-detail-page__operation-items-state shift-detail-page__operation-items-state--error">
                                  {itemsState.error}
                                </div>
                              )}
                              {!itemsState?.loading &&
                                !itemsState?.error &&
                                (itemsState?.items?.length ? (
                                  <div className="shift-detail-page__operation-items-scroll">
                                    <table className="shift-detail-page__operation-items-table">
                                      <thead>
                                        <tr>
                                          <th>
                                            {t("crm.shifts.detail.product")}
                                          </th>
                                          <th>
                                            {t("crm.shifts.detail.productQty")}
                                          </th>
                                          <th>{t("common.price")}</th>
                                          <th>{t("common.amount")}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {itemsState.items.map(
                                          (item: any, i: number) => {
                                            const qty = Number(
                                              item.qty ?? item.quantity ?? 0,
                                            );
                                            const price = Number(
                                              item.unit_price ??
                                                item.price ??
                                                0,
                                            );
                                            const lineTotal = Number(
                                              item.line_total ??
                                                item.total ??
                                                price * qty,
                                            );
                                            return (
                                              <tr key={item.id ?? i}>
                                                <td>
                                                  {item.product_name ||
                                                    item.name_snapshot ||
                                                    item.name ||
                                                    "—"}
                                                </td>
                                                <td>{qty}</td>
                                                <td>{price.toFixed(2)}</td>
                                                <td>{lineTotal.toFixed(2)}</td>
                                              </tr>
                                            );
                                          },
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="shift-detail-page__operation-items-state">
                                    {t("crm.shifts.detail.noPositions")}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </DataContainer>
          </div>
        )}

        {activeTab === "money" && (
          <div className="shift-detail-page__operations-list">
            <FilterBar className="shift-detail-page__filters">
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("common.status")}</label>
                <select
                  className="nur-select"
                  value={moneyFilters.status}
                  onChange={(e) =>
                    setMoneyFilters({
                      ...moneyFilters,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  <option value="paid">{t("crm.shifts.detail.paid")}</option>
                  <option value="unpaid">
                    {t("crm.shifts.detail.unpaid")}
                  </option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">
                  {t("crm.shifts.detail.paymentMethod")}
                </label>
                <select
                  className="nur-select"
                  value={moneyFilters.payment_method}
                  onChange={(e) =>
                    setMoneyFilters({
                      ...moneyFilters,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  <option value="cash">
                    {t("crm.shifts.detail.cashPlain")}
                  </option>
                  <option value="transfer">
                    {t("crm.shifts.detail.noncashShort")}
                  </option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("crm.shifts.cashier")}</label>
                <select
                  className="nur-select"
                  value={moneyFilters.cashier}
                  onChange={(e) =>
                    setMoneyFilters({
                      ...moneyFilters,
                      cashier: e.target.value,
                    })
                  }
                >
                  <option value="">{t("common.all")}</option>
                  {cashierOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">{t("common.search")}</label>
                <input
                  type="text"
                  className="nur-input"
                  placeholder={t("crm.shifts.detail.searchReceipt")}
                  value={moneyFilters.q}
                  onChange={(e) =>
                    setMoneyFilters({ ...moneyFilters, q: e.target.value })
                  }
                />
              </div>
            </FilterBar>

            {/* Индикатор загрузки */}
            {moneyLoading && <LoadingState rows={3} />}

            {/* Ошибка */}
            {moneyError && (
              <div className="shift-detail-page__error-message">
                {moneyError}
              </div>
            )}

            {/* Список движения денег */}
            {!moneyLoading && !moneyError && (
              <>
                {moneyMovements.length === 0 ? (
                  <EmptyState
                    title={t("crm.shifts.detail.moneyNotFound")}
                    text={t("crm.shifts.detail.moneyNotFoundHint")}
                  />
                ) : (
                  moneyMovements.map((movement, idx) => (
                    <div
                      key={movement.id}
                      className="shift-detail-page__operation"
                    >
                      <div className="shift-detail-page__operation-indicator shift-detail-page__operation-indicator--blue" />
                      <div className="shift-detail-page__operation-content">
                        <div className="shift-detail-page__operation-title">
                          <FileText size={16} />
                          {t("crm.shifts.detail.incomeTitle", {
                            number: idx + 1,
                          })}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          {t("crm.shifts.detail.counterparty")}:{" "}
                          {movement.counterparty}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          {t("crm.shifts.detail.account")}: {movement.account}
                        </div>
                        <div className="shift-detail-page__operation-tag">
                          {movement.tag}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          {formatDate(movement.date)}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          {t("crm.shifts.cashier")}: {movement.cashier}
                        </div>
                        {movement.payment_method && (
                          <div className="shift-detail-page__operation-info">
                            {t("crm.shifts.detail.paymentMethod")}:{" "}
                            {movement.payment_method}
                          </div>
                        )}
                      </div>
                      <div className="shift-detail-page__operation-amount shift-detail-page__operation-amount--green">
                        +{movement.amount.toFixed(2)} сом
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "list" && (
          <div className="shift-detail-page__product-list">
            <h3 className="shift-detail-page__product-list-title">
              {t("crm.shifts.detail.productSale")}
            </h3>
            <table className="nur-table nur-table--dense">
              <thead>
                <tr>
                  <th>{t("crm.shifts.detail.product")}</th>
                  <th>{t("crm.shifts.detail.productQty")}</th>
                  <th>{t("crm.shifts.detail.salesAmount")}</th>
                  <th>{t("crm.shifts.detail.profit")}</th>
                </tr>
              </thead>
              <tbody>
                {productList.map((product, index) => (
                  <tr key={index}>
                    <td>{product.name}</td>
                    <td>{product.quantity.toFixed(2)}</td>
                    <td>{product.salesAmount.toFixed(2)}</td>
                    <td>{product.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PagePanel>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        okText={
          alertModal.type === "warning" ? t("common.yes") : t("common.ok")
        }
        onClose={closeAlert}
        onConfirm={handleConfirm}
      />
    </PageShell>
  );
};

export default ShiftDetail;
