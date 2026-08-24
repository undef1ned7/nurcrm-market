import {
  Minus,
  Plus,
  Trash2,
  UserPlus,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import CashierCartsBar from "./CashierCartsBar";
import {
  cartItemUnitLabel,
  formatCartLineNameSuffix,
} from "@shared/lib/tools/marketPackPieceSale";
import { isMarketWarehouseServiceProduct } from "@shared/lib/tools/marketWarehouseFilters";
import { DECIMAL_INPUT_PATTERN } from "../cashierPage.constants";
import {
  calcTotalConsumeForProduct,
  formatCartPromotionRulesLabel,
  formatDiscountPercentFromLine,
  formatPrice,
  formatQuantity,
  getActiveCartPromotionTier,
  isIncompleteDecimalInput,
  normalizePrice,
  normalizeQuantity,
  parseDecimalInput,
  shouldSyncDecimalFieldWhileTyping,
  stripTrailingZerosAfterDecimal,
} from "../cashierPage.utils";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

export function CashierCartPanel({ vm }: Props) {
  const { t } = useTranslation();
  const {
    isCompactCart,
    cartFull,
    setCartFull,
    isDesktopLayout,
    desktopProductsWidth,
    openShiftId,
    multiCart,
    handleSelectCashierCart,
    handleNewCashierCart,
    canMarketDeleteCartItem,
    handleDeleteCashierCart,
    canMarketDiscount,
    canMarketEditPrice,
    setShowCustomerModal,
    setShowDiscountModal,
    setDiscountMode,
    setDiscountValue,
    setShowCustomServiceModal,
    currentSale,
    cart,
    products,
    cancelPendingDiscountLineInput,
    setCartDiscountModes,
    cartDiscountModes,
    setCartDiscounts,
    cartDiscounts,
    patchCartItemDiscount,
    cartPrices,
    setCartPrices,
    priceInputFocusRef,
    patchCartItemPrice,
    discountLimitPercent,
    pendingDiscountLineRef,
    debouncedDiscountApiByLine,
    flushPendingDiscountLine,
    applyDiscountFromRawInput,
    cartRef,
    updateCustomQuantityByDelta,
    updateQuantity,
    cartQtyInputRefs,
    cartQuantities,
    setCartQuantities,
    debouncedQtyApiByLine,
    pendingQtyLineInputRef,
    showAlert,
    shouldSyncQuantityToApiWhileTyping,
    flushPendingQuantityLine,
    suppressQtyBlurUpdateRef,
    qtyInputFocusRef,
    commitCartLineQuantityInput,
    removeCustomFromCart,
    removeFromCart,
    handleCheckout,
    total,
  } = vm;

  return (
    <div
      className={`cashier-page__cart ${isCompactCart && !cartFull ? "cashier-page__cart--compact" : ""}`}
      style={
        isDesktopLayout
          ? cartFull
            ? { flex: "1 1 auto", width: "100%", minWidth: 0 }
            : {
                flex: `${100 - desktopProductsWidth} 1 0`,
                width: 0,
                minWidth: 320,
              }
          : undefined
      }
    >
              {/* Мультикорзина видна и в полноэкранном режиме */}
              {openShiftId && cartFull && (
                <div className="cashier-page__carts-bar-wrap cashier-page__carts-bar-wrap--in-cart">
                  <CashierCartsBar
                    layout="toolbar"
                    alwaysShow
                    carts={multiCart.carts}
                    activeSaleId={multiCart.activeSaleId}
                    switching={multiCart.switching}
                    onSelect={handleSelectCashierCart}
                    onNewCart={handleNewCashierCart}
                    onDelete={
                      canMarketDeleteCartItem ? handleDeleteCashierCart : undefined
                    }
                  />
                </div>
              )}

              <div className="cashier-page__cart-header">
                <h2 className="cashier-page__cart-title">{t("crm.cashier.cart")}</h2>
                <div className="cashier-page__cart-header-actions">
                  <button
                    type="button"
                    className="cashier-page__cart-fullscreen-btn"
                    onClick={() => setCartFull((v) => !v)}
                    title={
                      cartFull
                        ? t("crm.cashier.showProductsList")
                        : t("crm.cashier.expandCartFullscreen")
                    }
                    aria-label={
                      cartFull
                        ? t("crm.cashier.showProductsList")
                        : t("crm.cashier.expandCartFullscreen")
                    }
                    aria-pressed={cartFull}
                  >
                    {cartFull ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    className="cashier-page__cart-customer-btn"
                    onClick={() => setShowCustomerModal(true)}
                  >
                    <UserPlus size={20} />
                  </button>
                </div>
              </div>

              {/* Кнопки для скидки и доп. услуг */}
              <div className="cashier-page__cart-actions">
                {canMarketDiscount && (
                  <button
                    className="cashier-page__cart-action-btn"
                    onClick={() => {
                      // Инициализируем модалку текущими данными
                      if (currentSale?.order_discount_percent) {
                        setDiscountMode("percent");
                        setDiscountValue(
                          String(currentSale.order_discount_percent || ""),
                        );
                      } else {
                        setDiscountMode("amount");
                        setDiscountValue(
                          String(currentSale?.order_discount_total || ""),
                        );
                      }
                      setShowDiscountModal(true);
                    }}
                    title={t("crm.cashier.addOrderDiscount")}
                  >
                    {t("crm.cashier.discount")}
                  </button>
                )}
                <button
                  className="cashier-page__cart-action-btn"
                  onClick={() => setShowCustomServiceModal(true)}
                  title={t("crm.cashier.addExtraServiceTitle")}
                >
                  {t("crm.cashier.extraService")}
                </button>
              </div>

              <div className="cashier-page__cart-items">
                {cart.length === 0 ? (
                  <div className="cashier-page__cart-empty">{t("crm.cashier.cartEmpty")}</div>
                ) : (
                  cart.map((item) => {
                    const cartProduct = item.productId
                      ? products.find((p) => p.id === item.productId)
                      : null;
                    const cartUnitLabel = cartItemUnitLabel(item, cartProduct);
                    // Строка продажи не всегда возвращает is_weight — берём признак
                    // весового товара из карточки товара как запасной вариант,
                    // иначе в инпуте количества нельзя ввести дробное значение.
                    const itemIsWeight =
                      item.isWeight || Boolean(cartProduct?.is_weight);
                    return (
                    <div key={item.id} className="cashier-page__cart-item">
                      <div className="cashier-page__cart-item-main">
                        <div className="cashier-page__cart-item-head">
                          <div className="cashier-page__cart-item-name-wrap">
                            <span className="cashier-page__cart-item-name">
                              {item.name}
                              {formatCartLineNameSuffix(item)}
                            </span>
                            {Array.isArray(item.promotionRules) &&
                              item.promotionRules.length > 0 && (
                                <div className="cashier-page__cart-item-promo">
                                  {(() => {
                                    const tier = getActiveCartPromotionTier(
                                      item.price,
                                      item.quantity,
                                      item.promotionRules,
                                    );
                                    const lineDisc = parseFloat(
                                      item.discountTotal ?? 0,
                                    );
                                    const gross =
                                      (item.price || 0) * (item.quantity || 0);
                                    if (tier) {
                                      const pctLabel = stripTrailingZerosAfterDecimal(
                                        tier.discount_percent,
                                      );
                                      if (lineDisc > 0) {
                                        return (
                                          <span className="cashier-page__cart-item-promo-active">
                                            По акции: −{pctLabel}% (−
                                            {formatPrice(lineDisc)} сом)
                                          </span>
                                        );
                                      }
                                      const previewSom =
                                        (gross * tier.discount_percent) / 100;
                                      return (
                                        <span className="cashier-page__cart-item-promo-warn">
                                          По акции: −{pctLabel}% (до −
                                          {formatPrice(previewSom)} сом к строке)
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="cashier-page__cart-item-promo-hint">
                                        Акция:{" "}
                                        {formatCartPromotionRulesLabel(
                                          item.promotionRules,
                                        )}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                          </div>
                          <div className="cashier-page__cart-item-head-right">
                            {canMarketDiscount && (
                            <div className="cashier-page__cart-item-discount-modes">
                              <button
                                type="button"
                                className={`cashier-page__cart-item-discount-mode-btn ${
                                  (cartDiscountModes[item.id] || "amount") ===
                                  "amount"
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => {
                                  cancelPendingDiscountLineInput(item.id);
                                  const lineTotal =
                                    (item.price || 0) * (item.quantity || 0);
                                  const discountSom = parseFloat(
                                    item.discountTotal ?? 0,
                                  );
                                  const discountToShow =
                                    lineTotal > 0 && discountSom > lineTotal
                                      ? lineTotal
                                      : discountSom;
                                  setCartDiscountModes((prev) => ({
                                    ...prev,
                                    [item.id]: "amount",
                                  }));
                                  setCartDiscounts((prev) => ({
                                    ...prev,
                                    [item.id]: formatPrice(discountToShow),
                                  }));
                                  if (lineTotal > 0 && discountSom > lineTotal) {
                                    patchCartItemDiscount(item, lineTotal);
                                  }
                                }}
                              >
                                сом
                              </button>
                              <button
                                type="button"
                                className={`cashier-page__cart-item-discount-mode-btn ${
                                  cartDiscountModes[item.id] === "percent"
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => {
                                  cancelPendingDiscountLineInput(item.id);
                                  const lineTotal =
                                    (item.price || 0) * (item.quantity || 0);
                                  const discountSom = parseFloat(
                                    item.discountTotal ?? 0,
                                  );
                                  const displayPct = formatDiscountPercentFromLine(
                                    discountSom,
                                    lineTotal,
                                  );

                                  setCartDiscountModes((prev) => ({
                                    ...prev,
                                    [item.id]: "percent",
                                  }));
                                  setCartDiscounts((prev) => ({
                                    ...prev,
                                    [item.id]: displayPct,
                                  }));
                                }}
                              >
                                %
                              </button>
                            </div>
                            )}
                            <span className="cashier-page__cart-item-total">
                              {item.discountTotal > 0 ? (
                                <>
                                  <span
                                    style={{
                                      textDecoration: "line-through",
                                      opacity: 0.7,
                                      marginRight: 6,
                                    }}
                                  >
                                    {Number(
                                      ((item.price || 0) * item.quantity).toFixed(
                                        2,
                                      ),
                                    )}{" "}
                                    сом
                                  </span>
                                  <span>
                                    {Number(
                                      (
                                        (item.price || 0) * item.quantity -
                                        (item.discountTotal || 0)
                                      ).toFixed(2),
                                    )}{" "}
                                    сом
                                  </span>
                                </>
                              ) : (
                                <>
                                  {Number(
                                    (
                                      (item.price || 0) * item.quantity -
                                      (item.discountTotal || 0)
                                    ).toFixed(2),
                                  )}{" "}
                                  сом
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="cashier-page__cart-item-row">
                          <label className="cashier-page__cart-item-field">
                            <span className="cashier-page__cart-item-field-label">
                              Цена{item.salePackage ? ` / ${cartUnitLabel}` : ""}
                            </span>
                            {canMarketEditPrice ? (
                              <input
                                type="text"
                                className="cashier-page__cart-item-price-input"
                                value={
                                  cartPrices[item.id] ?? formatPrice(item.price ?? 0)
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (
                                    v === "" ||
                                    v === "-" ||
                                    DECIMAL_INPUT_PATTERN.test(v)
                                  ) {
                                    setCartPrices((prev) => ({
                                      ...prev,
                                      [item.id]: v,
                                    }));
                                  }
                                }}
                                onFocus={() => {
                                  priceInputFocusRef.current.itemId = String(item.id);
                                }}
                                onBlur={(e) => {
                                  priceInputFocusRef.current.itemId = null;
                                  const v = e.target.value.trim();
                                  const num = parseDecimalInput(v);
                                  const currentPrice = normalizePrice(
                                    parseFloat(item.price ?? 0),
                                  );
                                  if (
                                    v !== "" &&
                                    !isNaN(num) &&
                                    normalizePrice(num) !== currentPrice
                                  ) {
                                    patchCartItemPrice(item, v);
                                  } else {
                                    setCartPrices((prev) => ({
                                      ...prev,
                                      [item.id]: formatPrice(item.price ?? 0),
                                    }));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as any).blur();
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className="cashier-page__cart-item-price-input"
                                value={formatPrice(item.price ?? 0)}
                                readOnly
                                disabled
                              />
                            )}
                          </label>
                          {canMarketDiscount && (
                          <label className="cashier-page__cart-item-field">
                            <span className="cashier-page__cart-item-field-label">
                              Скидка
                              {discountLimitPercent != null
                                ? ` (до ${stripTrailingZerosAfterDecimal(discountLimitPercent)}%)`
                                : ""}
                            </span>
                            <input
                              type="text"
                              className="cashier-page__cart-item-price-input"
                              value={cartDiscounts[item.id] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (
                                  v === "" ||
                                  v === "-" ||
                                  DECIMAL_INPUT_PATTERN.test(v)
                                ) {
                                  setCartDiscounts((prev) => ({
                                    ...prev,
                                    [item.id]: v,
                                  }));
                                  const lineKey = String(item.id);
                                  pendingDiscountLineRef.current.set(lineKey, v);
                                  if (shouldSyncDecimalFieldWhileTyping(v)) {
                                    debouncedDiscountApiByLine.schedule(
                                      lineKey,
                                      () => {
                                        void flushPendingDiscountLine(item.id);
                                      },
                                    );
                                  } else {
                                    debouncedDiscountApiByLine.cancel(lineKey);
                                  }
                                }
                              }}
                              onBlur={async (e) => {
                                const lineKey = String(item.id);
                                debouncedDiscountApiByLine.cancel(lineKey);
                                pendingDiscountLineRef.current.delete(lineKey);
                                const line =
                                  cartRef.current.find((c) => String(c.id) === lineKey) ||
                                  item;
                                await applyDiscountFromRawInput(
                                  line,
                                  e.target.value,
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as any).blur();
                              }}
                            />
                          </label>
                          )}
                          <div className="cashier-page__cart-item-controls">
                            <button
                              type="button"
                              className="cashier-page__cart-item-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                if (item.isCustom)
                                  return updateCustomQuantityByDelta(item, -1);
                                return updateQuantity(item, -1);
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              ref={(node) => {
                                const key = String(item.id);
                                if (node) cartQtyInputRefs.current.set(key, node);
                                else cartQtyInputRefs.current.delete(key);
                              }}
                              type="text"
                              className="cashier-page__cart-item-quantity-input"
                              data-cart-item-id={item.id}
                              data-is-weight={itemIsWeight ? "1" : "0"}
                              value={
                                cartQuantities[item.id] ??
                                formatQuantity(item.quantity || 0)
                              }
                              onChange={(e) => {
                                const lineKey = String(item.id);
                                cancelPendingDiscountLineInput(item.id);
                                const rawValue = e.target.value;
                                if (rawValue === "" || rawValue === "-") {
                                  debouncedQtyApiByLine.cancel(lineKey);
                                  pendingQtyLineInputRef.current.delete(lineKey);
                                  setCartQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: rawValue,
                                  }));
                                  return;
                                }
                                if (itemIsWeight) {
                                  if (!DECIMAL_INPUT_PATTERN.test(rawValue)) {
                                    return;
                                  }
                                } else if (!/^\d+$/.test(rawValue)) {
                                  return;
                                }

                                if (isIncompleteDecimalInput(rawValue)) {
                                  setCartQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: rawValue,
                                  }));
                                  pendingQtyLineInputRef.current.set(
                                    lineKey,
                                    rawValue,
                                  );
                                  debouncedQtyApiByLine.cancel(lineKey);
                                  return;
                                }

                                const value = String(rawValue).replace(",", ".");
                                const numValue = parseFloat(value);
                                if (isNaN(numValue)) {
                                  debouncedQtyApiByLine.cancel(lineKey);
                                  pendingQtyLineInputRef.current.delete(lineKey);
                                  return;
                                }
                                if (!item.isCustom && !item.salePackage) {
                                  const product = products.find(
                                    (p) => p.id === item.productId,
                                  );
                                  if (
                                    product &&
                                    !isMarketWarehouseServiceProduct(product)
                                  ) {
                                    const availableQuantity = parseFloat(
                                      product.quantity || 0,
                                    );
                                    if (
                                      !Number.isFinite(availableQuantity) ||
                                      availableQuantity <= 0 ||
                                      numValue > availableQuantity
                                    ) {
                                      const capped =
                                        availableQuantity > 0
                                          ? availableQuantity
                                          : 0;
                                      setCartQuantities((prev) => ({
                                        ...prev,
                                        [item.id]: String(capped),
                                      }));
                                      showAlert(
                                        "warning",
                                        availableQuantity > 0
                                          ? "Недостаточно товара"
                                          : "Товар отсутствует",
                                        availableQuantity > 0
                                          ? `Доступно только ${availableQuantity} ${product.unit || "шт"}`
                                          : "Товар отсутствует в наличии",
                                      );
                                      const capStr = String(capped);
                                      pendingQtyLineInputRef.current.set(lineKey, capStr);
                                      debouncedQtyApiByLine.schedule(lineKey, () => {
                                        void flushPendingQuantityLine(item.id);
                                      });
                                      return;
                                    }
                                  }
                                }
                                if (!item.isCustom && item.salePackage) {
                                  const product = products.find(
                                    (p) => p.id === item.productId,
                                  );
                                  if (
                                    product &&
                                    !isMarketWarehouseServiceProduct(product)
                                  ) {
                                  const items =
                                    currentSale?.items || currentSale?.cart?.items || [];
                                  const currentItem = items.find(
                                    (el) => el.id === item.itemId,
                                  );
                                  const currentQty = normalizeQuantity(
                                    currentItem?.quantity || 0,
                                  );
                                  const qip = Number(
                                    product?.packages?.find(
                                      (p) => p.id === item.salePackage,
                                    )?.quantity_in_package,
                                  );
                                  if (qip > 0) {
                                    const totalConsume = calcTotalConsumeForProduct(
                                      items,
                                      item.productId,
                                      products,
                                    );
                                    const newTotalConsume =
                                      totalConsume - currentQty / qip + numValue / qip;
                                    const availableQuantity = parseFloat(
                                      product.quantity || 0,
                                    );
                                    if (newTotalConsume > availableQuantity) {
                                      showAlert(
                                        "warning",
                                        "Недостаточно товара",
                                        `Доступно только ${availableQuantity} ${product.unit || "шт"}`,
                                      );
                                      debouncedQtyApiByLine.cancel(lineKey);
                                      pendingQtyLineInputRef.current.delete(lineKey);
                                      return;
                                    }
                                  }
                                  }
                                }
                                if (numValue < 0) {
                                  setCartQuantities((prev) => ({
                                    ...prev,
                                    [item.id]: "0",
                                  }));
                                  pendingQtyLineInputRef.current.set(lineKey, "0");
                                  debouncedQtyApiByLine.cancel(lineKey);
                                  return;
                                }
                                setCartQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: rawValue,
                                }));
                                pendingQtyLineInputRef.current.set(lineKey, rawValue);
                                if (shouldSyncQuantityToApiWhileTyping(rawValue)) {
                                  debouncedQtyApiByLine.schedule(lineKey, () => {
                                    void flushPendingQuantityLine(item.id);
                                  });
                                } else {
                                  debouncedQtyApiByLine.cancel(lineKey);
                                }
                              }}
                              onFocus={(e) => {
                                // Флаг живёт только до blur, который идёт сразу за
                                // Enter/сканом. Если тот blur не случился (строка
                                // перерисовалась), «зависший» флаг молча отменил бы
                                // следующее изменение — снимаем его на фокусе.
                                delete suppressQtyBlurUpdateRef.current[
                                  String(item.id)
                                ];
                                qtyInputFocusRef.current = {
                                  itemId: String(item.id),
                                  prevValue:
                                    cartQuantities[item.id] ??
                                    formatQuantity(item.quantity || 0),
                                };
                                e.target.select();
                              }}
                              onBlur={async (e) => {
                                const lineKey = String(item.id);
                                if (suppressQtyBlurUpdateRef.current[lineKey]) {
                                  delete suppressQtyBlurUpdateRef.current[lineKey];
                                  debouncedQtyApiByLine.cancel(lineKey);
                                  pendingQtyLineInputRef.current.delete(lineKey);
                                  qtyInputFocusRef.current = {
                                    itemId: null,
                                    prevValue: "",
                                  };
                                  return;
                                }
                                await commitCartLineQuantityInput(
                                  item,
                                  e.target.value,
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const lineKey = String(item.id);
                                  // currentTarget обнуляется React'ом сразу после
                                  // обработчика — держим сам узел и значение.
                                  const inputNode = e.currentTarget;
                                  const rawValue = inputNode.value;
                                  suppressQtyBlurUpdateRef.current[lineKey] = true;
                                  void commitCartLineQuantityInput(
                                    item,
                                    rawValue,
                                  ).finally(() => {
                                    inputNode.blur();
                                  });
                                }
                              }}
                              inputMode={itemIsWeight ? "decimal" : "numeric"}
                            />
                            <button
                              type="button"
                              className="cashier-page__cart-item-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                if (item.isCustom)
                                  return updateCustomQuantityByDelta(item, 1);
                                return updateQuantity(item, 1);
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {canMarketDeleteCartItem && (
                            <button
                              type="button"
                              className="cashier-page__cart-item-remove"
                              onClick={() => {
                                if (item.isCustom) return removeCustomFromCart(item);
                                return removeFromCart(item);
                              }}
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="cashier-page__cart-footer">
                  {currentSale?.order_discount_total > 0 && (
                    <div className="cashier-page__cart-discount">
                      <span>Скидка:</span>
                      <span>
                        -{formatPrice(currentSale.order_discount_total || 0)} сом
                      </span>
                    </div>
                  )}
                  <div className="cashier-page__cart-total">
                    <span>Итого:</span>
                    <span>{formatPrice(total)} сом</span>
                  </div>
                  <button
                    type="button"
                    className="cashier-page__checkout-btn"
                    onClick={handleCheckout}
                  >
                    Оплатить {formatPrice(total)} сом
                  </button>
                </div>
              )}
            </div>
  );
}
