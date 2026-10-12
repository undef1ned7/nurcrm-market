import { useCallback, useEffect, useMemo, useState } from "react";
import {
  manualFilling,
  updateManualFilling,
  deleteProductInCart,
  startSale,
} from "@entities/sale";
import { useProducts } from "@entities/product";
import { toNum, getAvailableQtyForProduct } from "../../utils/productUtils";

export function useSellMainStartCart({ start, dispatch, setAlert }: any) {
  const { list: products } = useProducts();
  const [selectedId, setSelectedId] = useState<any>(null);
  const selectedItem = useMemo(
    () => (start?.items || []).find((i: any) => i.id === selectedId) || null,
    [start?.items, selectedId]
  );
  const [, setQty] = useState<any>("");
  const [itemQuantities, setItemQuantities] = useState<any>({});
  const [showCart, setShowCart] = useState<any>(false);

  const {
    currentItems,
    currentSubtotal,
    currentDiscount,
    currentTotal,
    isEmpty,
  } = useMemo(() => {
    const currentItems = start?.items || [];
    const currentSubtotal = start?.subtotal;
    const currentDiscount = start?.order_discount_total;
    const currentTotal = start?.total;
    const isEmpty = !!start?.items?.length;
    return {
      currentItems,
      currentSubtotal,
      currentDiscount,
      currentTotal,
      isEmpty,
    };
  }, [start]);

  const onRefresh = useCallback(() => {
    dispatch(startSale({ discount_total: currentDiscount }));
  }, [currentDiscount, dispatch]);

  useEffect(() => {
    if (selectedItem) setQty(String(selectedItem.quantity ?? ""));
    else setQty("");
  }, [selectedItem]);

  const handleRowClick = (item: any) => {
    setSelectedId(item.id);
  };

  // const decQty = async () => {
  //   if (!selectedItem) return;
  //   const next = Math.max(0, (toNum(qty) || 0) - 1);
  //   setQty(String(next));

  //   await dispatch(
  //     updateManualFilling({
  //       id: start?.id,
  //       productId: selectedItem.id,
  //       quantity: next,
  //     })
  //   ).unwrap();
  //   onRefresh();
  // };

  // Функции для работы с товарами в таблице
  const handleIncreaseQty = async (item: any) => {
    if (!start?.id) return;
    const productId = item.product || item.id;
    const available = getAvailableQtyForProduct(productId, products);
    const currentQty = Number(item.quantity) || 0;

    if (available && currentQty >= available) {
      setAlert({
        open: true,
        type: "error",
        message: "Нельзя добавить больше, чем есть на складе",
      });
      return;
    }

    try {
      await dispatch(
        manualFilling({ id: start.id, productId: item.product || item.id })
      ).unwrap();
      onRefresh();
      setItemQuantities((prev: any) => ({
        ...prev,
        [item.id]: String(currentQty + 1),
      }));
    } catch (error: any) {
      console.error("Ошибка при увеличении количества:", error);
      setAlert({
        open: true,
        type: "error",
        message: error?.data?.detail || "Ошибка при увеличении количества",
      });
    }
  };

  const handleDecreaseQty = async (item: any) => {
    if (!start?.id) return;
    const currentQty = Number(item.quantity) || 0;
    const next = Math.max(0, currentQty - 1);

    if (next === 0) {
      await handleRemoveItem(item);
      return;
    }

    try {
      await dispatch(
        updateManualFilling({
          id: start.id,
          productId: item.id,
          quantity: next,
        })
      ).unwrap();
      onRefresh();
      setItemQuantities((prev: any) => ({
        ...prev,
        [item.id]: String(next),
      }));
    } catch (error: any) {
      console.error("Ошибка при уменьшении количества:", error);
      setAlert({
        open: true,
        type: "error",
        message: error?.data?.detail || "Ошибка при уменьшении количества",
      });
    }
  };

  const handleRemoveItem = async (item: any) => {
    if (!start?.id) return;
    try {
      await dispatch(
        deleteProductInCart({
          id: start.id,
          productId: item.id,
        })
      ).unwrap();
      if (selectedId === item.id) {
        setSelectedId(null);
      }
    } catch (error: any) {
      console.error("Ошибка при удалении товара:", error);
      setAlert({
        open: true,
        type: "error",
        message: error?.data?.detail || "Ошибка при удалении товара",
      });
    }
  };

  // Обработчик изменения количества через инпут
  const handleItemQtyChange = (item: any, value: any) => {
    setItemQuantities((prev: any) => ({
      ...prev,
      [item.id]: value,
    }));
  };

  // Обработчик потери фокуса инпута количества
  const handleItemQtyBlur = async (item: any) => {
    if (!start?.id) return;
    const inputValue = itemQuantities[item.id] || "";
    let qtyNum;

    if (inputValue === "" || inputValue === "0") {
      qtyNum = item.quantity || 0;
    } else {
      qtyNum = Math.max(0, toNum(inputValue));
    }

    const productId = item.product || item.id;
    const available = getAvailableQtyForProduct(productId, products);
    if (available && qtyNum > available) {
      qtyNum = available;
      setAlert({
        open: true,
        type: "error",
        message: "Нельзя установить количество больше остатка",
      });
    }

    setItemQuantities((prev: any) => ({
      ...prev,
      [item.id]: String(qtyNum),
    }));

    if (qtyNum === 0) {
      await handleRemoveItem(item);
      return;
    }

    try {
      await dispatch(
        updateManualFilling({
          id: start?.id,
          productId: item.id,
          quantity: qtyNum,
        })
      ).unwrap();
      onRefresh();
    } catch (error: any) {
      console.error("Ошибка при обновлении количества:", error);
      setAlert({
        open: true,
        type: "error",
        message: error?.data?.detail || "Ошибка при обновлении количества",
      });
    }
  };



  // Инициализация локальных значений количества для элементов таблицы
  useEffect(() => {
    const items = start?.items || [];
    const quantities: any = {};
    items.forEach((item: any) => {
      quantities[item.id] = String(item.quantity ?? "");
    });
    setItemQuantities(quantities);
  }, [start?.items]);


  return {
    products,
    selectedId,
    setSelectedId,
    selectedItem,
    itemQuantities,
    setItemQuantities,
    showCart,
    setShowCart,
    currentItems,
    currentSubtotal,
    currentDiscount,
    currentTotal,
    isEmpty,
    onRefresh,
    handleRowClick,
    handleIncreaseQty,
    handleDecreaseQty,
    handleRemoveItem,
    handleItemQtyChange,
    handleItemQtyBlur,
  };
}
