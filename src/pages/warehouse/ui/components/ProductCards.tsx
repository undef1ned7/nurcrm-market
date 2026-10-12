import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { formatPrice, formatStock, getPrimaryImage } from "../utils";
import noImage from "./placeholder.png";
import "./ProductCards.scss";

/**
 * Мемоизированный компонент карточки товара
 */
const ProductCard = React.memo(
  ({
    product,
    primaryImage,
    isSelected,
    rowNumber,
    onRowSelect,
    onProductClick,
    enableDrag,
    onProductDragStart,
    isOutOfStock,
  }: any) => {
    const { t } = useTranslation();
    const outOfStock = isOutOfStock?.(product) ?? false;
    return (
      <div
        className="warehouse-card"
        onClick={() => onProductClick(product)}
      >
        <div className="warehouse-card__top">
          {enableDrag && onProductDragStart && (
            <button
              type="button"
              className="warehouse-drag-handle warehouse-drag-handle--card"
              draggable
              onDragStart={(e: any) => {
                e.stopPropagation();
                onProductDragStart(product, e);
              }}
              onMouseDown={(e: any) => e.stopPropagation()}
              onClick={(e: any) => e.stopPropagation()}
              title={t("crm.warehouse.dragTitle")}
              aria-label={t("crm.warehouse.dragTitle")}
            >
              <GripVertical size={18} />
            </button>
          )}
          <div
            className="warehouse-card__check"
            onClick={(e: any) => onRowSelect(product.id, e)}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e: any) => onRowSelect(product.id, e)}
              onClick={(e: any) => e.stopPropagation()}
              className="h-4 w-4 rounded border-slate-300"
            />
          </div>

          <img
            src={primaryImage?.image_url || noImage}
            alt={product.name || t("crm.warehouse.productAlt")}
            className="warehouse-card__image"
            loading="lazy"
            decoding="async"
            onError={(e: any) => {
              e.currentTarget.src = noImage;
            }}
          />

          <div className="warehouse-card__body">
            <div className="warehouse-card__num">#{rowNumber}</div>
            <div className="warehouse-card__name">{product.name || "—"}</div>

            <div className="warehouse-card__meta">
              <span>
                {t("crm.warehouse.cardCodeShort")}:{" "}
                <strong>{product.code || "—"}</strong>
              </span>
              <span>
                {t("crm.warehouse.cardArticleShort")}:{" "}
                <strong>{product.article || "—"}</strong>
              </span>
              <span>
                PLU:{" "}
                <strong>
                  {product.plu !== null &&
                  product.plu !== undefined &&
                  String(product.plu).trim() !== ""
                    ? product.plu
                    : "—"}
                </strong>
              </span>
              <span>
                {t("crm.warehouse.cardUnitShort")}:{" "}
                <strong>{product.unit || "—"}</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="warehouse-card__stats">
          <div className="warehouse-card__stat">
            <div className="warehouse-card__stat-label">
              {t("crm.warehouse.sellPrice")}
            </div>
            <div className="warehouse-card__stat-value">
              {formatPrice(product.price)}
            </div>
          </div>

          <div className="warehouse-card__stat">
            <div className="warehouse-card__stat-label">
              {t("crm.warehouse.discount")}
            </div>
            <div className="warehouse-card__stat-value">
              {formatPrice(product.discount_percent || 0)}%
            </div>
          </div>

          <div className="warehouse-card__stat">
            <div className="warehouse-card__stat-label">
              {t("crm.warehouse.stockLabel")}
            </div>
            <div
              className={`warehouse-card__stat-value${outOfStock ? " warehouse-card__stat-value--out" : ""}`}
            >
              {formatStock(product.quantity)}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Кастомное сравнение для оптимизации ререндеров
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.rowNumber === nextProps.rowNumber &&
      prevProps.primaryImage?.image_url === nextProps.primaryImage?.image_url &&
      prevProps.enableDrag === nextProps.enableDrag &&
      prevProps.onProductDragStart === nextProps.onProductDragStart &&
      prevProps.isOutOfStock === nextProps.isOutOfStock
    );
  }
);

