import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import {
  fetchShiftByIdAsync,
  fetchShiftSalesAsync,
  resolveShiftPaymentBreakdown,
  ShiftPaymentBreakdown,
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
  const [moneyMovements, setMoneyMovements] = useState<any[]>([]);
  const [moneyLoading, setMoneyLoading] = useState(false);
  const [moneyError, setMoneyError] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "",
    payment_method: "",
    q: "",
  });
  const [moneyFilters, setMoneyFilters] = useState({
    status: "",
    payment_method: "",
    q: "",
  });

  const shift = currentShift;
  const paymentBreakdown = resolveShiftPaymentBreakdown(
    shift,
    filters.status || filters.payment_method || filters.q ? [] : salesHistory,
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

        const result = await dispatch(
          fetchShiftSalesAsync({
            shiftId: id,
            params: searchParams,
          })
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
      filters.q ? 500 : 0
    );

    return () => clearTimeout(timeoutId);
  }, [id, dispatch, filters.status, filters.payment_method, filters.q]);

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

        const result = await dispatch(
          fetchShiftSalesAsync({
            shiftId: id,
            params: searchParams,
          })
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
        const errorMessage = validateResErrors(error, t("crm.shifts.detail.moneyLoadError"))
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
      moneyFilters.q ? 500 : 0
    );

    return () => clearTimeout(timeoutId);
  }, [
    id,
    dispatch,
    moneyFilters.status,
    moneyFilters.payment_method,
    moneyFilters.q,
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

  // Преобразование данных продаж для отображения
  const productMovements = salesHistory.map((sale) => ({
    id: sale.id,
    docNumber: sale.doc_number,
    type: "sale",
    date: sale.created_at || sale.paid_at,
    store: sale.branch || shift?.branch || "—",
    client: sale.client_name || "—",
    cashier: sale.cashier_display || "—",
    status: sale.status || "paid",
    positions: sale.items?.length || 0,
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
            {t("crm.shifts.detail.closed", { date: formatDate(shift.closed_at) })}
          </span>
        )}
      </div>

      <StatGrid className="shift-detail-page__metrics">
        <StatCard
          label={t("crm.shifts.revenue")}
          value={`${parseFloat(shift.sales_total || 0).toFixed(2)} ${t("common.currencySom")}`}
        />
        <StatCard label={t("crm.shifts.sales")} value={shift.sales_count || 0} />
        <StatCard label={t("crm.shifts.cashbox")} value={shift.cashbox_name || "—"} />
        <StatCard label={t("crm.shifts.detail.store")} value={shift.branch || "—"} />
      </StatGrid>

      <div className="shift-detail-page__details">
        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <TrendingUp size={20} className="shift-detail-page__icon--success" />
            <h3 className="shift-detail-page__detail-title">Выручка</h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  Кол-во продаж
                </div>
                <div className="shift-detail-page__detail-value">
                  {shift.sales_count || 0}
                </div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  Общая сумма продаж
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
                  Наличными
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
                  Безналичные
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
            <h3 className="shift-detail-page__detail-title">Возвраты</h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  Количество возвратов
                </div>
                <div className="shift-detail-page__detail-value">0</div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">Наличные</div>
                <div className="shift-detail-page__detail-value">0.00 сом</div>
              </div>
            </div>
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  Сумма возвратов
                </div>
                <div className="shift-detail-page__detail-value">0.00 сом</div>
              </div>
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  Безналичные
                </div>
                <div className="shift-detail-page__detail-value">0.00 сом</div>
              </div>
            </div>
          </div>
        </div>

        <div className="shift-detail-page__detail-card">
          <div className="shift-detail-page__detail-header">
            <Wallet size={20} className="shift-detail-page__icon--info" />
            <h3 className="shift-detail-page__detail-title">
              Наличные в кассе
            </h3>
          </div>
          <div className="shift-detail-page__detail-content">
            <div className="shift-detail-page__detail-row">
              <div className="shift-detail-page__detail-item">
                <div className="shift-detail-page__detail-label">
                  На начало смены
                </div>
                <div className="shift-detail-page__detail-value">
                  {parseFloat(shift.opening_cash || 0).toFixed(2)} сом
                </div>
              </div>
              {shift.closed_at && shift.closing_cash !== null && (
                <div className="shift-detail-page__detail-item">
                  <div className="shift-detail-page__detail-label">
                    Фактическая сумма
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
                  Ожидаемая сумма
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
                    Расхождение
                  </div>
                  <div
                    className={`shift-detail-page__detail-value ${parseFloat(shift.cash_diff || 0) === 0
                        ? "shift-detail-page__detail-value--green"
                        : parseFloat(shift.cash_diff || 0) > 0
                          ? "shift-detail-page__detail-value--green"
                          : "shift-detail-page__detail-value--red"
                      }`}
                  >
                    {parseFloat(shift.cash_diff || 0) === 0 ? (
                      <>
                        ✓{" "}
                        {Number(Math.abs(shift.cash_diff || 0)).toFixed(2)}{" "}
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
            <TrendingUp size={20} className="shift-detail-page__icon--success" />
            <h3 className="shift-detail-page__detail-title">
              Приходы и расходы
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
                  Прочие приходы
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
                  Расходы
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
        <span className="shift-detail-page__total-label">Итоговая выручка</span>
        <span className="shift-detail-page__total-value">
          {parseFloat(shift.sales_total || 0).toFixed(2)} сом
        </span>
      </div>

      <PagePanel className="shift-detail-page__operations">
        <h2 className="shift-detail-page__operations-title">
          Последние операции
        </h2>
        <div
          className="nur-tabs shift-detail-page__tabs"
          role="tablist"
          aria-label="Операции смены"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "products"}
            className={`nur-tabs__tab${activeTab === "products" ? " is-active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            Движение товара
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "money"}
            className={`nur-tabs__tab${activeTab === "money" ? " is-active" : ""}`}
            onClick={() => setActiveTab("money")}
          >
            Движение денег
          </button>
        </div>

        {activeTab === "products" && (
          <div className="shift-detail-page__operations-list">
            <FilterBar className="shift-detail-page__filters">
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">Статус</label>
                <select
                  className="nur-select"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">Все</option>
                  <option value="paid">Оплаченные</option>
                  <option value="unpaid">Неоплаченные</option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">Способ оплаты</label>
                <select
                  className="nur-select"
                  value={filters.payment_method}
                  onChange={(e) =>
                    setFilters({ ...filters, payment_method: e.target.value })
                  }
                >
                  <option value="">Все</option>
                  <option value="cash">Наличные</option>
                  <option value="transfer">Безнал</option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">Поиск</label>
                <input
                  type="text"
                  className="nur-input"
                  placeholder="Поиск по номеру чека"
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
                      title="Продажи не найдены"
                      text="За эту смену продаж нет или измените фильтры."
                    />
                  ) : (
                    productMovements.map((movement, idx) => (
                      <div
                        key={movement.id}
                        className="shift-detail-page__operation"
                      >
                        <div className="shift-detail-page__operation-indicator shift-detail-page__operation-indicator--blue" />
                        <div className="shift-detail-page__operation-content">
                          <div className="shift-detail-page__operation-title">
                            Продажа #{idx + 1}
                            {movement.docNumber || movement.id.slice(0, 8)}
                          </div>
                          <div className="shift-detail-page__operation-info">
                            Магазин {movement.store} &gt; клиент {movement.client}
                          </div>
                          <div className="shift-detail-page__operation-info">
                            {movement.cashier}, {formatDate(movement.date)}
                          </div>
                          <div
                            className={`shift-detail-page__operation-status shift-detail-page__operation-status--${movement.status === "paid" ? "paid" : "unpaid"
                              }`}
                          >
                            {movement.status === "paid" ? (
                              <>
                                <CheckCircle size={16} />
                                <span>Документ оплачен</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={16} />
                                <span>Документ не оплачен</span>
                              </>
                            )}
                          </div>
                          <div className="shift-detail-page__operation-positions">
                            {movement.positions} позиции
                          </div>
                        </div>
                        <div className="shift-detail-page__operation-amount">
                          {movement.amount.toFixed(2)} сом
                        </div>
                        <ChevronDown
                          size={20}
                          className="shift-detail-page__operation-expand"
                        />
                      </div>
                    ))
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
                <label className="nur-label">Статус</label>
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
                  <option value="">Все</option>
                  <option value="paid">Оплаченные</option>
                  <option value="unpaid">Неоплаченные</option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">Способ оплаты</label>
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
                  <option value="">Все</option>
                  <option value="cash">Наличные</option>
                  <option value="transfer">Безнал</option>
                </select>
              </div>
              <div className="nur-field shift-detail-page__filter-group">
                <label className="nur-label">Поиск</label>
                <input
                  type="text"
                  className="nur-input"
                  placeholder="Поиск по номеру чека"
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
                    title="Движение денег не найдено"
                    text="За эту смену движений нет или измените фильтры."
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
                          Приход #{idx + 1}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          Контрагент: {movement.counterparty}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          Счёт: {movement.account}
                        </div>
                        <div className="shift-detail-page__operation-tag">
                          {movement.tag}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          {formatDate(movement.date)}
                        </div>
                        <div className="shift-detail-page__operation-info">
                          Кассир: {movement.cashier}
                        </div>
                        {movement.payment_method && (
                          <div className="shift-detail-page__operation-info">
                            Способ оплаты: {movement.payment_method}
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
              Продажа товара
            </h3>
            <table className="nur-table nur-table--dense">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Кол-во товара</th>
                  <th>Сумма продаж</th>
                  <th>Прибыль</th>
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
        okText={alertModal.type === "warning" ? "Да" : "ОК"}
        onClose={closeAlert}
        onConfirm={handleConfirm}
      />
    </PageShell>
  );
};

export default ShiftDetail;
