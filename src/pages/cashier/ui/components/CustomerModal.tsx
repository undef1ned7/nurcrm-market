import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { X, Search, Plus } from "lucide-react";
import {
  createClientAsync,
  fetchClientsAsync,
} from "@entities/client";
import "./CustomerModal.scss";

type CustomerTab = "client" | "suppliers";

const isSupplierType = (type: unknown) =>
  String(type || "").toLowerCase() === "suppliers";

const CustomerModal = ({
  onClose,
  onSelect,
  customers = [],
  titleKey = "crm.cashier.payment.customerModalTitle",
}: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const [activeTab, setActiveTab] = useState<CustomerTab>("client");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newClient, setNewClient] = useState<any>({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "client",
  });

  const tabCustomers = useMemo(
    () =>
      customers.filter((customer: any) => {
        const supplier = isSupplierType(customer?.type);
        return activeTab === "suppliers" ? supplier : !supplier;
      }),
    [customers, activeTab],
  );

  const filteredCustomers = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return tabCustomers;

    return tabCustomers.filter(
      (customer: any) =>
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchTerm.trim()),
    );
  }, [tabCustomers, searchTerm]);

  const getInitials = (name: any) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDebtAmount = (customer: any) => {
    return customer.debt || customer.total_debt || 0;
  };

  const handleTabChange = (tab: CustomerTab) => {
    setActiveTab(tab);
    setShowCreateForm(false);
    setCreateError("");
  };

  const resetCreateForm = () => ({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: activeTab === "suppliers" ? "suppliers" : "client",
  });

  const handleOpenCreateForm = () => {
    setNewClient(resetCreateForm());
    setCreateError("");
    setShowCreateForm(true);
  };

  const handleCreateClient = async () => {
    setCreateError("");

    if (!newClient.full_name?.trim()) {
      setCreateError("Введите имя клиента");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...newClient,
        type: activeTab === "suppliers" ? "suppliers" : "client",
      };
      const result = await dispatch(createClientAsync(payload)).unwrap();

      if (result?.id) {
        await dispatch(fetchClientsAsync(undefined as any));

        if (onSelect) {
          onSelect(result);
        }

        setNewClient(resetCreateForm());
        setShowCreateForm(false);
        setCreateError("");
        onClose();
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      setCreateError(
        error?.detail ||
          error?.message ||
          error?.full_name?.[0] ||
          "Не удалось создать клиента",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setNewClient((prev: any) => ({ ...prev, [name]: value }));
    if (createError) setCreateError("");
  };

  const createLabel =
    activeTab === "suppliers"
      ? t("crm.cashier.payment.customerModalCreateSupplier")
      : t("crm.cashier.payment.customerModalCreateClient");

  const emptyLabel =
    activeTab === "suppliers"
      ? t("crm.cashier.payment.customerModalEmptySuppliers")
      : t("crm.cashier.payment.customerModalEmptyClients");

  return (
    <div className="customer-modal-overlay" onClick={onClose}>
      <div className="customer-modal" onClick={(e: any) => e.stopPropagation()}>
        <div className="customer-modal__header">
          <h2 className="customer-modal__title">{t(titleKey)}</h2>
          <button className="customer-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div
          className="customer-modal__tabs nur-tabs"
          role="tablist"
          aria-label={t(titleKey)}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "client"}
            className={`nur-tabs__tab${activeTab === "client" ? " is-active" : ""}`}
            onClick={() => handleTabChange("client")}
          >
            {t("crm.cashier.payment.customerModalTabClient")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "suppliers"}
            className={`nur-tabs__tab${activeTab === "suppliers" ? " is-active" : ""}`}
            onClick={() => handleTabChange("suppliers")}
          >
            {t("crm.cashier.payment.customerModalTabSupplier")}
          </button>
        </div>

        <div className="customer-modal__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Введите текст для поиска"
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="customer-modal__search-input"
          />
        </div>

        {!showCreateForm ? (
          <>
            <div className="customer-modal__summary">
              <span>Найдено {filteredCustomers.length}</span>
              <span>
                Общий долг:{" "}
                {filteredCustomers
                  .reduce((sum: any, c: any) => sum + getDebtAmount(c), 0)
                  .toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                сом
              </span>
            </div>

            <div className="customer-modal__create-section">
              <button
                className="customer-modal__create-btn"
                onClick={handleOpenCreateForm}
              >
                <Plus size={18} />
                {createLabel}
              </button>
            </div>

            <div className="customer-modal__list">
              {filteredCustomers.length === 0 ? (
                <div className="customer-modal__empty">{emptyLabel}</div>
              ) : (
                filteredCustomers.map((customer: any) => {
                  const debt = getDebtAmount(customer);
                  const hasDebt = debt > 0;
                  return (
                    <div
                      key={customer.id}
                      className="customer-modal__item"
                      onClick={() => {
                        onSelect(customer);
                        onClose();
                      }}
                    >
                      <div className="customer-modal__item-avatar">
                        {getInitials(customer.full_name || customer.name)}
                      </div>
                      <div className="customer-modal__item-info">
                        <div className="customer-modal__item-name">
                          {customer.full_name || customer.name || "Без имени"}
                        </div>
                        {hasDebt && (
                          <div className="customer-modal__item-debt">
                            {debt.toLocaleString("ru-RU", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            сом
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="customer-modal__create-form-wrapper">
            <div className="customer-modal__create-form">
              <div className="customer-modal__create-form-header">
                <h3>
                  {activeTab === "suppliers" ? "Новый поставщик" : "Новый клиент"}
                </h3>
                <button
                  className="customer-modal__create-form-close"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                    setNewClient(resetCreateForm());
                  }}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <div className="customer-modal__create-error">
                  {createError}
                </div>
              )}

              <div className="customer-modal__create-form-fields">
                <div className="customer-modal__create-form-field">
                  <label>ФИО *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={newClient.full_name}
                    onChange={handleInputChange}
                    placeholder="Введите ФИО"
                    required
                  />
                </div>

                <div className="customer-modal__create-form-field">
                  <label>Телефон</label>
                  <input
                    type="text"
                    name="phone"
                    value={newClient.phone}
                    onChange={handleInputChange}
                    placeholder="Введите телефон"
                  />
                </div>

                <div className="customer-modal__create-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newClient.email}
                    onChange={handleInputChange}
                    placeholder="Введите email"
                  />
                </div>

                <div className="customer-modal__create-form-field">
                  <label>Дата</label>
                  <input
                    type="date"
                    name="date"
                    value={newClient.date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="customer-modal__create-form-actions">
                <button
                  className="customer-modal__create-form-cancel"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateError("");
                    setNewClient(resetCreateForm());
                  }}
                  disabled={creating}
                >
                  Отмена
                </button>
                <button
                  className="customer-modal__create-form-submit"
                  onClick={handleCreateClient}
                  disabled={creating || !newClient.full_name?.trim()}
                >
                  {creating ? "Создание..." : "Создать"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="customer-modal__footer">
          <button className="customer-modal__close-btn" onClick={onClose}>
            ЗАКРЫТЬ [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
