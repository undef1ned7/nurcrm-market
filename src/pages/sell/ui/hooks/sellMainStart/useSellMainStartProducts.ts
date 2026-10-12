import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { doSearch, startSale } from "@entities/sale";
import { fetchProductsAsync, useProducts } from "@entities/product";
import { useSale } from "@entities/sale";
import useBarcodeToCart from "../../useBarcodeToCart";
import {
  buildFilteredProducts,
  INITIAL_CUSTOM_SERVICE,
} from "../../utils/sellMainStartUtils";

export function useSellMainStartProducts({ dispatch, setAlert, start }: any) {
  const { foundProduct } = useSale();
  const { list: products } = useProducts();
  const filteredProducts = useMemo(
    () => buildFilteredProducts(products, start),
    [products, start]
  );
  const lastScanTimeRef = useRef(0);

  const {
    error: _barcodeScanError,
    ambiguity: barcodeAmbiguity,
    ambiguityLoading: barcodeAmbiguityLoading,
    selectAmbiguousProduct,
    closeAmbiguity,
  } = useBarcodeToCart(start?.id, {
    onError: (msg) =>
      setAlert({
        open: true,
        type: "error",
        message: msg || "Нет такого товара",
      }),
    onScanned: () => {
      lastScanTimeRef.current = Date.now();
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [customService, setCustomService] = useState({ ...INITIAL_CUSTOM_SERVICE });
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState("");

  const debouncedDiscount1 = useDebounce((v) => {
    dispatch(startSale({ discount_total: v }));
  }, 600);
  const onDiscountChange = (e) => debouncedDiscount1(e.target.value);

  useEffect(() => {
    dispatch(doSearch(undefined as any));
    dispatch(fetchProductsAsync(undefined as any));
  }, [dispatch]);

  useEffect(() => {
    if (foundProduct && Array.isArray(foundProduct)) {
      if (foundProduct.length > 0 && searchQuery.length > 0) {
        setShowDropdown(true);
      } else if (foundProduct.length === 0 && searchQuery.length === 0) {
        setShowDropdown(false);
      }
    }
  }, [foundProduct, searchQuery]);


  return {
    products,
    filteredProducts,
    foundProduct,
    lastScanTimeRef,
    barcodeAmbiguity,
    barcodeAmbiguityLoading,
    selectAmbiguousProduct,
    closeAmbiguity,
    searchQuery,
    setSearchQuery,
    showDropdown,
    setShowDropdown,
    showCustomServiceModal,
    setShowCustomServiceModal,
    customService,
    setCustomService,
    showDiscountModal,
    setShowDiscountModal,
    discountValue,
    setDiscountValue,
    onDiscountChange,
  };
}
