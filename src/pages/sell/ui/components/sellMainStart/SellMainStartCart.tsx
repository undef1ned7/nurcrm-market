import UniversalModal from "@shared/ui/legacy-production/ProductionAgents/UniversalModal/UniversalModal";
import CartTable from "../CartTable";
import type { SellMainStartVm } from "../../hooks/useSellMainStart";

type Props = {
  vm: SellMainStartVm;
};

export default function SellMainStartCart({ vm }: Props) {
  const {
    showCart,
    setShowCart,
    currentItems,
    selectedId,
    handleRowClick,
    itemQuantities,
    handleItemQtyChange,
    handleItemQtyBlur,
    handleIncreaseQty,
    handleDecreaseQty,
    handleRemoveItem,
  } = vm;

  if (!showCart) return null;

  return (
    <UniversalModal
      show={showCart}
      title={"Корзина"}
      onClose={() => setShowCart(false)}
    >
      <div className="start__body-column--cart">
        <CartTable
          items={currentItems}
          selectedId={selectedId}
          onRowClick={handleRowClick}
          itemQuantities={itemQuantities}
          onQtyChange={handleItemQtyChange}
          onQtyBlur={handleItemQtyBlur}
          onIncreaseQty={handleIncreaseQty}
          onDecreaseQty={handleDecreaseQty}
          onRemoveItem={handleRemoveItem}
        />
      </div>
    </UniversalModal>
  );
}
