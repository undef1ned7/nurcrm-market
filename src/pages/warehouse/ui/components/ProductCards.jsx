import React, { useMemo } from "react";
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
  }) => {
    const outOfStock = isOutOfStock?.(product) ?? false;
    return (
      <div
        className="warehouse-table__row warehouse-card"
        onClick={() => onProductClick(product)}
      >
        <div className="flex items-start gap-3">
          {enableDrag && onProductDragStart && (
            <button
              type="button"
              className="warehouse-drag-handle warehouse-drag-handle--card"
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onProductDragStart(product, e);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              title="Перетащить"
              aria-label="Перетащить"
            >
              <GripVertical size={18} />
            </button>
          )}
          <div className="pt-1" onClick={(e) => onRowSelect(product.id, e)}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onRowSelect(product.id, e)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-slate-300"
            />
          </div>

          <img
            src={primaryImage?.image_url || noImage}
            alt={product.name || "Товар"}
            className="warehouse-table__product-image h-12 w-12 flex-none rounded-xl border border-slate-200 object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = noImage;
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">#{rowNumber}</div>
            <div className="warehouse-table__name mt-0.5 truncate text-sm font-semibold" style={{ color: "var(--nur-text)" }}>
              {product.name || "—"}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="whitespace-nowrap">
                Код:{" "}
                <span className="font-medium">{product.code || "—"}</span>
              </span>
              <span className="whitespace-nowrap">
                Арт:{" "}
                <span className="font-medium">
                  {product.article || "—"}
                </span>
              </span>
              <span className="whitespace-nowrap">
                Ед:{" "}
                <span className="font-medium">{product.unit || "—"}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="warehouse-card__stats">
          <div className="warehouse-card__stat">
            <div className="warehouse-card__stat-label">Цена продажи</div>
            <div className="warehouse-card__stat-value">
              {formatPrice(product.price)}
            </div>
          </div>

          <div className="warehouse-card__stat">
            <div className="warehouse-card__stat-label">Скидка</div>
            <div className="warehouse-card__stat-value">
              {formatPrice(product.discount_percent || 0)}%
            </div>
          </div>

          <div className="warehouse-card__stat warehouse-card__stat--full">
            <div className="warehouse-card__stat-label">Остатки</div>
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
}) => {
  // Мемоизация вычислений для всех товаров
  const productsData = useMemo(() => {
    return products.map((product, index) => ({
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
      <div className="warehouse-table__loading">
        Загрузка...
      </div>
    );
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="warehouse-table__empty">
        Товары не найдены
      </div>
    );
  }

  return (
    <div className="warehouse-cards relative">
      {loading && products.length > 0 && (
        <div className="warehouse-table__loading-overlay">
          <div className="warehouse-table__loading-text">Загрузка...</div>
        </div>
      )}
      <div className="warehouse-cards__toolbar">
        <label
          className="warehouse-cards__select-all"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            disabled={loading}
          />
          Выбрать все
        </label>

        <div className="warehouse-cards__selected">
          Выбрано: <strong>{selectedRows.size}</strong>
        </div>
      </div>

      <div className="warehouse-cards__grid">
        {productsData.map((productData) => (
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
const areEqual = (prevProps, nextProps) => {
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

