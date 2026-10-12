import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_EXCHANGE_TERM_SETTINGS,
  fetchExchangeTermSettings,
  findNonExchangeableItems,
  formatSaleItemName,
  getExchangeTermStatus,
  historySellProductDetail,
  returnSale,
  saleDateOf,
  saleItemCategoryName,
} from "@entities/sale";
import { useMarketSphere, useUser } from "@entities/user";
import {
  useRecordShiftDrawerOutflow,
  useShiftDrawerFundingTarget,
  useShifts,
} from "@entities/shift";
import {
  buildSaleReturnSignature,
  isReturnableSaleStatus,
  normalizeSaleStatus,
} from "@shared/lib/tools/saleReturn";
import {
  findOwnOpenShiftInList,
  resolveCashierId,
} from "@shared/lib/tools/cashierOpenShift";
import Modal from "@shared/ui/Modal/Modal";
import i18n from "@shared/config/i18n";
import { kindTranslate } from "./sell.constants";

const extractApiError = (errorLike: any): string => {
  // returnSale отклоняется уже готовым текстом (handleThunkError → validateResErrors):
  // у строки нет .data/.message, и без этой ветки причина от сервера терялась.
  if (typeof errorLike === "string" && errorLike.trim()) return errorLike.trim();
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

  return String(
    value || i18n.t("crm.sell.refundModal.errors.generic"),
  );
};

/** Быстрые причины возврата (ТЗ, п. 4.6). «defect» ещё и ставит галочку «Брак». */
export const RETURN_QUICK_REASONS = ["size", "color", "changedMind", "defect"] as const;

