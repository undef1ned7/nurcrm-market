import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { addCustomItem, startSale, useSale } from "@entities/sale";
import { useUser } from "@entities/user";
import { toNum } from "../utils/productUtils";
import { INITIAL_CUSTOM_SERVICE } from "../utils/sellMainStartUtils";
import { useSellMainStartPrinter } from "./sellMainStart/useSellMainStartPrinter";
import { useSellMainStartCart } from "./sellMainStart/useSellMainStartCart";
import { useSellMainStartProducts } from "./sellMainStart/useSellMainStartProducts";
import { useSellMainStartClient } from "./sellMainStart/useSellMainStartClient";
import { useSellMainStartCheckout } from "./sellMainStart/useSellMainStartCheckout";
import { useSellMainStartHotkeys } from "./sellMainStart/useSellMainStartHotkeys";

export function useSellMainStart() {
  const dispatch = useDispatch() as any;
  const { company } = useUser();
  const { start, loading: saleLoading } = useSale();

  const [alert, setAlert] = useState({
    open: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!start?.id) {
      dispatch(startSale({}));
    }
  }, [start?.id, dispatch]);

  const cart = useSellMainStartCart({ start, dispatch, setAlert });
  const products = useSellMainStartProducts({ dispatch, setAlert, start });
  const client = useSellMainStartClient({ company, dispatch });
  const { isPrinterConnected } = useSellMainStartPrinter();

  const checkout = useSellMainStartCheckout({
    company,
    dispatch,
    start,
    setAlert,
    onRefresh: cart.onRefresh,
    currentTotal: cart.currentTotal,
    clientId: client.clientId,
    pickClient: client.pickClient,
    debt: client.debt,
    amount: client.amount,
    debtMonths: client.debtMonths,
    state: client.state,
    setShowDebtModal: client.setShowDebtModal,
  });

  useSellMainStartHotkeys({
    start,
    lastScanTimeRef: products.lastScanTimeRef,
    showNewClientModal: client.showNewClientModal,
    showDebtModal: client.showDebtModal,
    showCustomServiceModal: products.showCustomServiceModal,
    showDiscountModal: products.showDiscountModal,
    showCashModal: checkout.showCashModal,
    showPaymentChoiceModal: checkout.showPaymentChoiceModal,
    showReceiptChoiceModal: checkout.showReceiptChoiceModal,
    receiptWithCheck: checkout.receiptWithCheck,
    setReceiptWithCheck: checkout.setReceiptWithCheck,
    paymentMethod: checkout.paymentMethod,
    paymentChoice: checkout.paymentChoice,
    setPaymentChoice: checkout.setPaymentChoice,
    setPaymentMethod: checkout.setPaymentMethod,
    setCashReceived: checkout.setCashReceived,
    setShowPaymentChoiceModal: checkout.setShowPaymentChoiceModal,
    setShowCashModal: checkout.setShowCashModal,
    setShowReceiptChoiceModal: checkout.setShowReceiptChoiceModal,
    setPendingCheckout: checkout.setPendingCheckout,
    setCashPaymentConfirmed: checkout.setCashPaymentConfirmed,
  });

  const handleAddCustomService = async () => {
    try {
      if (!products.customService.name.trim()) {
        setAlert({
          open: true,
          type: "error",
          message: "Введите название услуги",
        });
        return;
      }
      const priceNum = toNum(products.customService.price);
      if (
        !products.customService.price.trim() ||
        !Number.isFinite(priceNum) ||
        priceNum <= 0
      ) {
        setAlert({
          open: true,
          type: "error",
          message: "Введите корректную цену услуги",
        });
        return;
      }
      if (!start?.id) {
        setAlert({
          open: true,
          type: "error",
          message: "Корзина не инициализирована. Пожалуйста, подождите...",
        });
        return;
      }
      await dispatch(
        addCustomItem({
          id: start?.id,
          name: products.customService.name.trim(),
          price: priceNum,
          quantity: Number(products.customService.quantity) || 1,
        }),
      ).unwrap();
      cart.onRefresh();
      products.setCustomService({ ...INITIAL_CUSTOM_SERVICE });
      products.setShowCustomServiceModal(false);
      setAlert({
        open: true,
        type: "success",
        message: "Дополнительная услуга успешно добавлена!",
      });
    } catch (error: any) {
      console.error("Ошибка при добавлении дополнительной услуги:", error);
      setAlert({
        open: true,
        type: "error",
        message:
          error?.data?.detail ||
          error?.message ||
          "Ошибка при добавлении дополнительной услуги",
      });
    }
  };

  return {
    barcodeAmbiguity: products.barcodeAmbiguity,
    barcodeAmbiguityLoading: products.barcodeAmbiguityLoading,
    selectAmbiguousProduct: products.selectAmbiguousProduct,
    closeAmbiguity: products.closeAmbiguity,
    dispatch,
    company,
    start,
    saleLoading,
    foundProduct: products.foundProduct,
    filteredProducts: products.filteredProducts,
    searchQuery: products.searchQuery,
    setSearchQuery: products.setSearchQuery,
    showDropdown: products.showDropdown,
    setShowDropdown: products.setShowDropdown,
    clientId: client.clientId,
    setClientId: client.setClientId,
    setSelectClient: client.setSelectClient,
    filterClient: client.filterClient,
    showCart: cart.showCart,
    setShowCart: cart.setShowCart,
    currentItems: cart.currentItems,
    selectedId: cart.selectedId,
    selectedItem: cart.selectedItem,
    handleRowClick: cart.handleRowClick,
    itemQuantities: cart.itemQuantities,
    handleItemQtyChange: cart.handleItemQtyChange,
    handleItemQtyBlur: cart.handleItemQtyBlur,
    handleIncreaseQty: cart.handleIncreaseQty,
    handleDecreaseQty: cart.handleDecreaseQty,
    handleRemoveItem: cart.handleRemoveItem,
    currentSubtotal: cart.currentSubtotal,
    currentDiscount: cart.currentDiscount,
    currentTotal: cart.currentTotal,
    isEmpty: cart.isEmpty,
    setDiscountValue: products.setDiscountValue,
    setShowDiscountModal: products.setShowDiscountModal,
    setShowDebtModal: client.setShowDebtModal,
    paymentMethod: checkout.paymentMethod,
    setPaymentMethod: checkout.setPaymentMethod,
    setCashReceived: checkout.setCashReceived,
    setCashPaymentConfirmed: checkout.setCashPaymentConfirmed,
    setShowCashModal: checkout.setShowCashModal,
    performCheckout: checkout.performCheckout,
    isPrinterConnected,
    showNewClientModal: client.showNewClientModal,
    setShowNewClientModal: client.setShowNewClientModal,
    form: client.form,
    setForm: client.setForm,
    touched: client.touched,
    setTouched: client.setTouched,
    errors: client.errors,
    setErrors: client.setErrors,
    submitTried: client.submitTried,
    setSubmitTried: client.setSubmitTried,
    alert,
    setAlert,
    showDebtModal: client.showDebtModal,
    state: client.state,
    onChange2: client.onChange2,
    debt: client.debt,
    setDebt: client.setDebt,
    amount: client.amount,
    setAmount: client.setAmount,
    debtMonths: client.debtMonths,
    setDebtMonths: client.setDebtMonths,
    handleSaveDebt: checkout.handleSaveDebt,
    showCustomServiceModal: products.showCustomServiceModal,
    setShowCustomServiceModal: products.setShowCustomServiceModal,
    customService: products.customService,
    setCustomService: products.setCustomService,
    handleAddCustomService,
    showDiscountModal: products.showDiscountModal,
    discountValue: products.discountValue,
    onDiscountChange: products.onDiscountChange,
    showCashModal: checkout.showCashModal,
    cashReceived: checkout.cashReceived,
    cashPaymentConfirmed: checkout.cashPaymentConfirmed,
    handleCashPayment: checkout.handleCashPayment,
    showPaymentChoiceModal: checkout.showPaymentChoiceModal,
    setShowPaymentChoiceModal: checkout.setShowPaymentChoiceModal,
    paymentChoice: checkout.paymentChoice,
    setPaymentChoice: checkout.setPaymentChoice,
    handleConfirmPaymentChoice: checkout.handleConfirmPaymentChoice,
    showReceiptChoiceModal: checkout.showReceiptChoiceModal,
    setShowReceiptChoiceModal: checkout.setShowReceiptChoiceModal,
    receiptWithCheck: checkout.receiptWithCheck,
    setReceiptWithCheck: checkout.setReceiptWithCheck,
    setPendingCheckout: checkout.setPendingCheckout,
  };
}

export type SellMainStartVm = ReturnType<typeof useSellMainStart>;
