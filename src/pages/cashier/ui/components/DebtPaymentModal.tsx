import React, { useState, useEffect, useMemo } from "react";
import { X, Search, ChevronRight, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import api from "@shared/api";
import { payDebtDeal } from "@entities/client";
import { getSale } from "@entities/sale";
import {
  postCashflowIfNeeded,
} from "@entities/cash";
import { useUser } from "@entities/user";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import {
  getInstallmentRemaining,
  getInstallmentStatus,
} from "@shared/lib/tools/clientDeals";
import "./DebtPaymentModal.scss";

const DebtPaymentModal = ({
  onClose,
  customers: _customers = [],
  shiftId,
}: {
  onClose: () => void;
  customers?: unknown[];
  shiftId?: string | number;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { company, profile } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientDebts, setClientDebts] = useState<any>(new Map()); // Map<clientId, totalDebt>
  const [isDebtTotalReliable, setIsDebtTotalReliable] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientDeals, setClientDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<any>({}); // { dealId-installmentNumber: amount }
  const [alertModal, setAlertModal] = useState<any>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertModal({ open: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertModal((prev: any) => ({ ...prev, open: false }));
  };

  // Функция для загрузки всех страниц
  const fetchAllPages = async (url: any) => {
    const allItems: any[] = [];
    let nextUrl: any = url;
    let guard = 0;
    const maxPages = 100;

    while (nextUrl && guard < maxPages) {
      try {
        const { data } = await api.get(nextUrl);
        const results = Array.isArray(data?.results) ? data.results : [];
        allItems.push(...results);
        nextUrl = data?.next || null;
        guard += 1;
      } catch (error: any) {
        console.error("Ошибка при загрузке данных:", error);
        break;
      }
    }

    return allItems;
  };

  // Загрузка должников
  useEffect(() => {
    let cancelled = false;

    const getClientDebt = (client: any): number => {
      // Сервер может называть сумму по-разному; выбираем первое найденное числовое поле.
      const raw =
        client?.remaining_debt ??
        client?.total_debt ??
        client?.debt ??
        client?.amount ??
        client?.debt_amount ??
        null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    };

    const loadDebtors = async () => {
      try {
        setLoading(true);
        const allDebtors = await fetchAllPages("/main/clients/with-debts/");
        if (cancelled) return;
        setDebtors(allDebtors);

        // Fast-path: не грузим deals для каждого должника при открытии модалки.
        // Если бэк отдает агрегированную сумму долга в элементе списка —
        // используем её для общего долга/фильтрации. Deals грузим только после выбора клиента.
        const debtsMap = new Map<any, any>();
        let hasAnyDebtTotal = false;
        for (const client of allDebtors) {
          const clientId = client?.id;
          if (!clientId) continue;
          const debt = getClientDebt(client);
          debtsMap.set(clientId, debt);
          hasAnyDebtTotal = hasAnyDebtTotal || debt > 0;
        }

        if (cancelled) return;
        setClientDebts(debtsMap);
        setIsDebtTotalReliable(hasAnyDebtTotal);
      } catch (error: any) {
        if (cancelled) return;
        console.error("Ошибка при загрузке должников:", error);
        showAlert("error", t("common.error"), t("crm.cashier.debtPayment.alerts.loadDebtorsFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDebtors();
    return () => {
      cancelled = true;
    };
  }, []);

  // Фильтруем по поисковому запросу и показываем только тех, у кого есть долг
  const filteredDebtors = useMemo(() => {
    // Endpoint `/main/clients/with-debts/` должен уже отдавать только должников,
    // поэтому фильтрацию по `clientDebts` делаем только по поиску (без N+1).
    let filtered = debtors;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((customer: any) => {
        const name = (customer.full_name || customer.name || "").toLowerCase();
        const phone = (customer.phone || "").toLowerCase();
        return name.includes(searchLower) || phone.includes(searchLower);
      });
    }

    return filtered;
  }, [debtors, searchTerm]);

  // Вычисляем общий долг
  const totalDebt = useMemo(() => {
    return filteredDebtors.reduce((sum, customer) => {
      const debt = clientDebts.get(customer.id) || 0;
      return sum + debt;
    }, 0);
  }, [filteredDebtors, clientDebts]);

  // Функция для получения инициалов
  const getInitials = (name) => {
    if (!name) return "?";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (
        words[0].charAt(0).toUpperCase() +
        words[words.length - 1].charAt(0).toUpperCase()
      );
    }
    return name.charAt(0).toUpperCase();
  };

  // Функция для получения цвета аватара
  const getAvatarColor = (name) => {
    const colors = [
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#06b6d4", // cyan
      "#ec4899", // pink
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Загрузка deals клиента
  const loadClientDeals = async (clientId: any) => {
    try {
      setLoadingDeals(true);
      // Используем query параметр kind=debt для фильтрации на сервере
      const deals = await fetchAllPages(
        `/main/clients/${clientId}/deals/?kind=debt`
      );
      // Фильтруем только deals с remaining_debt > 0
      const debtDeals = deals.filter(
        (deal: any) => parseFloat(deal.remaining_debt || 0) > 0
      );
      setClientDeals(debtDeals);
    } catch (error: any) {
      console.error("Ошибка при загрузке deals:", error);
      showAlert("error", t("common.error"), t("crm.cashier.debtPayment.alerts.loadDebtsFailed"));
    } finally {
      setLoadingDeals(false);
    }
  };

  const handleCustomerClick = async (customer: any) => {
    setSelectedClient(customer);
    setPaymentAmounts({});
    await loadClientDeals(customer.id);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setClientDeals([]);
    setPaymentAmounts({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handlePayDebt = async (deal, installment) => {
    const remaining = getInstallmentRemaining(installment);
    const rawInput = paymentAmounts[`${deal.id}-${installment.number}`];
    const paymentAmount =
      rawInput !== undefined && rawInput !== "" ? parseFloat(rawInput) : 0;
    const effectiveAmount = paymentAmount > 0 ? paymentAmount : remaining;

    if (effectiveAmount <= 0) {
      showAlert("warning", t("common.warning"), t("crm.cashier.debtPayment.alerts.enterAmount"));
      return;
    }

    if (effectiveAmount > remaining) {
      showAlert(
        "warning",
        "Предупреждение",
        `Сумма не может превышать ${remaining.toFixed(2)} сом`,
      );
      return;
    }

    try {
      const paymentData: any = {
        idempotency_key: crypto.randomUUID(),
        installment_id: installment.id,
        date: new Date().toISOString().split("T")[0],
        note: "",
        ...buildPosRoutingFromUser(profile, company, shiftId),
      };
      if (effectiveAmount < remaining) {
        paymentData.amount = effectiveAmount.toFixed(2);
      }

      // Погашаем долг
      const updatedDeal = await dispatch(
        payDebtDeal({
          id: deal.id,
          clientId: selectedClient.id,
          data: paymentData,
        })
      ).unwrap();

      // Обновляем локальное состояние сделки из ответа API
      setClientDeals((prev: any) =>
        prev.map((d: any) => (d.id === deal.id ? updatedDeal : d))
      );

      // Пока Sale и Deal не связаны на бэке (см. docs/sale-flow-bugs.md,
      // пункт 9), это поле не приходит и блок ничего не делает. Как только
      // бэк начнёт отдавать связь — статус исходной продажи (paid/debt)
      // обновится сам, без доп. правок на фронте.
      const linkedSaleId = updatedDeal?.sale_id ?? updatedDeal?.sale?.id ?? null;
      if (linkedSaleId) {
        dispatch(getSale({ id: linkedSaleId }));
      }

      await postCashflowIfNeeded(
        dispatch,
        {
          type: "income",
          name: `Погашение долга: ${deal.title || "Долг"}`,
          amount: effectiveAmount.toFixed(2),
          source_cashbox_flow_id: deal.id,
          source_business_operation_id: "Погашение долга",
          status:
            company?.subscription_plan?.name === "Старт"
              ? "approved"
              : "pending",
        },
        { warnOnFailure: true, failureContext: "debt" },
      );

      // Обновляем общий долг клиента из обновленной сделки
      const allDeals = clientDeals.map((d: any) =>
        d.id === deal.id ? updatedDeal : d
      );
      const updatedTotalDebt = allDeals.reduce((sum, d) => {
        const remainingDebt = parseFloat(d.remaining_debt || 0);
        return sum + remainingDebt;
      }, 0);

      setClientDebts((prev: any) => {
        const next = new Map(prev);
        if (updatedTotalDebt > 0) {
          next.set(selectedClient.id, updatedTotalDebt);
        } else {
          next.delete(selectedClient.id);
        }
        return next;
      });

      // Очищаем сумму платежа
      setPaymentAmounts((prev: any) => {
        const next = { ...prev };
        delete next[`${deal.id}-${installment.number}`];
        return next;
      });

      showAlert("success", t("common.success"), t("crm.cashier.debtPayment.alerts.paidSuccess"));
    } catch (error: any) {
      console.error("Ошибка при погашении долга:", error);
      showAlert(
        "error",
        t("common.error"),
        t("crm.cashier.debtPayment.alerts.payFailed", {
          error: error.message || t("common.error"),
        })
      );
    }
  };

  // Обработка нажатия ESC: всегда закрываем модалку
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onClose]);

  // Если выбран клиент, показываем его deals
  if (selectedClient) {
    return (
      <div className="debt-payment-modal-overlay" onClick={onClose}>
        <div
          className="debt-payment-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="debt-payment-modal__header">
            <button
              className="debt-payment-modal__back"
              onClick={handleBackToList}
            >
              <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
            </button>
            <h2 className="debt-payment-modal__title">
              {t("crm.cashier.debtPayment.debtsTitle", {
                name: selectedClient.full_name || selectedClient.name,
              })}
            </h2>
            <button className="debt-payment-modal__close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="debt-payment-modal__deals">
            {loadingDeals ? (
              <div className="debt-payment-modal__empty">{t("crm.cashier.debtPayment.loading")}</div>
            ) : clientDeals.length === 0 ? (
              <div className="debt-payment-modal__empty">
                {t("crm.cashier.debtPayment.noActiveDebts")}
              </div>
            ) : (
              clientDeals.map((deal: any) => (
                <div key={deal.id} className="debt-payment-modal__deal">
                  <div className="debt-payment-modal__deal-header">
                    <div className="debt-payment-modal__deal-title">
                      {deal.title || t("crm.cashier.debtPayment.debt")}
                    </div>
                    <div className="debt-payment-modal__deal-amount">
                      {t("crm.cashier.debtPayment.remaining", {
                        amount: parseFloat(deal.remaining_debt || 0).toFixed(2),
                      })}
                    </div>
                  </div>

                  {deal.installments && deal.installments.length > 0 && (
                    <div className="debt-payment-modal__installments">
                      {deal.installments.map((installment) => {
                        const instStatus = getInstallmentStatus(installment);
                        const isPaid = instStatus.key === "paid";
                        const remaining = getInstallmentRemaining(installment);

                        return (
                          <div
                            key={installment.number}
                            className={`debt-payment-modal__installment ${
                              isPaid
                                ? "debt-payment-modal__installment--paid"
                                : ""
                            }`}
                          >
                            <div className="debt-payment-modal__installment-info">
                              <div className="debt-payment-modal__installment-number">
                                {t("crm.cashier.debtPayment.paymentNumber", { number: installment.number })}
                              </div>
                              <div className="debt-payment-modal__installment-date">
                                <Calendar size={14} />
                                {formatDate(installment.due_date)}
                              </div>
                              <div className="debt-payment-modal__installment-amount">
                                {t("crm.cashier.debtPayment.amount")}{" "}
                                {parseFloat(installment.amount || 0).toFixed(2)}{" "}
                                {t("common.currencySom")}
                              </div>
                              <div className="debt-payment-modal__installment-status">
                                {instStatus.label}
                              </div>
                              {isPaid ? (
                                <div className="debt-payment-modal__installment-paid">
                                  {t("crm.cashier.debtPayment.paidOn", {
                                    date: formatDate(installment.paid_on),
                                  })}
                                </div>
                              ) : (
                                <div className="debt-payment-modal__installment-remaining">
                                  {t("crm.cashier.debtPayment.remainingShort", {
                                    amount: remaining.toFixed(2),
                                  })}
                                </div>
                              )}
                            </div>

                            {!isPaid && remaining > 0 && (
                              <div className="debt-payment-modal__installment-payment">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  max={remaining}
                                  placeholder={t("crm.cashier.debtPayment.amountPlaceholder")}
                                  value={
                                    paymentAmounts[
                                      `${deal.id}-${installment.number}`
                                    ] || ""
                                  }
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPaymentAmounts((prev: any) => ({
                                      ...prev,
                                      [`${deal.id}-${installment.number}`]:
                                        value,
                                    }));
                                  }}
                                  className="debt-payment-modal__payment-input"
                                />
                                <button
                                  className="debt-payment-modal__pay-btn"
                                  onClick={() =>
                                    handlePayDebt(deal, installment)
                                  }
                                >
                                  {t("crm.cashier.debtPayment.pay")}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="debt-payment-modal__footer">
            <button
              className="debt-payment-modal__close-btn"
              onClick={handleBackToList}
            >
              {t("crm.cashier.debtPayment.back")}
            </button>
          </div>

          <AlertModal
            open={alertModal.open}
            type={alertModal.type}
            title={alertModal.title}
            message={alertModal.message}
            okText={t("settings.ok")}
            onClose={closeAlert}
            onConfirm={closeAlert}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="debt-payment-modal-overlay" onClick={onClose}>
      <div className="debt-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="debt-payment-modal__header">
          <h2 className="debt-payment-modal__title">{t("crm.cashier.debtPayment.title")}</h2>
          <button className="debt-payment-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="debt-payment-modal__search">
          <Search size={18} />
          <input
            type="text"
            placeholder={t("crm.cashier.debtPayment.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="debt-payment-modal__search-input"
          />
        </div>

        <div className="debt-payment-modal__summary">
          <div className="debt-payment-modal__summary-item">
            {t("crm.cashier.debtPayment.found", { count: filteredDebtors.length })}
          </div>
          <div className="debt-payment-modal__summary-item">
            {t("crm.cashier.debtPayment.totalDebt")}{" "}
            {isDebtTotalReliable
              ? totalDebt.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : t("crm.cashier.debtPayment.pending")}{" "}
            {isDebtTotalReliable ? t("common.currencySom") : ""}
          </div>
        </div>

        <div className="debt-payment-modal__list">
          {loading ? (
            <div className="debt-payment-modal__empty">{t("crm.cashier.debtPayment.loading")}</div>
          ) : filteredDebtors.length === 0 ? (
            <div className="debt-payment-modal__empty">
              {searchTerm ? t("crm.cashier.debtPayment.noDebtorsFound") : t("crm.cashier.debtPayment.noDebtors")}
            </div>
          ) : (
            filteredDebtors.map((customer: any) => {
              const debt = clientDebts.get(customer.id) || 0;
              const initials = getInitials(customer.full_name || customer.name);
              const avatarColor = getAvatarColor(
                customer.full_name || customer.name
              );

              return (
                <div
                  key={customer.id}
                  className="debt-payment-modal__item"
                  onClick={() => handleCustomerClick(customer)}
                >
                  <div
                    className="debt-payment-modal__avatar"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>
                  <div className="debt-payment-modal__item-content">
                    <div className="debt-payment-modal__item-name">
                      {customer.full_name || customer.name || t("crm.cashier.debtPayment.noName")}
                    </div>
                    {customer.phone && (
                      <div className="debt-payment-modal__item-phone">
                        {customer.phone}
                      </div>
                    )}
                  </div>
                  <div className="debt-payment-modal__item-debt">
                    {isDebtTotalReliable
                      ? `${debt.toLocaleString("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} сом`
                      : "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="debt-payment-modal__footer">
          <button className="debt-payment-modal__close-btn" onClick={onClose}>
            {t("crm.cashier.debtPayment.close")}
          </button>
        </div>

        <AlertModal
          open={alertModal.open}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          okText={t("settings.ok")}
          onClose={closeAlert}
          onConfirm={closeAlert}
        />
      </div>
    </div>
  );
};

export default DebtPaymentModal;
