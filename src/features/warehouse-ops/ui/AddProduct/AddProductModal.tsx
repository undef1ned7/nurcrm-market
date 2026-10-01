import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { postCashflowIfNeeded } from "@entities/cash";
import { buildExpenseVariableRouting } from "@shared/lib/tools/cashboxResolution";
import {
  useRecordShiftDrawerOutflow,
  useShiftDrawerFundingTarget,
} from "@entities/shift";
import { useUser } from "@entities/user";
import { useClient } from "@entities/client";
import { fetchClientsAsync } from "@entities/client";
import { updateProductAsync } from "@entities/product";
import { createDeal } from "@entities/sale";
import { useAlert } from "@shared/hooks/useDialog";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import "./AddProductModal.scss";
import { validateResErrors } from "@shared/lib/tools/validateResErrors"
import api from "@shared/api";
import { useAppDispatch } from "@app/store";

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const DECIMAL_QTY_PATTERN = /^\d*([.,]\d*)?$/;
const INTEGER_QTY_PATTERN = /^\d*$/;

// Не через toISOString(): для UTC+6 (Бишкек) это всегда день назад
// (см. docs/sale-flow-bugs.md, пункт 4) — считаем по локальным Y/M/D.
const getTodayIsoDate = () => {
  const now = new Date();
  const pad2 = (v: number) => String(v).padStart(2, "0");
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const AddProductModal = ({ onClose, onChanged, item }: any) => {
  const alert = useAlert();
  const dispatch = useAppDispatch();
  const { company } = useUser();
  const { list: clients } = useClient();
  const shiftDrawerFundingTarget = useShiftDrawerFundingTarget();
  const recordShiftDrawerOutflow = useRecordShiftDrawerOutflow();

  // если item не передан — блокируем форму
  const itemId = item?.id;
  const itemName = item?.name ?? "—";
  const isWeightProduct = Boolean(item?.is_weight);
  const unitLabel = item?.unit || "шт";

  const [qty, setQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(
    item?.purchase_price != null ? String(item.purchase_price) : ""
  );
  const [retailPrice, setRetailPrice] = useState(
    item?.price != null ? String(item.price) : ""
  );
  const [selectedSupplier, setSelectedSupplier] = useState(
    item?.client || ""
  );
  const [paymentType, setPaymentType] = useState("full");
  const [debtMonths, setDebtMonths] = useState("1");
  const [prepayment, setPrepayment] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState(getTodayIsoDate());
  const [error, setError] = useState("");
  const [paidFromShiftDrawer, setPaidFromShiftDrawer] = useState(false);

  // Фильтруем поставщиков из списка клиентов
  const suppliers = useMemo(
    () => clients.filter((client) => client.type === "suppliers"),
    [clients]
  );
  const supplierMeta = useMemo(
    () =>
      suppliers.find((supplier) => String(supplier.id) === String(selectedSupplier)),
    [suppliers, selectedSupplier]
  );

  const stockQty = useMemo(() => toNum(item?.quantity), [item]);

  // const q = toNum(qty);
  // const pp = toNum(purchasePrice);
  // const rp = toNum(retailPrice);
  const { q, pp, rp } = useMemo(() => ({
    q: toNum(qty),
    pp: toNum(purchasePrice),
    rp: toNum(retailPrice)
  }),
    [qty, purchasePrice, retailPrice]);

  const expense = useMemo(() => +(q * pp).toFixed(2), [q, pp]);

  useEffect(() => {
    dispatch(fetchClientsAsync({} as any) as any);
  }, [dispatch]);

  const handleQtyChange = (value) => {
    const nextValue = String(value ?? "");
    const pattern = isWeightProduct ? DECIMAL_QTY_PATTERN : INTEGER_QTY_PATTERN;
    if (nextValue && !pattern.test(nextValue)) return;
    setQty(nextValue);
  };

  const validate = () => {
    if (!itemId) return "Нет выбранного товара.";
    if (!String(qty).trim()) return "Введите количество";
    if (!q) return "Введите количество";
    if (q <= 0) return "Количество должно быть больше 0";
    if (!isWeightProduct && !Number.isInteger(q)) {
      return "Количество должно быть целым числом";
    }
    if (pp < 0) return "Введите корректную закупочную цену";
    if (!rp || rp <= 0) return "Введите корректную розничную цену";
    if (selectedSupplier && (paymentType === "debt" || paymentType === "prepayment")) {
      if (!debtMonths || Number(debtMonths) <= 0) {
        return "Укажите срок долга";
      }
      if (!firstPaymentDate) {
        return "Укажите дату первой оплаты";
      }
    }
    if (selectedSupplier && paymentType === "prepayment") {
      const prepaymentValue = toNum(prepayment);
      if (prepaymentValue <= 0) return "Укажите сумму предоплаты";
      if (prepaymentValue > expense) {
        return "Предоплата не может быть больше общей суммы";
      }
    }
    return "";
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setError("");
    try {
      const cashAmount =
        paymentType === "debt"
          ? 0
          : paymentType === "prepayment"
            ? toNum(prepayment)
            : expense;

      let receiptId: any = null;

      if (selectedSupplier) {
        // Поставщик указан — это приход от поставщика. Заводим через тот же
        // эндпоинт, что и «Приход от поставщика», чтобы партия попала в
        // «Историю закупок» товара. Остаток и purchase_price/наценку считает бэк.
        const { data: receiptData } = await api.post(
          `/main/suppliers/${encodeURIComponent(selectedSupplier)}/receipt/`,
          {
            items: [{ product: itemId, qty: q, purchase_price: pp }],
            payment_type:
              paymentType === "debt"
                ? "debt"
                : paymentType === "prepayment"
                  ? "prepayment"
                  : "cash",
            ...(paymentType === "full" || paymentType === "prepayment"
              ? buildExpenseVariableRouting()
              : {}),
          },
        );
        receiptId = receiptData?.id ?? receiptData?.uuid ?? null;

        // Приход не принимает розничную цену (её пересчитывает наценка на бэке) —
        // явно фиксируем то, что ввёл пользователь в форме, отдельным PATCH.
        try {
          await dispatch(
            updateProductAsync({
              productId: itemId,
              updatedData: { price: rp, client: selectedSupplier },
            }),
          ).unwrap();
        } catch (priceError: any) {
          console.error(
            "Товар оприходован, но не удалось обновить розничную цену:",
            priceError,
          );
        }
      } else {
        // Без поставщика — прежнее поведение: прямая корректировка остатка и цен.
        await dispatch(
          updateProductAsync({
            productId: itemId,
            updatedData: {
              quantity: stockQty + q,
              purchase_price: pp,
              price: rp,
              client: null,
            },
          }),
        ).unwrap();
      }

      if (selectedSupplier && paymentType !== "full") {
        const prepaymentValue = toNum(prepayment);
        const remainingDebt =
          paymentType === "prepayment"
            ? Math.max(0, expense - prepaymentValue)
            : expense;

        if (company?.subscription_plan?.name === "Старт" && remainingDebt > 0) {
          await api.post("/main/debts/", {
            name: supplierMeta?.full_name || supplierMeta?.name || "Поставщик",
            phone: supplierMeta?.phone || "",
            due_date: firstPaymentDate,
            amount: remainingDebt,
          });
        }

        await dispatch(
          createDeal({
            clientId: selectedSupplier,
            title: `${paymentType === "prepayment" ? "Предоплата" : "Долги"} ${supplierMeta?.full_name || itemName}`,
            statusRu: paymentType === "prepayment" ? "Предоплата" : "Долги",
            amount: expense,
            prepayment: paymentType === "prepayment" ? prepaymentValue : undefined,
            debtMonths: Number(debtMonths || 1),
            first_due_date: firstPaymentDate,
          })
        ).unwrap();
      }

      // Legacy fallback: бэк создаёт cashflow при VITE_BE_CASHFLOWS=true
      if (cashAmount > 0) {
        await postCashflowIfNeeded(
          dispatch,
          {
            type: "expense",
            name: `Закупка товара: ${itemName}`,
            amount: cashAmount,
            ...(receiptId != null ? { source_cashbox_flow_id: receiptId } : {}),
            source_business_operation_id: "Закупки",
            status:
              company?.subscription_plan?.name === "Старт"
                ? "approved"
                : "pending",
          },
          { warnOnFailure: true, failureContext: "purchase" },
        );

        if (
          paidFromShiftDrawer &&
          shiftDrawerFundingTarget.available &&
          shiftDrawerFundingTarget.cashboxId
        ) {
          const drawerResult = await recordShiftDrawerOutflow({
            cashboxId: shiftDrawerFundingTarget.cashboxId,
            amount: cashAmount,
            name: `Закупка товара — оплата из кассы смены: ${itemName}`,
          });
          if (!drawerResult.ok) {
            alert(
              "Товар добавлен, но списание из кассы смены не записалось — добавьте вручную в «Касса».",
              true,
            );
          }
        }
      }
      alert('Товар добавлен', () => {
        onChanged?.();
        onClose?.();
      })
    } catch (e: any) {
      const errorMessage = validateResErrors(e, "Не удалось сохранить. Попробуйте ещё раз.");
      alert(errorMessage, true)
    }
  };

  const disabled = !!validate();

  return (
    <ReactPortal wrapperId="add-product-modal">
      <div className="add-modal sklad-add-product-modal">
        <div className="add-modal__overlay" onClick={onClose} />
        <div
          className="add-modal__content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-product-title"
        >
        <div className="add-modal__header">
          <h3 id="add-product-title">Добавление товара</h3>
          <button
            type="button"
            className="add-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form className="sklad-add-product-modal__form" onSubmit={onFormSubmit}>
          <div className="sklad-add-product-modal__card">
            <div className="sklad-add-product-modal__title">
              Товар: <span className="sklad-add-product-modal__titleName">{itemName}</span>
            </div>
          {!!itemId && (
              <div className="sklad-add-product-modal__meta">
              В наличии сейчас: <b>{stockQty}</b> {unitLabel}
            </div>
          )}
          </div>

          <div className="add-modal__section">
            <label htmlFor="add-product-qty">Количество</label>
            <input
              id="add-product-qty"
              type="text"
              name="qty"
              placeholder="Количество"
              className="add-modal__input"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              inputMode={isWeightProduct ? "decimal" : "numeric"}
              disabled={!itemId}
            />
          </div>

          <div className="sklad-add-product-modal__grid">
            <div className="add-modal__section">
              <label htmlFor="add-product-purchasePrice">Закупочная цена</label>
              <input
                id="add-product-purchasePrice"
                type="number"
                name="purchasePrice"
                placeholder="Закупочная (за 1 шт.)"
                className="add-modal__input"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                min={0}
                step="0.01"
                inputMode="decimal"
                disabled={!itemId}
              />
            </div>

            <div className="add-modal__section">
              <label htmlFor="add-product-retailPrice">Розничная цена</label>
              <input
                id="add-product-retailPrice"
                type="number"
                name="retailPrice"
                placeholder="Розничная (за 1 шт.)"
                className="add-modal__input"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                min={0}
                step="0.01"
                inputMode="decimal"
                disabled={!itemId}
              />
            </div>
          </div>

          <div className="add-modal__section">
            <label htmlFor="add-product-supplier">Поставщик</label>
            <select
              id="add-product-supplier"
              className="add-modal__input"
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setPaymentType("full");
                setDebtMonths("1");
                setPrepayment("");
                setFirstPaymentDate(getTodayIsoDate());
                setPaidFromShiftDrawer(false);
              }}
              disabled={!itemId}
            >
              <option value="">Выберите поставщика</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.full_name || supplier.name}
                </option>
              ))}
            </select>
            <p className="sklad-add-product-modal__meta">
              {selectedSupplier
                ? "Партия появится в «Истории закупок» товара."
                : "Без поставщика операция только скорректирует остаток и цены — в «Историю закупок» не попадёт."}
            </p>
          </div>

          {selectedSupplier && (
            <>
              <div className="add-modal__section">
                <label>Тип оплаты</label>
                <select
                  className="add-modal__input"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="full">Полная оплата</option>
                  <option value="prepayment">Предоплата</option>
                  <option value="debt">В долг</option>
                </select>
              </div>

              {(paymentType === "debt" || paymentType === "prepayment") && (
                <>
                  {paymentType === "prepayment" && (
                    <div className="add-modal__section">
                      <label>Предоплата</label>
                      <input
                        className="add-modal__input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={prepayment}
                        onChange={(e) => setPrepayment(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="add-modal__section">
                    <label>Срок долга (мес.)</label>
                    <input
                      className="add-modal__input"
                      type="number"
                      min={1}
                      step={1}
                      value={debtMonths}
                      onChange={(e) => setDebtMonths(e.target.value)}
                    />
                  </div>

                  <div className="add-modal__section">
                    <label>Дата первой оплаты</label>
                    <input
                      className="add-modal__input"
                      type="date"
                      value={firstPaymentDate}
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* касса автоматически выбирается - скрыто от пользователя */}

          {paymentType !== "debt" && shiftDrawerFundingTarget.available && (
            <div className="add-modal__section">
              <label className="sklad-add-modal__checkboxRow">
                <input
                  type="checkbox"
                  checked={paidFromShiftDrawer}
                  onChange={(e) => setPaidFromShiftDrawer(e.target.checked)}
                  className="sklad-add-modal__checkbox"
                />
                <strong className="sklad-add-modal__checkboxText">
                  Я заплатил из кассы (ящика) смены
                  {shiftDrawerFundingTarget.cashboxName
                    ? ` — спишется с кассы «${shiftDrawerFundingTarget.cashboxName}»`
                    : ""}
                </strong>
              </label>
            </div>
          )}

          <div className="sklad-add-product-modal__summary">
            <span>Итог к списанию</span>
            <b>
              {Number.isFinite(
                paymentType === "prepayment" ? toNum(prepayment) : paymentType === "debt" ? 0 : expense
              )
                ? paymentType === "prepayment"
                  ? toNum(prepayment)
                  : paymentType === "debt"
                    ? 0
                    : expense
                : 0}
            </b>
          </div>

          {error && (
            <div className="sklad-add-product-modal__error" role="alert">
              {error}
            </div>
          )}

          <div className="sklad-add-product-modal__footer">
            <button
              type="button"
              className="sklad-add-product-modal__cancel"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              className="sklad-add-product-modal__save"
              type="submit"
              disabled={disabled}
            >
              Сохранить
            </button>
          </div>
        </form>
        </div>
      </div>
    </ReactPortal>
  );
};

export default AddProductModal;
