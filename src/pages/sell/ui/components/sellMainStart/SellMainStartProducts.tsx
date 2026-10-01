import { FaMinus, FaPlus } from "react-icons/fa";
import { manualFilling } from "@entities/sale";
import { cx } from "../../utils/sellMainStartUtils";
import type { SellMainStartVm } from "../../hooks/useSellMainStart";

type Props = {
  vm: SellMainStartVm;
};

export default function SellMainStartProducts({ vm }: Props) {
  const {
    filteredProducts,
    saleLoading,
    selectedItem,
    start,
    dispatch,
    handleRemoveItem,
    handleDecreaseQty,
    handleIncreaseQty,
    handleItemQtyChange,
    handleItemQtyBlur,
    itemQuantities,
    setShowCustomServiceModal,
  } = vm;

  return (
    <div className="start__products">
      <div
        className="start_product_item start_product_item--service"
        key="custom-services"
      >
        <button
          className="start__products-add orange"
          onClick={() => setShowCustomServiceModal(true)}
          title="Добавить дополнительную услугу"
        >
          Доп. услуги
        </button>
      </div>

      {filteredProducts?.map((product) => (
        <div
          className="start_product_item start_product_item--product"
          key={product.id || product.name}
        >
          <div className="start_product_item--image">
            <img src={product.img} alt={product.name || "Товар"} />
          </div>
          <div className="start_product_item--content">
            <p className="start_product_item--title">
              <span className="start_product_item--title-name">
                Нзв.: <strong>{product.name}</strong>
              </span>
              <span className="start_product_item--title-qty">
                Кол.
                <strong>{product.quantity}</strong> шт
              </span>
            </p>
            <div className="start_product_item--control">
              <button
                key={product.id || product.name}
                className={cx(
                  "start__products-add",
                  selectedItem?.product_name == product.name && "active"
                )}
                disabled={saleLoading}
                onClick={() => {
                  if (product.isCart) {
                    return handleRemoveItem(product);
                  }
                  dispatch(
                    manualFilling({
                      id: start?.id as any,
                      productId: product?.id,
                    })
                  ).unwrap();
                }}
                title="Добавить 1 шт"
              >
                {product.isCart ? "Убрать" : "Добавить"}
              </button>
              {product.isCart && (
                <div className="start_product_item--control_action">
                  <button
                    className={cx(
                      "start__products-add",
                      selectedItem?.product_name == product.name && "active"
                    )}
                    disabled={saleLoading}
                    onClick={() => {
                      handleDecreaseQty(product.cartItem);
                    }}
                    title="Добавить 1 шт"
                  >
                    <FaMinus />
                  </button>
                  <input
                    min={0}
                    onChange={(e: any) => {
                      e.stopPropagation();
                      handleItemQtyChange(product.cartItem, e.target.value);
                    }}
                    onBlur={(e: any) => {
                      e.stopPropagation();
                      handleItemQtyBlur(product.cartItem);
                    }}
                    value={
                      itemQuantities[product.cartItem?.id] ??
                      product.cartItem.quantity ??
                      ""
                    }
                    type="number"
                  />
                  <button
                    className={cx(
                      "start__products-add",
                      selectedItem?.product_name == product.name && "active"
                    )}
                    disabled={saleLoading}
                    onClick={() => {
                      handleIncreaseQty(product.cartItem);
                    }}
                    title="Добавить 1 шт"
                  >
                    <FaPlus />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
