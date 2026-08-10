import { Search, Star } from "lucide-react";
import { Button } from "@mui/material";
import CashierCartsBar from "./CashierCartsBar";
import { getDefaultPackage } from "@shared/lib/tools/marketPackPieceSale";
import { formatPrice, formatQuantity } from "../cashierPage.utils";
import type { CashierPageVm } from "../hooks/useCashierPage";

type Props = {
  vm: CashierPageVm;
};

export function CashierProductsPanel({ vm }: Props) {
  const {
    mobileProductsList,
    setMobileProductsList,
    isDesktopLayout,
    desktopProductsWidth,
    openShiftId,
    multiCart,
    handleSelectCashierCart,
    handleNewCashierCart,
    canMarketDeleteCartItem,
    handleDeleteCashierCart,
    searchInputRef,
    searchTerm,
    setSearchTerm,
    lastSearchInputTime,
    scanKeysRef,
    isScanningRef,
    lastScanTimeRef,
    searchClearedAfterScanRef,
    barcodeProcessingRef,
    filteredProducts,
    openPieceSaleChoice,
    addToCart,
    productsGridRef,
    productsLoading,
    handleProductCardClick,
    toggleFavorite,
    favoriteLoadingMap,
    cart,
    addToCartWithPackage,
    totalPages,
    handlePageChange,
    currentPage,
    previous,
    next,
    count,
  } = vm;

  return (
    <>
              <div
                className={`cashier-page__products ${mobileProductsList ? "active" : ""} `}
                style={
                  isDesktopLayout
                    ? {
                        flex: `${desktopProductsWidth} 1 0`,
                        width: 0,
                        minWidth: 0,
                      }
                    : undefined
                }
              >
                <div className="mobile-list-btn flex w-full justify-center py-2 md:hidden!">
                  <Button
                    onClick={() => setMobileProductsList(false)}
                    className="mx-auto"
                  >
                    Скрыть
                  </Button>
                </div>

                {openShiftId && (
                  <div className="cashier-page__carts-bar-wrap">
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

                <div className="cashier-page__search">
                  <Search size={20} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск товаров..."
                    value={searchTerm}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const oldValue = searchTerm;
                      setSearchTerm(newValue);

                      // Обновляем время последнего ввода при каждом изменении (для защиты от сканера)
                      const now = Date.now();
                      const timeSinceLastInput = now - lastSearchInputTime.current;
                      lastSearchInputTime.current = now;

                      // Если длина уменьшилась, значит пользователь удаляет символы (Backspace/Delete)
                      // Это точно ручной ввод - сбрасываем все флаги сканера
                      if (newValue.length < oldValue.length) {
                        scanKeysRef.current.count = 0;
                        scanKeysRef.current.lastTime = 0;
                        isScanningRef.current = false;
                        lastScanTimeRef.current = 0;
                        searchClearedAfterScanRef.current = false;
                      }

                      // Если ввод медленный (больше 100мс между символами), это ручной ввод - сбрасываем счетчик сканера
                      if (timeSinceLastInput > 100) {
                        scanKeysRef.current.count = 0;
                        isScanningRef.current = false;
                      }

                      // Если пользователь вводит текст вручную, сбрасываем флаг очистки после сканирования
                      if (newValue.length > 0) {
                        searchClearedAfterScanRef.current = false;
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const now = Date.now();
                        const timeSinceLastInput = now - lastSearchInputTime.current;
                        const isScannerSubmit =
                          barcodeProcessingRef.current ||
                          isScanningRef.current ||
                          scanKeysRef.current.count >= 6;

                        // Если в поле поиска есть текст и нажат Enter, это может быть сканирование
                        // Обновляем время сканирования как fallback (на случай, если onScanned еще не сработал)
                        if (searchTerm.length > 0) {
                          // Если ввод был недавно (менее 500мс), считаем это сканированием
                          if (timeSinceLastInput < 500) {
                            lastScanTimeRef.current = now;
                            isScanningRef.current = true;
                            // Сбрасываем флаг через 2 секунды
                            setTimeout(() => {
                              isScanningRef.current = false;
                            }, 2000);
                          }
                        }

                        // Обновляем время последнего ввода (сканер завершает ввод Enter'ом)
                        lastSearchInputTime.current = now;

                        // Во время сканирования не берем первый товар из списка поиска:
                        // сканер сам добавляет товар через sendBarCode по точному barcode.
                        if (isScannerSubmit || timeSinceLastInput < 500) {
                          setSearchTerm("");
                          searchClearedAfterScanRef.current = true;
                          scanKeysRef.current.count = 0;
                          return;
                        }

                        // Если есть найденные товары, добавляем первый в корзину
                        if (filteredProducts.length > 0) {
                          const firstProduct = filteredProducts[0];
                          if (!openPieceSaleChoice(firstProduct, "click")) {
                            addToCart(firstProduct);
                          }
                          // Очищаем поле поиска после добавления товара
                          setSearchTerm("");
                          // Сбрасываем флаг очистки после сканирования, так как это ручное добавление
                          searchClearedAfterScanRef.current = false;
                        }
                      }
                    }}
                    className="cashier-page__search-input"
                  />
                </div>

                <div className="cashier-page__products-grid" ref={productsGridRef}>
                  {productsLoading ? (
                    <div className="cashier-page__products-loading">
                      Загрузка товаров...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="cashier-page__products-empty">
                      Товары не найдены
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const piecePackage = getDefaultPackage(product);
                      const cartItem = cart.find(
                        (item) =>
                          !item.isCustom &&
                          item.productId === product.id &&
                          !item.salePackage,
                      );
                      const pieceCartItem = cart.find(
                        (item) =>
                          !item.isCustom &&
                          item.productId === product.id &&
                          item.salePackage,
                      );
                      return (
                        <div
                          key={product.id}
                          className={`cashier-page__product-card ${
                            cartItem || pieceCartItem
                              ? "cashier-page__product-card--selected"
                              : ""
                          }`}
                          onClick={(e) => handleProductCardClick(product, e)}
                        >
                          <button
                            type="button"
                            className={`cashier-page__product-favorite ${
                              product.isFavorite
                                ? "cashier-page__product-favorite--active"
                                : ""
                            }`}
                            onClick={(e) => toggleFavorite(product, e)}
                            disabled={Boolean(favoriteLoadingMap[product.id])}
                            title={
                              product.isFavorite
                                ? "Убрать из избранного"
                                : "Добавить в избранное"
                            }
                            aria-label={
                              product.isFavorite
                                ? "Убрать из избранного"
                                : "Добавить в избранное"
                            }
                          >
                            <Star size={16} fill="currentColor" />
                          </button>
                          {pieceCartItem && (
                            <div
                              className="cashier-page__product-badge cashier-page__product-badge--piece"
                              title="Поштучно в корзине"
                            >
                              <span className="cashier-page__product-badge-qty">
                                {formatQuantity(pieceCartItem.quantity)}
                              </span>
                              <span className="cashier-page__product-badge-unit">
                                шт.
                              </span>
                            </div>
                          )}
                          {cartItem && (
                            <div className="cashier-page__product-badge">
                              {formatQuantity(cartItem.quantity || product.cartQty || 0)}
                            </div>
                          )}
                          <div className="cashier-page__product-name">
                            {product.name || "—"}
                          </div>
                          <div className="cashier-page__product-price">
                            {formatPrice(product.price || 0)} сом
                          </div>

                          <div className="cashier-page__product-stock flex items-center gap-2">
                            {product.quantity || 0} {product.unit || "шт"}
                            {piecePackage && (
                              <button
                                type="button"
                                className="cashier-page__cart-item-btn cursor-pointer"
                                // style={{ marginTop: 8 }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!piecePackage?.id) return;
                                  addToCartWithPackage(product, piecePackage.id);
                                }}
                                title={`Добавить 1 шт из упаковки (${piecePackage.quantity_in_package} в упаковке)`}
                              >
                                +1 шт (из {piecePackage.quantity_in_package})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="cashier-page__pagination">
                    <button
                      type="button"
                      className="cashier-page__pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || productsLoading || !previous}
                    >
                      Назад
                    </button>
                    <span className="cashier-page__pagination-info">
                      Страница {currentPage} из {totalPages || 1}
                      {count && ` (${count} товаров)`}
                    </span>
                    <button
                      type="button"
                      className="cashier-page__pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={
                        productsLoading ||
                        !next ||
                        (totalPages && currentPage >= totalPages)
                      }
                    >
                      Вперед
                    </button>
                  </div>
                )}
              </div>
    </>
  );
}
