import { Search, Plus, Check, Folder } from "lucide-react";
import { formatPrice } from "./utils";

const CreateSaleProductSidebar = ({
  productSearch,
  setProductSearch,
  products,
  selectedProductIds,
  cartItems,
  handleAddProduct,
  addingProduct,
  productsLoading,
  showMoreButton = false,
  onShowMore,
}) => (
  <div className="create-sale-document__sidebar">
    <div className="create-sale-document__search-wrapper">
      <div className="create-sale-document__search">
        <Search size={18} className="create-sale-document__search-icon" />
        <input
          type="text"
          className="nur-input"
          placeholder="Поиск товаров"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
      </div>
      <div className="create-sale-document__search-actions">
        <Folder size={18} />
        <Check size={18} />
      </div>
    </div>

    <button
      type="button"
      className="nur-btn nur-btn--primary create-sale-document__create-product-btn"
    >
      <Plus size={16} />
      Создать товар
    </button>

    <div className="create-sale-document__products-list">
      {products?.length === 0 && (
        <div className="create-sale-document__empty">Товары не найдены</div>
      )}
      {products.map((product) => {
        const isSelected = selectedProductIds.has(product.id);
        const isInCart = cartItems.some(
          (item) => String(item.productId) === String(product.id),
        );
        return (
          <div
            key={product.id}
            className={`create-sale-document__product-item ${
              isSelected || isInCart ? "active" : ""
            }`}
            onClick={() => handleAddProduct(product.id)}
            style={{
              cursor: addingProduct ? "wait" : "pointer",
              opacity: addingProduct ? 0.6 : 1,
            }}
          >
            <div className="create-sale-document__product-info">
              <div className="create-sale-document__product-name">
                {product.name}
              </div>
              <div className="create-sale-document__product-details">
                <span className="create-sale-document__product-price">
                  {formatPrice(product.price)} сом
                </span>
                <span className="create-sale-document__product-qty">
                  {product.quantity || 0} {product.unit || "шт"}
                </span>
              </div>
            </div>
            {(isSelected || isInCart) && (
              <Check
                size={18}
                className="create-sale-document__product-check"
              />
            )}
          </div>
        );
      })}
    </div>

    {productsLoading && (
      <div className="create-sale-document__loading">Загрузка...</div>
    )}
    {showMoreButton && (
      <button
        type="button"
        className="create-sale-document__show-more"
        onClick={onShowMore}
      >
        Показать ещё
      </button>
    )}
  </div>
);

export default CreateSaleProductSidebar;
