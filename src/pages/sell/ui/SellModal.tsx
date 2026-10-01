import { Minus, Plus, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router";

import { useDebounce } from "@shared/hooks/useDebounce";
import {
  createClientAsync,
  fetchClientsAsync,
} from "@entities/client";
import {
  addCustomItem,
  createDeal,
  deleteProductInCart,
  doSearch,
  getProductCheckout,
  getProductInvoice,
  historySellProduct,
  manualFilling,
  productCheckout,
  startSale,
  updateProductInCart,
} from "@entities/sale";
import {
  postCashflowIfNeeded,
} from "@entities/cash";
import { useClient } from "@entities/client";
import { useSale } from "@entities/sale";
import { getProfile, useUser } from "@entities/user";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import BarcodeScanner from "./BarcodeScanner";
import { createDebt, filterProducts } from "./sellHelpers";
import { fetchTransfersAsync } from "@entities/warehouse";
import { useProducts } from "@entities/product";
import { fetchAgentProductsAsync } from "@entities/product";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAlert } from "@shared/hooks/useDialog";
import { handleCheckoutResponseForPrinting as printViaSharedService } from "./services/printService";
import { parseStockError, getAvailableFromObject } from "./sellModal/sellModal.utils";
import { attachUsbListenersOnce, ensureUsbReadyAuto } from "./sellModal/sellModal.usb";
import { paymentBlockMemo } from "./sellModal/paymentBlockMemo";
import { ManualList } from "./sellModal/components/ManualList";
import { ClientBlock } from "./sellModal/components/ClientBlock";

async function handleCheckoutResponseForPrinting(res) {
  await printViaSharedService(res);
}

/* =========================
   1) SellModal
   ========================= */
