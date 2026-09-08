import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  historySellProductDetail,
  returnSale,
} from "@entities/sale";
import { useUser } from "@entities/user";
import {
  buildSaleReturnSignature,
  isReturnableSaleStatus,
  normalizeSaleStatus,
} from "@shared/lib/tools/saleReturn";
import Modal from "@shared/ui/Modal/Modal";
import { kindTranslate } from "./sell.constants";

const extractApiError = (errorLike: any) => {
  const value =
    errorLike?.data?.detail ??
    errorLike?.data?.message ??
    errorLike?.data ??
    errorLike?.message;

  if (Array.isArray(value)) {
    return value.map((item: any) => extractApiError(item)).join(", ");
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .flatMap((item: any) => (Array.isArray(item) ? item : [item]))
      .map((item: any) => extractApiError(item))
      .filter(Boolean)
      .join(", ");
  }

  return String(value || "Не удалось выполнить возврат. Попробуйте ещё раз.");
};

const RefundPurchase = ({ onClose, onChanged, item }: any) => {
  const dispatch = useDispatch() as any;
  const { profile } = useUser();

  const [submitting, setSubmitting] = useState<any>(false);
  const [error, setError] = useState<any>("");
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState<any>(true);
  const [quantities, setQuantities] = useState<any>({});

  const isAgent = String(profile?.role || "")
    .trim()
    .toLowerCase() === "agent";

  useEffect(() => {
    setQuantities({});
    setError("");
  }, [item?.id]);

  useEffect(() => {
    const loadSaleData = async () => {
      if (!item?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await dispatch(historySellProductDetail(item.id));
        if (historySellProductDetail.fulfilled.match(result)) {
          setSaleData(result.payload);
        } else {
          console.error("Ошибка загрузки данных продажи:", result.payload);
          setError("Не удалось загрузить данные о продаже.");
        }
      } catch (err: any) {
        console.error("Ошибка загрузки данных продажи:", err);
        setError("Не удалось загрузить данные о продаже.");
      } finally {
        setLoading(false);
      }
    };

    loadSaleData();
  }, [dispatch, item?.id]);

  const currentItem = saleData || item;

  const saleItems = useMemo(() => {
    if (!Array.isArray(currentItem?.items)) return [];
    return currentItem.items.map((saleItem: any, index: any) => {
      const soldQuantity = Number(saleItem?.quantity ?? saleItem?.qty ?? 0) || 0;
      // Часть могла быть возвращена ранее (sale.status = partially_returned).
      const returnedQuantity =
        Number(
          saleItem?.returned_qty ??
            saleItem?.returned_quantity ??
            saleItem?.refunded_qty ??
            0,
        ) || 0;
      const explicitRemaining =
        saleItem?.returnable_qty ??
        saleItem?.returnable_quantity ??
        saleItem?.available_qty ??
        null;
      const remainingQuantity =
        explicitRemaining != null
          ? Number(explicitRemaining) || 0
          : Math.max(0, soldQuantity - returnedQuantity);
      const unitPrice = Number(saleItem?.unit_price ?? saleItem?.price ?? 0) || 0;
      return {
        id: saleItem?.id ?? saleItem?.sale_item_id ?? `sale-item-${index}`,
        name:
          saleItem?.name_snapshot ??
          saleItem?.name ??
          saleItem?.product_name ??
          saleItem?.display_name ??
          saleItem?.object_name ??
          `Позиция ${index + 1}`,
        quantity: remainingQuantity,
        soldQuantity,
        returnedQuantity,
        unitPrice,
        total:
          Number(
            saleItem?.line_total ??
              saleItem?.total ??
              remainingQuantity * unitPrice,
          ) || 0,
        unit: saleItem?.unit ?? saleItem?.unit_name ?? "шт",
      };
    });
  }, [currentItem]);

  const partialItems = useMemo(() => {
    return saleItems
      .map((saleItem: any) => {
        const rawValue = String(quantities[saleItem.id] ?? "").trim().replace(",", ".");
        if (!rawValue) return null;
        const quantity = Number(rawValue);
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        return {
          sale_item_id: saleItem.id,
          quantity,
        };
      })
      .filter(Boolean);
  }, [quantities, saleItems]);

  const partialCount = partialItems.length;
  const isReturnableStatus = isReturnableSaleStatus(currentItem?.status);
  const normalizedStatus = normalizeSaleStatus(currentItem?.status);
  const statusLabel =
    kindTranslate[normalizedStatus as keyof typeof kindTranslate] ||
    normalizedStatus ||
    currentItem?.status ||
    "—";

  const formatMoney = (value: any) =>
    Number(value || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const validateCommon = useCallback(() => {
    if (!currentItem?.id) return "Не найден идентификатор продажи.";
    if (!isReturnableStatus) {
      return "Возврат возможен только для оплаченных, долговых или частично возвращённых продаж.";
    }
    return "";
  }, [currentItem?.id, isReturnableStatus]);

  const validatePartial = useCallback(() => {
    const commonError = validateCommon();
    if (commonError) return commonError;
    if (partialItems.length === 0) {
      return "Укажите количество хотя бы для одной позиции.";
    }

    for (const partialItem of partialItems) {
      const sourceItem = saleItems.find(
        (saleItem) => String(saleItem.id) === String(partialItem.sale_item_id),
      );
      if (!sourceItem) return "Одна из позиций чека не найдена.";
      if (partialItem.quantity > sourceItem.quantity) {
        return `Для "${sourceItem.name}" нельзя вернуть больше ${sourceItem.quantity}.`;
      }
      if (isAgent && !Number.isInteger(partialItem.quantity)) {
        return "Для агентских продаж количество возврата должно быть целым.";
      }
    }

    return "";
  }, [isAgent, partialItems, saleItems, validateCommon]);

  // Ключ операции возврата: держится стабильным для одного и того же выбора
  // позиций, чтобы повторный клик / ретрай после сетевой ошибки не создал
  // второе компенсирующее движение в кассе на бэке.
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  const performReturn = useCallback(
    async (itemsForReturn) => {
      setError("");
      setSubmitting(true);
      try {
        const signature = buildSaleReturnSignature(currentItem.id, itemsForReturn);
        if (idempotencyRef.current?.signature !== signature) {
          idempotencyRef.current = {
            signature,
            key: (globalThis as any)?.crypto?.randomUUID?.() ?? signature,
          };
        }
        const payload: any = {
          saleId: currentItem.id,
          idempotencyKey: idempotencyRef.current.key,
        };
        if (itemsForReturn?.length) payload.items = itemsForReturn;
        const returnedSale = await dispatch(returnSale(payload)).unwrap();
        idempotencyRef.current = null;
        onChanged?.(returnedSale);
        if (!onChanged) onClose?.();
      } catch (e: any) {
        setError(extractApiError(e));
      } finally {
        setSubmitting(false);
      }
    },
    [currentItem?.id, dispatch, onChanged, onClose],
  );

  const onConfirmFull = useCallback(async () => {
    const validationError = validateCommon();
    if (validationError) {
      setError(validationError);
      return;
    }
    await (performReturn as any)();
  }, [performReturn, validateCommon]);

  const onConfirmPartial = useCallback(async () => {
    const validationError = validatePartial();
    if (validationError) {
      setError(validationError);
      return;
    }
    await performReturn(partialItems);
  }, [partialItems, performReturn, validatePartial]);

  useEffect(() => {
    const onKey = (e: any) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") {
        if (partialCount > 0) {
          onConfirmPartial();
        } else {
          onConfirmFull();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onConfirmFull, onConfirmPartial, partialCount]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Возврат продажи"
      className="sellReturnModal"
      contentClassName="sellReturnModal__content"
      wrapperId="sell-return-modal"
    >
      <div className="sellReturn">
        {loading ? (
          <div className="sellReturn__loading">
            <p>Загрузка данных о продаже...</p>
          </div>
        ) : (
          <>
            <p className="sellReturn__lead">
              Для полной отмены нажмите <b>Вернуть весь чек</b>. Если нужен
              частичный возврат, укажите количество только в нужных позициях.
            </p>

            <div className="sellReturn__summary">
              <div className="sellReturn__summaryMain">
                <div className="sellReturn__summaryTitle">
                  {currentItem?.client_name || "Без клиента"}
                </div>
                <div className="sellReturn__summaryMeta">
                  Чек #{String(currentItem?.id || "").slice(0, 8) || "—"}
                </div>
              </div>
              <div className="sellReturn__summaryGrid">
                <div className="sellReturn__summaryItem">
                  <span>Статус</span>
                  <b>{statusLabel}</b>
                </div>
                <div className="sellReturn__summaryItem">
                  <span>Сумма</span>
                  <b>{formatMoney(currentItem?.total || currentItem?.amount)} сом</b>
                </div>
                <div className="sellReturn__summaryItem">
                  <span>Позиций</span>
                  <b>{saleItems.length}</b>
                </div>
              </div>
            </div>

            {saleItems.length > 0 && (
              <div className="sellReturn__items">
                <div className="sellReturn__itemsHead">
                  <span>Позиция</span>
                  <span>Макс. возврат</span>
                  <span>Вернуть</span>
                </div>

                {saleItems.map((saleItem: any) => (
                  <div key={saleItem.id} className="sellReturn__itemRow">
                    <div className="sellReturn__itemInfo">
                      <div className="sellReturn__itemName">{saleItem.name}</div>
                      <div className="sellReturn__itemMeta">
                        {formatMoney(saleItem.unitPrice)} сом x {saleItem.quantity}
                        {saleItem.returnedQuantity > 0 && (
                          <> · возвращено {saleItem.returnedQuantity} из {saleItem.soldQuantity}</>
                        )}
                      </div>
                    </div>
                    <div className="sellReturn__itemAvailable">
                      {saleItem.quantity} {saleItem.unit}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={saleItem.quantity}
                      step={isAgent ? "1" : "0.001"}
                      inputMode="decimal"
                      className="sellReturn__qtyInput"
                      value={quantities[saleItem.id] ?? ""}
                      onChange={(e: any) =>
                        setQuantities((prev: any) => ({
                          ...prev,
                          [saleItem.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}

            {isAgent && saleItems.length > 0 && (
              <div className="sellReturn__hint">
                Для агентских продаж частичный возврат доступен только целым
                количеством.
              </div>
            )}

            {error && <div className="sellReturn__error">{error}</div>}

            <div className="sellReturn__actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary sellReturn__btn"
                onClick={onClose}
                disabled={submitting || loading}
              >
                Отмена
              </button>

              <button
                type="button"
                className="nur-btn nur-btn--primary sellReturn__btn"
                onClick={onConfirmFull}
                disabled={submitting || loading || !isReturnableStatus}
              >
                {submitting && partialCount === 0
                  ? "Оформляем..."
                  : "Вернуть весь чек"}
              </button>

              <button
                type="button"
                className="nur-btn nur-btn--danger sellReturn__btn"
                onClick={onConfirmPartial}
                disabled={
                  submitting || loading || !isReturnableStatus || partialCount === 0
                }
              >
                {submitting && partialCount > 0
                  ? "Оформляем..."
                  : `Частичный возврат${partialCount > 0 ? ` (${partialCount})` : ""}`}
              </button>
            </div>

            <div className="sellReturn__hint">
              Подсказка: Enter — подтвердить, Esc — закрыть.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RefundPurchase;