const RefundPurchase = ({ onClose, onChanged, item, onExchange }: any) => {
  const { t } = useTranslation();
  const { features: sphereFeatures } = useMarketSphere();
  const dispatch = useDispatch() as any;
  const { currentUser, profile, userId } = useUser();
  const { shifts } = useShifts();
  // Смена текущего кассира — чтобы компенсирующее движение по кассе
  // привязывалось к тому, кто оформил возврат. См. docs/sale-flow-bugs.md, пункт 5.
  const cashierId = useMemo(
    () => resolveCashierId({ currentUser, userId, profile }),
    [currentUser, userId, profile],
  );
  const openShift = useMemo(
    () => findOwnOpenShiftInList(shifts, cashierId),
    [shifts, cashierId],
  );

  const [submitting, setSubmitting] = useState<any>(false);
  const [error, setError] = useState<any>("");
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState<any>(true);
  const [quantities, setQuantities] = useState<any>({});
  const [refundedInCash, setRefundedInCash] = useState<any>(false);
  const [drawerWarning, setDrawerWarning] = useState<any>("");
  const [reason, setReason] = useState("");
  const [isDefect, setIsDefect] = useState(false);
  // Срок/категория «без обмена»: ждём подтверждения «Оформить всё равно?»
  const [pendingReturn, setPendingReturn] = useState<{ items: any[] | null } | null>(null);
  const [termSettings, setTermSettings] = useState(DEFAULT_EXCHANGE_TERM_SETTINGS);

  useEffect(() => {
    if (!sphereFeatures.exchangeTerm) return undefined;
    let cancelled = false;
    fetchExchangeTermSettings().then((value) => {
      if (!cancelled) setTermSettings(value);
    });
    return () => {
      cancelled = true;
    };
  }, [sphereFeatures.exchangeTerm]);

  const isAgent = String(profile?.role || "")
    .trim()
    .toLowerCase() === "agent";

  const shiftDrawerFundingTarget = useShiftDrawerFundingTarget();
  const recordShiftDrawerOutflow = useRecordShiftDrawerOutflow();

  useEffect(() => {
    setQuantities({});
    setError("");
    setRefundedInCash(false);
    setDrawerWarning("");
    setReason("");
    setIsDefect(false);
    setPendingReturn(null);
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
          setError(t("crm.sell.refundModal.errors.loadSaleFailed"));
        }
      } catch (err: any) {
        console.error("Ошибка загрузки данных продажи:", err);
        setError(t("crm.sell.refundModal.errors.loadSaleFailed"));
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
        name: formatSaleItemName(
          saleItem,
          t("crm.sell.refundModal.positionFallback", { number: index + 1 }),
        ),
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
        category: saleItemCategoryName(saleItem),
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

  const termStatus = useMemo(
    () =>
      sphereFeatures.exchangeTerm
        ? getExchangeTermStatus(saleDateOf(currentItem), termSettings.daysLimit)
        : null,
    [sphereFeatures.exchangeTerm, currentItem, termSettings.daysLimit],
  );
  const nonExchangeableNames = useMemo(() => {
    if (!sphereFeatures.exchangeTerm) return [];
    return findNonExchangeableItems(
      saleItems,
      termSettings.nonExchangeableCategories,
      (it: any) => it.category,
    ).map((it: any) => it.name);
  }, [sphereFeatures.exchangeTerm, saleItems, termSettings.nonExchangeableCategories]);

  // Сумма возврата по конкретному набору позиций (используется и для показа
  // в UI, и для суммы ручной записи в кассу смены — считаем от тех же
  // itemsForReturn, что реально ушли в запрос, а не от «живого» стейта на
  // момент ответа сервера).
  const computeItemsRefundAmount = useCallback(
    (items: any) => {
      if (!Array.isArray(items)) return 0;
      return items.reduce((sum: number, entry: any) => {
        const sourceItem = saleItems.find(
          (saleItem: any) => String(saleItem.id) === String(entry.sale_item_id),
        );
        if (!sourceItem) return sum;
        return sum + Number(entry.quantity || 0) * sourceItem.unitPrice;
      }, 0);
    },
    [saleItems],
  );

  const fullRefundAmount = Number(currentItem?.total ?? currentItem?.amount ?? 0) || 0;
  const partialRefundAmount = useMemo(
    () => computeItemsRefundAmount(partialItems),
    [computeItemsRefundAmount, partialItems],
  );

  // Переопределение способа возврата денег показываем только для чека,
  // оплаченного целиком одним безналичным способом — см. границы фикса в
  // документации (split-оплата и «нал → вернули безналом» сознательно не
  // покрыты на фронте, это ждёт поля refund_method на backend).
  //
  // Список безналичных методов открытый: помимо общих "card"/"transfer" чекаут
  // на `/crm/market/cashier` шлёт конкретный банк как payment_method напрямую
  // (mapBankToApiMethod → "mbank" | "optima" | "obank" | "bakai" | "transfer",
  // см. src/pages/cashier/ui/paymentPage.utils.ts). Поэтому вместо белого
  // списка — чёрный: любой способ, кроме cash/debt/split.
  const rawPaymentMethod = String(
    currentItem?.payment_method ?? item?.payment_method ?? "",
  ).trim();
  const isNonCashSingleMethod =
    rawPaymentMethod !== "" &&
    !["cash", "debt", "split"].includes(rawPaymentMethod);
  const cashOverrideRefundAmount =
    partialCount > 0 ? partialRefundAmount : fullRefundAmount;
  const showCashOverride =
    isNonCashSingleMethod &&
    cashOverrideRefundAmount > 0 &&
    shiftDrawerFundingTarget.available;
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
    if (!currentItem?.id) return t("crm.sell.refundModal.errors.saleIdNotFound");
    if (!isReturnableStatus) {
      return t("crm.sell.refundModal.errors.notReturnable");
    }
    return "";
  }, [currentItem?.id, isReturnableStatus, t]);

  const validatePartial = useCallback(() => {
    const commonError = validateCommon();
    if (commonError) return commonError;
    if (partialItems.length === 0) {
      return t("crm.sell.refundModal.errors.noQuantitySpecified");
    }

    for (const partialItem of partialItems) {
      const sourceItem = saleItems.find(
        (saleItem) => String(saleItem.id) === String(partialItem.sale_item_id),
      );
      if (!sourceItem) return t("crm.sell.refundModal.errors.itemNotFound");
      if (partialItem.quantity > sourceItem.quantity) {
        return t("crm.sell.refundModal.errors.exceedsMax", {
          name: sourceItem.name,
          max: sourceItem.quantity,
        });
      }
      if (isAgent && !Number.isInteger(partialItem.quantity)) {
        return t("crm.sell.refundModal.errors.agentIntegerOnly");
      }
    }

    return "";
  }, [isAgent, partialItems, saleItems, t, validateCommon]);

  // Ключ операции возврата: держится стабильным для одного и того же выбора
  // позиций, чтобы повторный клик / ретрай после сетевой ошибки не создал
  // второе компенсирующее движение в кассе на бэке.
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);
  // Синхронный флаг «запрос в полёте»: state submitting обновляется только после
  // рендера, а Enter слушается на window — второй Enter успевал отправить второй POST.
  const inFlightRef = useRef(false);

  // Фокус — в модалку: иначе он остаётся на строке таблицы под ней (в Safari клик
  // по кнопке «Возврат» фокусирует саму строку), и Enter открывает «Детали продажи».
  // Callback-ref, а не useEffect: Modal рисует содержимое через портал, который
  // монтируется позже, и в эффекте родителя элемента ещё нет. Фокус — в следующем
  // кадре: в StrictMode портал пересоздаёт контейнер, и элемент на момент вызова
  // ref может быть ещё не в документе.
  const rootRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    requestAnimationFrame(() => {
      if (el.isConnected && !el.contains(document.activeElement)) {
        el.focus({ preventScroll: true });
      }
    });
  }, []);

  const performReturn = useCallback(
    async (itemsForReturn) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
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
          shiftId: openShift?.id,
          is_defect: isDefect,
          reason,
        };
        if (itemsForReturn?.length) payload.items = itemsForReturn;
        const returnedSale = await dispatch(returnSale(payload)).unwrap();
        idempotencyRef.current = null;

        if (
          refundedInCash &&
          isNonCashSingleMethod &&
          shiftDrawerFundingTarget.available &&
          shiftDrawerFundingTarget.cashboxId
        ) {
          const amountForThisReturn = itemsForReturn?.length
            ? computeItemsRefundAmount(itemsForReturn)
            : fullRefundAmount;
          if (amountForThisReturn > 0) {
            const drawerResult = await recordShiftDrawerOutflow({
              cashboxId: shiftDrawerFundingTarget.cashboxId,
              amount: amountForThisReturn,
              name: t("crm.sell.refundModal.cashOverrideDrawerName", {
                id: String(currentItem?.id || "").slice(0, 8) || "—",
              }),
            });
            if (!drawerResult.ok) {
              setDrawerWarning(t("crm.sell.refundModal.cashOverrideFailed"));
            }
          }
        }

        onChanged?.(returnedSale);
        if (!onChanged) onClose?.();
      } catch (e: any) {
        setError(extractApiError(e));
      } finally {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [
      computeItemsRefundAmount,
      currentItem?.id,
      dispatch,
      fullRefundAmount,
      isDefect,
      isNonCashSingleMethod,
      onChanged,
      onClose,
      openShift?.id,
      reason,
      recordShiftDrawerOutflow,
      refundedInCash,
      shiftDrawerFundingTarget.available,
      shiftDrawerFundingTarget.cashboxId,
      t,
    ],
  );

  // «Одежда»: срок вышел или категория «без обмена» — не запрет, а
  // подтверждение. Брак принимают и позже — его не спрашиваем.
  const needsTermConfirm =
    !isDefect && (Boolean(termStatus?.expired) || nonExchangeableNames.length > 0);

  const startReturn = useCallback(
    async (itemsForReturn: any[] | null) => {
      if (needsTermConfirm) {
        setPendingReturn({ items: itemsForReturn });
        return;
      }
      await (performReturn as any)(itemsForReturn ?? undefined);
    },
    [needsTermConfirm, performReturn],
  );

  const onConfirmFull = useCallback(async () => {
    const validationError = validateCommon();
    if (validationError) {
      setError(validationError);
      return;
    }
    await startReturn(null);
  }, [startReturn, validateCommon]);

  const onConfirmPartial = useCallback(async () => {
    const validationError = validatePartial();
    if (validationError) {
      setError(validationError);
      return;
    }
    await startReturn(partialItems);
  }, [partialItems, startReturn, validatePartial]);

  const confirmPendingReturn = async () => {
    const pending = pendingReturn;
    setPendingReturn(null);
    if (!pending) return;
    await (performReturn as any)(pending.items ?? undefined);
  };

  const applyQuickReason = (key: (typeof RETURN_QUICK_REASONS)[number]) => {
    setReason(t(`crm.sphere.returns.reasons.${key}`));
    if (key === "defect") setIsDefect(true);
    setPendingReturn(null);
  };

  useEffect(() => {
    const onKey = (e: any) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") {
        // Enter на кнопке самой модалки («Отмена» и др.) — это клик по ней, не подтверждение.
        if (e.target?.closest?.("#sell-return-modal button")) return;
        // Перевод строки в причине возврата — не подтверждение.
        if (e.target?.closest?.("#sell-return-modal textarea")) return;
        // Фокус мог остаться на кнопке «Возврат» в таблице под модалкой —
        // не даём Enter нажать её повторно.
        e.preventDefault();
        // Пока чек грузится, кассир ещё не видел позиций и суммы.
        if (loading || submitting || e.repeat || pendingReturn) return;
        if (partialCount > 0) {
          onConfirmPartial();
        } else {
          onConfirmFull();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onConfirmFull, onConfirmPartial, partialCount, loading, submitting, pendingReturn]);

  return (
    <Modal
      open
      onClose={onClose}
      title={t("crm.sell.refundModal.title")}
      className="sellReturnModal"
      contentClassName="sellReturnModal__content"
      wrapperId="sell-return-modal"
    >
      <div className="sellReturn" ref={rootRef} tabIndex={-1}>
        {loading ? (
          <div className="sellReturn__loading">
            <p>{t("crm.sell.refundModal.loading")}</p>
          </div>
        ) : (
          <>
            <p className="sellReturn__lead">
              {t("crm.sell.refundModal.leadBefore")}{" "}
              <b>{t("crm.sell.refundModal.returnAll")}</b>.{" "}
              {t("crm.sell.refundModal.leadAfter")}
            </p>

            <div className="sellReturn__summary">
              <div className="sellReturn__summaryMain">
                <div className="sellReturn__summaryTitle">
                  {currentItem?.client_name ||
                    t("crm.sell.modals.saleDetail.noClient")}
                </div>
                <div className="sellReturn__summaryMeta">
                  {t("crm.sell.refundModal.receiptNumber", {
                    id: String(currentItem?.id || "").slice(0, 8) || "—",
                  })}
                </div>
              </div>
              <div className="sellReturn__summaryGrid">
                <div className="sellReturn__summaryItem">
                  <span>{t("common.status")}</span>
                  <b>{statusLabel}</b>
                </div>
                <div className="sellReturn__summaryItem">
                  <span>{t("common.amount")}</span>
                  <b>{formatMoney(currentItem?.total || currentItem?.amount)} сом</b>
                </div>
                <div className="sellReturn__summaryItem">
                  <span>{t("crm.sell.positions")}</span>
                  <b>{saleItems.length}</b>
                </div>
              </div>
            </div>

            {termStatus && (
              <div
                className={`sellReturn__term${termStatus.expired ? " sellReturn__term--expired" : ""}`}
                role={termStatus.expired ? "alert" : undefined}
              >
                {t("crm.sphere.returns.term", {
                  date: termStatus.saleDate,
                  days: termStatus.daysPassed,
                  limit: termStatus.daysLimit,
                })}
                {termStatus.expired ? ` ${t("crm.sphere.returns.termExpired")}` : ""}
              </div>
            )}
            {nonExchangeableNames.length > 0 && (
              <div className="sellReturn__term sellReturn__term--expired" role="alert">
                {t("crm.sphere.returns.nonExchangeable", {
                  names: nonExchangeableNames.join(", "),
                })}
              </div>
            )}

            {showCashOverride && (
              <label className="sellReturn__cashOverride">
                <input
                  type="checkbox"
                  checked={refundedInCash}
                  onChange={(e: any) => setRefundedInCash(e.target.checked)}
                  disabled={submitting}
                />
                <span>
                  {t("crm.sell.refundModal.cashOverrideLabel")}
                  {shiftDrawerFundingTarget.cashboxName
                    ? ` — ${t("crm.sell.refundModal.cashOverrideCashbox", {
                        name: shiftDrawerFundingTarget.cashboxName,
                      })}`
                    : ""}
                </span>
              </label>
            )}

            {saleItems.length > 0 && (
              <div className="sellReturn__items">
                <div className="sellReturn__itemsHead">
                  <span>{t("crm.sell.refundModal.colPosition")}</span>
                  <span>{t("crm.sell.refundModal.colMaxReturn")}</span>
                  <span>{t("crm.sell.refundModal.colReturn")}</span>
                </div>

                {saleItems.map((saleItem: any) => (
                  <div key={saleItem.id} className="sellReturn__itemRow">
                    <div className="sellReturn__itemInfo">
                      <div className="sellReturn__itemName">{saleItem.name}</div>
                      <div className="sellReturn__itemMeta">
                        {formatMoney(saleItem.unitPrice)} сом x {saleItem.quantity}
                        {saleItem.returnedQuantity > 0 && (
                          <>
                            {" · "}
                            {t("crm.sell.refundModal.returnedOfSold", {
                              returned: saleItem.returnedQuantity,
                              sold: saleItem.soldQuantity,
                            })}
                          </>
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
                {t("crm.sell.refundModal.agentPartialHint")}
              </div>
            )}

            <div className="sellReturn__reason">
              <div className="sellReturn__reasonChips" role="group" aria-label={t("crm.sphere.returns.quickReasons")}>
                {RETURN_QUICK_REASONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`sellReturn__chip${key === "defect" ? " sellReturn__chip--defect" : ""}`}
                    onClick={() => applyQuickReason(key)}
                    disabled={submitting}
                  >
                    {t(`crm.sphere.returns.reasons.${key}`)}
                  </button>
                ))}
              </div>
              <label className="sellReturn__reasonField">
                <span>{t("crm.sphere.returns.reasonLabel")}</span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("crm.sphere.returns.reasonPlaceholder")}
                  disabled={submitting}
                />
              </label>
              <label className="sellReturn__defect">
                <input
                  type="checkbox"
                  checked={isDefect}
                  onChange={(e) => {
                    setIsDefect(e.target.checked);
                    setPendingReturn(null);
                  }}
                  disabled={submitting}
                />
                <span>{t("crm.sphere.returns.defectLabel")}</span>
              </label>
            </div>

            {pendingReturn && (
              <div className="sellReturn__confirm" role="alertdialog" aria-label={t("crm.sphere.returns.confirmTitle")}>
                <p>
                  {nonExchangeableNames.length > 0
                    ? t("crm.sphere.returns.confirmNonExchangeable")
                    : t("crm.sphere.returns.confirmExpired")}
                </p>
                <div className="sellReturn__confirmActions">
                  <button
                    type="button"
                    className="nur-btn nur-btn--secondary nur-btn--sm"
                    onClick={() => setPendingReturn(null)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="nur-btn nur-btn--danger nur-btn--sm"
                    onClick={confirmPendingReturn}
                    disabled={submitting}
                  >
                    {t("crm.sphere.returns.confirmAnyway")}
                  </button>
                </div>
              </div>
            )}

            {error && <div className="sellReturn__error">{error}</div>}
            {drawerWarning && (
              <div className="sellReturn__error sellReturn__error--warning">
                {drawerWarning}
              </div>
            )}

            <div className="sellReturn__actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary sellReturn__btn"
                onClick={onClose}
                disabled={submitting || loading}
              >
                {t("common.cancel")}
              </button>

              {onExchange && sphereFeatures.exchange && (
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary sellReturn__btn"
                  onClick={() => onExchange(currentItem)}
                  disabled={submitting || loading || !isReturnableStatus}
                >
                  {t("crm.sphere.exchange.button")}
                </button>
              )}

              <button
                type="button"
                className="nur-btn nur-btn--primary sellReturn__btn"
                onClick={onConfirmFull}
                disabled={submitting || loading || !isReturnableStatus}
              >
                {submitting && partialCount === 0
                  ? t("crm.sell.refundModal.submitting")
                  : t("crm.sell.refundModal.returnAll")}
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
                  ? t("crm.sell.refundModal.submitting")
                  : `${t("crm.sell.refundModal.partialReturn")}${partialCount > 0 ? ` (${partialCount})` : ""}`}
              </button>
            </div>

            <div className="sellReturn__hint">
              {t("crm.sell.refundModal.shortcutHint")}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RefundPurchase;