const SellModal = ({ onClose, id }) => {
  const dispatch = useDispatch() as any;
  const location = useLocation();
  const  alert = useAlert();
  const { list: clients } = useClient();
  const { company, profile } = useUser();
  const { start, foundProduct } = useSale();
  const { agentProducts: transfers } = useProducts();

  const filterClient = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).filter(
        (c) => c.type === "client"
      ),
    [clients]
  );

  const [activeTab, setActiveTab] = useState(
    company?.sector?.name !== "Магазин" ? 1 : 0
  );
  const [isTabSelected, setIsTabSelected] = useState(true);
  const [clientId, setClientId] = useState("");
  const [debt, setDebt] = useState("");
  const [phone, setPhone] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [debtMonths, setDebtMonths] = useState("");
  const [inline, setInline] = useState({ id: null, field: null });
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<{
    id: string | number | null;
    value: string;
  }>({
    id: null,
    value: "",
  });
  const [showServices, setShowServices] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [customService, setCustomService] = useState({
    name: "",
    price: "",
    quantity: 1,
  });
  const [newClient, setNewClient] = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "client",
    llc: "",
    inn: "",
    okpo: "",
    score: "",
    bik: "",
    address: "",
  });
  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "income",
    name: "",
    amount: "",
    source_cashbox_flow_id: "",
    source_business_operation_id: "Продажа",
    status:
      company?.subscription_plan?.name === "Старт" ? "approved" : "pending",
  });

  const run = useCallback((thunk) => dispatch(thunk).unwrap(), [dispatch]);

  const pickClient = useMemo(
    () => filterClient.find((x) => String(x.id) === String(clientId)),
    [filterClient, clientId]
  );

  const debouncedSearch = useDebounce((value) => {
    dispatch(doSearch({ search: value }));
  }, 600);

  const onSearch = useCallback(
    (e) => debouncedSearch(e.target.value),
    [debouncedSearch]
  );

  const onNewClientChange = useCallback(
    (e) => setNewClient((p) => ({ ...p, [e.target.name]: e.target.value })),
    []
  );

  const onCustomServiceChange = useCallback(
    (e) => setCustomService((p) => ({ ...p, [e.target.name]: e.target.value })),
    []
  );

  const sellData = useMemo(
    () =>
      location.pathname === "/crm/production/agents"
        ? Array.isArray(transfers)
          ? transfers
          : []
        : Array.isArray(foundProduct?.results)
        ? foundProduct.results
        : [],
    [location.pathname, transfers, foundProduct?.results]
  );

  const filteredItems = useMemo(() => {
    const base = Array.isArray(foundProduct?.results)
      ? foundProduct.results
      : [];
    const trs = Array.isArray(transfers) ? transfers : [];
    return filterProducts(base, trs);
  }, [foundProduct?.results, transfers]);

  const isShop = company?.sector?.name === "Магазин";
  const allCatalogItems = useMemo(
    () => (isShop ? filteredItems : sellData),
    [isShop, filteredItems, sellData]
  );

  const xName = (p) =>
    p?.name ?? p?.product_name ?? p?.display_name ?? String(p?.id ?? "");

  const getItemAvailableById = useCallback(
    (productId) => {
      if (!allCatalogItems || allCatalogItems.length === 0) return null;
      const pid = String(productId);
      const p =
        allCatalogItems.find((x) => {
          const id1 = x?.id != null ? String(x.id) : "";
          const id2 = x?.product != null ? String(x.product) : "";
          const id3 = x?.product_id != null ? String(x.product_id) : "";
          return id1 === pid || id2 === pid || id3 === pid;
        }) || null;

      return p
        ? { available: getAvailableFromObject(p), name: xName(p) }
        : { available: 0, name: "" };
    },
    [allCatalogItems]
  );

  const getCartQtyById = useCallback(
    (productId) => {
      const line =
        (start?.items || []).find((x) => String(x.id) === String(productId)) ||
        null;
      return Number(line?.quantity ?? 0);
    },
    [start?.items]
  );

  const guardQty = useCallback(
    (productId, wantQty) => {
      const info = getItemAvailableById(productId);
      if (info == null) return true;
      const { available, name } = info;
      if (wantQty > available) {
        alert(
          `Недостаточно на складе: «${
            name || productId
          }».\nНужно ${wantQty}, доступно ${available}.`
        );
        return false;
      }
      return true;
    },
    [getItemAvailableById, alert]
  );

  const saveInline = useCallback(
    async (productId) => {
      const wantQty = quantity ? Number(quantity) : 1;
      if (!guardQty(productId, wantQty)) return;
      try {
        const payload = {
          id,
          productId,
          quantity: wantQty,
          discount_total: discount || 0,
        };
        await run(manualFilling(payload));
        await run(startSale(undefined as any));
        setInline({ id: null, field: null });
        setQuantity("");
        setDiscount("");
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        console.error(err);   
        const errorMessage = validateResErrors(err, "Ошибка при применении изменений");
        alert(errorMessage, true);
      }
    },
    [id, quantity, discount, run, guardQty, alert]
  );

  const addOne = useCallback(
    async (productId) => {
      const current = getCartQtyById(productId);
      if (!guardQty(productId, current + 1)) return;
      try {
        await run(manualFilling({ id, productId }));
        await run(startSale(undefined as any));
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        const errorMessage = validateResErrors(err, "Ошибка при добавлении товара");
        alert(errorMessage, true);
      }
    },
    [id, run, guardQty, getCartQtyById, alert]
  );

  const changeQtyOrRemove = useCallback(
    async (item) => {
      const qty = Number(item?.quantity ?? 0);
      try {
        if (qty > 1) {
          await run(
            updateProductInCart({
              id,
              productId: item.id,
              data: { quantity: qty - 1 },
            })
          );
        } else {
          await run(deleteProductInCart({ id, productId: item.id }));
        }
        await run(startSale(undefined as any));
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        console.error(err);
        const errorMessage = validateResErrors(err, "Ошибка при обновлении корзины");
        alert(errorMessage, true);
      }
    },
    [id, run, alert]
  );

  const updateItemQuantity = useCallback(
    async (item, newQuantity) => {
      const qty = Number(newQuantity);
      if (qty <= 0) {
        try {
          await run(deleteProductInCart({ id, productId: item.id }));
          await run(startSale(undefined as any));
          setEditingQuantity({ id: null, value: "" });
        } catch (err: any) {
          const parsed = parseStockError(err);
          if (parsed) {
            alert(
              `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
            );
            return;
          }
          console.error(err);
          const errorMessage = validateResErrors(err, "Ошибка при удалении позиции");
          alert(errorMessage, true);
        }
        return;
      }
      try {
        await run(
          updateProductInCart({
            id,
            productId: item.id,
            data: { quantity: qty },
          })
        );
        await run(startSale(undefined as any));
        setEditingQuantity({ id: null, value: "" });
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        console.error(err);
        const errorMessage = validateResErrors(err, "Ошибка при обновлении количества");
        alert(errorMessage, true);
      }
    },
    [id, run, alert]
  );

  const createClient = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const created = await run(createClientAsync(newClient));
        await dispatch(fetchClientsAsync(undefined as any));
        if (created?.id != null) setClientId(String(created.id));
        setPhone(created?.phone || newClient.phone || "");
        setShowCreateClient(false);
      } catch (err: any) {
        const errorMessage = validateResErrors(err, "Ошибка при создании клиента");
        alert(errorMessage, true);
      }
    },
    [newClient, run, dispatch, alert]
  );

  const addCustomService = useCallback(
    async (e) => {
      e.preventDefault();
      if (!customService.name.trim() || !customService.price) {
        alert("Заполните название и цену услуги");
        return;
      }
      try {
        await run(
          addCustomItem({
            id,
            name: customService.name,
            price: customService.price,
            quantity: customService.quantity,
          })
        );
        await run(startSale(undefined as any));
        setCustomService({ name: "", price: "", quantity: 1 });
        setShowServices(false);
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        console.error(err);
        const errorMessage = validateResErrors(err, "Ошибка при добавлении услуги");
        alert(errorMessage, true);
      }
    },
    [customService, id, run, alert]
  );

  const performCheckout = useCallback(
    async (withReceipt) => {
      try {
        if (debt === "Долги") {
          if (!clientId) return alert("Выберите клиента");
          if (!dueDate && company.subscription_plan.name === "Старт")
            return alert("Выберите дату");
          if (!phone && company.subscription_plan.name === "Старт")
            return alert("Введите номер телефона");
          if (company.subscription_plan.name === "Старт") {
            await createDebt({
              name: pickClient?.full_name,
              phone,
              due_date: dueDate,
              amount: start?.total,
            });
          }
        }

        if (clientId) {
          await dispatch(
            createDeal({
              clientId: clientId,
              title: `${debt || "Продажа"} ${pickClient?.full_name}`,
              statusRu: debt,
              amount: start?.total as any,
              prepayment: debt === "Предоплата" ? Number(amount) : undefined,
              debtMonths:
                debt === "Долги" || debt === "Предоплата"
                  ? Number(debtMonths)
                  : undefined,
            })
          ).unwrap();
        }

        const result = await run(
          productCheckout({
            id: start?.id as any,
            bool: withReceipt,
            clientId,
            ...buildPosRoutingFromUser(profile, company),
          })
        );

        if (debt !== "Долги") {
          await postCashflowIfNeeded(
            dispatch,
            {
              type: cashData.type,
              name: cashData.name === "" ? "Продажа" : cashData.name,
              amount: debt === "Предоплата" ? amount : start!.total,
              source_cashbox_flow_id: start!.id,
            },
            { warnOnFailure: true, failureContext: "sale" },
          );
        }

        if (withReceipt && result?.sale_id) {
          const checkoutRes = await run(getProductCheckout(result.sale_id));
          try {
            await handleCheckoutResponseForPrinting(checkoutRes);
          } catch (e: any) {
            console.error("Печать чека не удалась:", e);
            alert(
              "Не удалось распечатать чек. Проверьте WinUSB и формат ответа (JSON/PDF)."
            );
          }

          const invoiceRes = await run(getProductInvoice(result.sale_id));
          if (invoiceRes instanceof Blob) {
            const url2 = URL.createObjectURL(invoiceRes);
            const a2 = document.createElement("a");
            a2.href = url2;
            a2.download = "invoice.pdf";
            a2.click();
            URL.revokeObjectURL(url2);
          }
        }

        dispatch(historySellProduct(undefined as any));
        onClose();
      } catch (err: any) {
        const parsed = parseStockError(err);
        if (parsed) {
          alert(
            `Недостаточно на складе: «${parsed.name}».\nНужно ${parsed.need}, доступно ${parsed.available}.`
          );
          return;
        }
        console.error(err);
        const errorMessage = validateResErrors(err, "Ошибка при оформлении продажи");
        alert(errorMessage, true);
      }
    },
    [
      debt,
      clientId,
      phone,
      pickClient?.full_name,
      start?.total,
      start?.id,
      cashData,
      run,
      dispatch,
      onClose,
      amount,
      debtMonths,
      dueDate,
      company?.subscription_plan?.name,
      alert,
    ]
  );

  const debouncedSearch1 = useDebounce((v) => {
    dispatch(startSale(v.length === 0 ? 0 : v));
  }, 800);
  const onChange = (e) => debouncedSearch1(e.target.value);

  useEffect(() => {
    dispatch(doSearch({ search: "" }));
  }, [activeTab, dispatch]);

  useEffect(() => {
    dispatch(getProfile(undefined as any));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchClientsAsync(undefined as any));
    dispatch(fetchAgentProductsAsync(undefined as any));
  }, [dispatch]);

  useEffect(() => {
    if (!profile) return;
    dispatch(
      fetchTransfersAsync(
        (profile?.role === "owner" ? {} : { agent: profile?.id }) as any
      )
    );
  }, [dispatch, profile]);

  // авто-подключение USB на монтировании
  useEffect(() => {
    attachUsbListenersOnce();
    ensureUsbReadyAuto().catch(() => {});
  }, []);

  const isOutOfStock = useCallback(
    (p: any) =>
      Number(
        p?.qty_on_hand ?? p?.qty_on_agent ?? p?.quantity ?? p?.stock ?? 0
      ) <= 0,
    []
  );

  const handleTabClick = useCallback((index: any) => {
    setActiveTab(index);
    setIsTabSelected(true);
  }, []);

  const tabs = useMemo(
    () => [
      {
        label: "Сканировать",
        content: <BarcodeScanner id={id} />,
        option: "scan",
      },
      {
        label: "Вручную",
        content: (
          <ManualList
            items={filteredItems}
            inline={inline}
            quantity={quantity}
            discount={discount}
            onSearch={onSearch}
            setQuantity={setQuantity}
            setDiscount={setDiscount}
            saveInline={saveInline}
            setInline={setInline}
            addOne={addOne}
            isOutOfStock={isOutOfStock}
          />
        ),
        option: "manually",
      },
    ],
    [
      id,
      filteredItems,
      inline,
      quantity,
      discount,
      onSearch,
      saveInline,
      addOne,
      isOutOfStock,
    ]
  );

  return (
    <div className="add-modal sell">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Продажа товара</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {company?.sector?.name !== "Магазин" ? (
          <ManualList
            items={sellData}
            inline={inline}
            quantity={quantity}
            discount={discount}
            onSearch={onSearch}
            setQuantity={setQuantity}
            setDiscount={setDiscount}
            saveInline={saveInline}
            setInline={setInline}
            addOne={addOne}
            isOutOfStock={isOutOfStock}
          />
        ) : (
          <>
            {tabs.map((tab, index) => (
              <button
                className={`add-modal__button  ${
                  activeTab === index && isTabSelected
                    ? "add-modal__button-active"
                    : ""
                }`}
                key={index}
                onClick={() => handleTabClick(index)}
              >
                {tab.label}
              </button>
            ))}
            {isTabSelected && activeTab !== null && (
              <div className="add-modal__container">
                {tabs[activeTab].content}
              </div>
            )}
          </>
        )}

        {!!start?.items?.length && (
          <div className="receipt">
            {location.pathname !== "/crm/production/agents" && (
              <>
                <button
                  className="create-client receipt__add"
                  onClick={() => setShowServices(true)}
                  type="button"
                >
                  Доп. Услуги <Plus />
                </button>
                {showServices && (
                  <form
                    className="receipt__services"
                    onSubmit={addCustomService}
                  >
                    <input
                      type="text"
                      className="add-modal__input one"
                      placeholder="Название услуги"
                      name="name"
                      value={customService.name}
                      onChange={onCustomServiceChange}
                      required
                    />
                    <input
                      type="number"
                      className="add-modal__input two"
                      placeholder="Цена"
                      name="price"
                      value={customService.price}
                      onChange={onCustomServiceChange}
                      min="0"
                      step="0.01"
                      required
                    />
                    <input
                      type="number"
                      className="add-modal__input"
                      placeholder="Количество"
                      name="quantity"
                      value={customService.quantity}
                      onChange={onCustomServiceChange}
                      min="1"
                      style={{ width: "100px" }}
                    />
                    <button type="submit" className="add-modal__button reBtn">
                      <Plus />
                    </button>
                  </form>
                )}
              </>
            )}
            <h2 className="receipt__title">Приход</h2>

            <ClientBlock
              company={company}
              filterClient={filterClient}
              clientId={clientId}
              setClientId={setClientId}
              showCreateClient={showCreateClient}
              setShowCreateClient={setShowCreateClient}
              newClient={newClient}
              onNewClientChange={onNewClientChange}
              createClient={createClient}
            />
            {paymentBlockMemo(
              company?.sector?.name,
              debt,
              phone,
              setDebt,
              setPhone,
              amount,
              setAmount,
              debtMonths,
              setDebtMonths,
              dueDate,
              setDueDate
            )}

            {start.items.map((p, idx) => (
              <div className="receipt__item" key={p.id ?? idx}>
                <p className="receipt__item-name">
                  {idx + 1}. {p.product_name ?? p.display_name}
                </p>
                <div>
                  <p>{p.tax_total}</p>
                  <p className="receipt__item-price">
                    {editingQuantity.id === p.id ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="number"
                          value={editingQuantity.value}
                          onChange={(e) =>
                            setEditingQuantity({
                              id: p.id,
                              value: e.target.value,
                            })
                          }
                          min="0"
                          style={{
                            width: "60px",
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(p, editingQuantity.value)
                          }
                          style={{
                            padding: "4px 8px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingQuantity({ id: null, value: "" })
                          }
                          style={{
                            padding: "4px 8px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>
                          {p.quantity} x {p.unit_price} ≡{" "}
                          {/* quantity/unit_price из API иногда строки — раньше
                              "2" * "10" молча работало как умножение через
                              неявный JS-каст, но при не-числовой строке дало
                              бы NaN без явного Number(...). Не баг поведения,
                              просто типобезопасно. */}
                          {Number(p.quantity) * Number(p.unit_price ?? 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingQuantity({
                              id: p.id,
                              value: p.quantity.toString(),
                            })
                          }
                          style={{
                            padding: "4px 8px",
                            background: "#ffd600",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => changeQtyOrRemove(p)}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    )}
                  </p>
                </div>
              </div>
            ))}

            <button
              className="create-client"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={() => setShowDiscount(!showDiscount)}
            >
              {showDiscount ? "Отменить" : "Добавить общую скидку"}
            </button>
            {showDiscount && (
              <div className="receipt__discount">
                <input
                  type="text"
                  onChange={onChange}
                  className="add-modal__input"
                  placeholder="Сумма скидки"
                />
              </div>
            )}

            <div className="receipt__total">
              <b>ИТОГО</b>
              <div style={{ gap: 10, display: "flex", alignItems: "center" }}>
                <p>Общая скидка {start?.discount_total}</p>
                <p>Налог {start?.tax_total}</p>
                <b>≡ {start?.total}</b>
              </div>
            </div>

            <div className="receipt__row">
              <button
                className="receipt__row-btn"
                onClick={() => performCheckout(true)}
                type="button"
              >
                Печать чека
              </button>
              <button
                className="receipt__row-btn"
                onClick={() => performCheckout(false)}
                type="button"
              >
                Без чека
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellModal;