ProductCard.displayName = "ProductCard";

/**
 * Компонент карточек товаров
 */
const ProductCards = ({
  products,
  loading,
  selectedRows,
  isAllSelected,
  onRowSelect,
  onSelectAll,
  onProductClick,
  getRowNumber,
  enableDrag = false,
  onProductDragStart,
  isOutOfStock,
}: any) => {
  const { t } = useTranslation();
  // Мемоизация вычислений для всех товаров
  const productsData = useMemo(() => {
    return products.map((product: any, index: any) => ({
      product,
      primaryImage: getPrimaryImage(product),
      isSelected: selectedRows.has(String(product.id)),
      rowNumber: getRowNumber(index, products.length),
    }));
  }, [products, selectedRows, getRowNumber]);

  // Показываем старые данные во время загрузки (оптимистичное обновление)
  // Только если данных нет вообще - показываем загрузку
  if (loading && products.length === 0) {
    return (
      <div className="warehouse-table__loading">{t("common.loading")}</div>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="warehouse-table__empty">
        {t("crm.warehouse.productsNotFound")}
      </div>
    );
  }

  return (
    <div className="warehouse-cards relative">
      {loading && products.length > 0 && (
        <div className="warehouse-table__loading-overlay">
          <div className="warehouse-table__loading-text">
            {t("common.loading")}
          </div>
        </div>
      )}
      <div className="warehouse-cards__toolbar">
        <label
          className="warehouse-cards__select-all"
          onClick={(e: any) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            disabled={loading}
          />
          {t("crm.warehouse.selectAll")}
        </label>

        <div className="warehouse-cards__selected">
          {t("crm.warehouse.selected")}: <strong>{selectedRows.size}</strong>
        </div>
      </div>

      <div className="warehouse-cards__grid">
        {productsData.map((productData: any) => (
          <ProductCard
            key={productData.product.id}
            product={productData.product}
            primaryImage={productData.primaryImage}
            isSelected={productData.isSelected}
            rowNumber={productData.rowNumber}
            onRowSelect={onRowSelect}
            onProductClick={onProductClick}
            enableDrag={enableDrag}
            onProductDragStart={onProductDragStart}
            isOutOfStock={isOutOfStock}
          />
        ))}
      </div>
    </div>
  );
};

// Оптимизированное сравнение для React.memo
const areEqual = (prevProps: any, nextProps: any) => {
  // Быстрые проверки сначала
  if (
    prevProps.loading !== nextProps.loading ||
    prevProps.isAllSelected !== nextProps.isAllSelected ||
    prevProps.selectedRows.size !== nextProps.selectedRows.size ||
    prevProps.getRowNumber !== nextProps.getRowNumber ||
    prevProps.enableDrag !== nextProps.enableDrag ||
    prevProps.onProductDragStart !== nextProps.onProductDragStart ||
    prevProps.isOutOfStock !== nextProps.isOutOfStock
  ) {
    return false;
  }

  // Проверка длины массива (O(1))
  if (prevProps.products.length !== nextProps.products.length) {
    return false;
  }

  // Если массивы одинаковые по ссылке - пропускаем проверку
  if (prevProps.products === nextProps.products) {
    return true;
  }

  // При смене страницы данные всегда должны обновляться
  // Проверяем только первые элементы - если они разные, значит это новая страница
  if (prevProps.products.length > 0 && nextProps.products.length > 0) {
    if (prevProps.products[0]?.id !== nextProps.products[0]?.id) {
      return false; // Разные данные - нужно обновить
    }
  }

  // Если первые элементы совпадают и длина совпадает, считаем что данные не изменились
  // Это оптимизация для случая, когда меняется только selectedRows или другие пропсы
  return true;
};

export default React.memo(ProductCards, areEqual);

