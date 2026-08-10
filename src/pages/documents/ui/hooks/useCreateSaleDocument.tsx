import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import {
  createWarehouseDocument,
} from "@entities/warehouse";
import { fetchProductsAsync } from "@entities/product";
import { fetchClientsAsync } from "@entities/client";
import { useCash } from "@entities/cash";
import { useClient } from "@entities/client";
import { useUser } from "@entities/user";
import InvoicePdfDocument from "../components/InvoicePdfDocument";
import ReceiptPdfDocument from "../components/ReceiptPdfDocument";
import Ko1PdfDocument from "@shared/ui/legacy-warehouse-sector/Documents/components/Ko1PdfDocument";
import { numberToWords } from "@shared/lib/numberToWords";
import {
  formatDisplayDate,
  downloadBlob,
  computeCartTotals,
  updateCartItemQuantity,
  removeCartItem,
} from "../create-sale/utils";


export function useCreateSaleDocument() {
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();
  const { company, profile: userProfile } = useUser();
  const { list: cashBoxes } = useCash();
  const { list: clients } = useClient();

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<any>(new Set());
  const [showMoreProducts, setShowMoreProducts] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  const [warehouse] = useState("");
  const [warehouseTo, setWarehouseTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  // Market create-sale page is always a SALE document
  const docType = "SALE";
  const isWarehouseToRequired = false;
  const isCounterpartyRequired = true;
  const [documentSearch, setDocumentSearch] = useState("");
  const [isDocumentPosted, setIsDocumentPosted] = useState(false);
  const [documentDateValue, setDocumentDateValue] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showSavePrintMenu, setShowSavePrintMenu] = useState(false);
  const dateInputRef = useRef<any>(null);
  const [documentDiscount, setDocumentDiscount] = useState("");
  const [comment, setComment] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [documentId] = useState(
    () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const debounceTimerRef = useRef<any>(null);

  // Форматирование даты для отображения

  const displayDate = formatDisplayDate(
    documentDateValue ? new Date(documentDateValue).toISOString() : null
  );

  // Debounce для поиска товаров
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [productSearch]);

  // Загрузка товаров
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const result = await dispatch(fetchProductsAsync({
          search: debouncedProductSearch || undefined,
          page_size: showMoreProducts ? 50 : 20,
        }));
        // const result = await dispatch(
        //   fetchWarehouseProducts({
        //     search: debouncedProductSearch || undefined,
        //     page_size: showMoreProducts ? 50 : 20,
        //   })
        // );
        if (fetchProductsAsync.fulfilled.match(result)) {
          // Обрабатываем стандартный формат DRF пагинации
          setProducts(result.payload?.results || (Array.isArray(result.payload) ? result.payload : []));
        }
      } catch (error: any) {
        console.error("Ошибка загрузки товаров:", error);
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, [dispatch, debouncedProductSearch, showMoreProducts]);

  // Загрузка клиентов
  useEffect(() => {
    dispatch(fetchClientsAsync({ type: "client" }));
  }, [dispatch]);

  // Синхронизация выбранных товаров с товарами в корзине
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const productIdsInCart = new Set();
      cartItems.forEach((item) => {
        const productId = item.productId || item.product_id || item.product;
        if (productId) {
          productIdsInCart.add(String(productId));
        }
      });
      setSelectedProductIds(productIdsInCart);
    } else {
      // Если корзина пуста, очищаем выбранные товары
      setSelectedProductIds(new Set());
    }
  }, [cartItems]);

  // Фильтрация клиентов
  const filterClient = useMemo(
    () => (clients || []).filter((c) => c.type === "client"),
    [clients]
  );

  // Получаем выбранного клиента
  const selectedClient = useMemo(
    () => filterClient.find((c) => c.id === clientId),
    [filterClient, clientId]
  );

  // Получаем список контрагентов (используем клиентов как контрагентов)
  // Список складов (пока пустой, так как не загружаются)
  const warehouses: any[] = [];

  // Фильтрация товаров в документе
  const filteredDocumentItems = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return [];
    const search = documentSearch.toLowerCase();
    return cartItems.filter((item) => {
      const name = item.productName || item.name || "";
      return name.toLowerCase().includes(search);
    });
  }, [cartItems, documentSearch]);

  // Расчет итогов
  const totals = useMemo(
    () => computeCartTotals(cartItems, documentDiscount, isDocumentPosted),
    [cartItems, documentDiscount, isDocumentPosted],
  );

  // Добавление товара в корзину
  const handleAddProduct = async (productId) => {
    if (addingProduct) return; // Предотвращаем множественные клики

    setAddingProduct(true);
    try {
      // Находим товар в списке продуктов
      const product = products.find((p) => p.id === productId);
      if (!product) {
        alert("Товар не найден");
        return;
      }

      // Проверяем, есть ли уже этот товар в корзине
      const existingItemIndex = cartItems.findIndex(
        (item) => item.productId === productId
      );

      if (existingItemIndex >= 0) {
        // Увеличиваем количество существующего товара
        setCartItems((prev) => {
          const updated = [...prev];
          updated[existingItemIndex] = {
            ...updated[existingItemIndex],
            quantity: updated[existingItemIndex].quantity + 1,
          };
          return updated;
        });
      } else {
        // Добавляем новый товар в корзину
        const newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          productName: product.name,
          name: product.name,
          price: Number(product.price || 0),
          unit_price: Number(product.price || 0),
          quantity: 1,
          unit: product.unit || "шт",
          discount: 0,
          discount_percent: 0,
          article: product.article || "",
        };
        setCartItems((prev) => [...prev, newItem]);
      }

      // Добавляем товар в список выбранных
      setSelectedProductIds((prev) => new Set([...prev, productId]));
    } catch (error: any) {
      console.error("Ошибка при добавлении товара:", error);
      alert("Ошибка при добавлении товара");
    } finally {
      setAddingProduct(false);
    }
  };

  // Изменение количества товара
  const handleQuantityChange = (itemId, newQuantity) => {
    setCartItems((prev) => updateCartItemQuantity(prev, itemId, newQuantity));
  };

  const handleRemoveProduct = (itemId) => {
    setCartItems((prev) => removeCartItem(prev, itemId));
  };

  // Сохранение документа
  const handleSave = async () => {
    if (!cartItems || cartItems.length === 0) {
      alert("Добавьте товары в документ");
      return;
    }

    if (!warehouse) {
      alert("Выберите склад");
      return;
    }

    if (isWarehouseToRequired && !warehouseTo) {
      alert("Выберите склад получатель");
      return;
    }

    if (isWarehouseToRequired && warehouse === warehouseTo) {
      alert("Склад отправитель и склад получатель должны быть разными");
      return;
    }

    if (isCounterpartyRequired && !clientId) {
      const counterpartyLabel = docType === "SALE" || docType === "SALE_RETURN" ? "клиента" : "поставщика";
      alert(`Выберите ${counterpartyLabel}`);
      return;
    }

    try {
      // Формируем данные для создания документа через новый API
      const documentData = {
        doc_type: docType,
        warehouse_from: warehouse,
        ...(isWarehouseToRequired ? { warehouse_to: warehouseTo } : {}),
        ...(isCounterpartyRequired && clientId ? { counterparty: clientId } : {}),
        comment: comment || "",
        items: cartItems.map((item: any) => ({
          product: item.productId,
          qty: String(item.quantity || 1),
          price: String((item.price || item.unit_price || 0).toFixed(2)),
          discount_percent: String(item.discount_percent || item.discount || 0),
        })),
      };

      const result = await dispatch(createWarehouseDocument(documentData));

      if (createWarehouseDocument.fulfilled.match(result)) {
        // Документ успешно создан
        alert("Документ успешно сохранен");

        // Очищаем корзину
        setCartItems([]);
        setSelectedProductIds(new Set());
        setClientId("");
        setWarehouseTo("");
        setDocumentDiscount("");
        setComment("");
        setDocumentSearch("");

        // Переходим на страницу документов
        navigate("/crm/market/documents");
      } else {
        // Ошибка при создании
        const error = result.payload || result.error;
        const errorMessage = error?.detail || error?.message || "Ошибка при сохранении документа";
        alert("Ошибка: " + errorMessage);
      }
    } catch (error: any) {
      console.error("Ошибка при сохранении документа:", error);
      alert("Ошибка: " + (error.message || "Не удалось сохранить документ"));
    }
  };

  // Вспомогательная функция для скачивания blob

  // Сохранение и печать
  const handleSaveAndPrint = async (printType: any) => {
    if (!cartItems || cartItems.length === 0) {
      alert("Добавьте товары в документ");
      return;
    }

    try {
      // Сначала создаем документ через новый API
      const documentData = {
        doc_type: docType,
        warehouse_from: warehouse,
        ...(isWarehouseToRequired ? { warehouse_to: warehouseTo } : {}),
        ...(isCounterpartyRequired && clientId ? { counterparty: clientId } : {}),
        comment: comment || "",
        items: cartItems.map((item: any) => ({
          product: item.productId,
          qty: String(item.quantity || 1),
          price: String((item.price || item.unit_price || 0).toFixed(2)),
          discount_percent: String(item.discount_percent || item.discount || 0),
        })),
      };

      const createResult = await dispatch(createWarehouseDocument(documentData));

      if (!createWarehouseDocument.fulfilled.match(createResult)) {
        const error = createResult.payload || createResult.error;
        const errorMessage = error?.detail || error?.message || "Ошибка при создании документа";
        alert("Ошибка: " + errorMessage);
        return;
      }

      const _createdDocument = createResult.payload;

      // Получаем данные компании и контрагента
      const selectedCounterparty = selectedClient || filterClient.find((c) => c.id === clientId);
      const warehouseName = warehouse
        ? (warehouses.length > 0 ? warehouses.find((w) => w.id === warehouse)?.name : null) ||
        cashBoxes?.find((b) => b.id === warehouse)?.name ||
        warehouse
        : null;
      const _warehouseToName = warehouseTo
        ? (warehouses.length > 0 ? warehouses.find((w) => w.id === warehouseTo)?.name : null) ||
        cashBoxes?.find((b) => b.id === warehouseTo)?.name ||
        warehouseTo
        : null;

      // Получаем скидку по документу
      const discountPercent = Number(documentDiscount) || 0;

      // Формируем данные для PDF из текущей корзины
      const items = cartItems.map((item, idx) => {
        const itemName = item.productName || item.name || "Товар";
        const itemPrice = Number(item.price || item.unit_price || 0);
        const itemQty = Number(item.quantity || 1);
        const itemDiscount = Number(
          item.discount_percent || item.discount || 0
        );
        const itemSubtotal = itemPrice * itemQty;

        // Скидка по позиции
        const itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
        const itemSubtotalAfterItemDiscount = itemSubtotal - itemDiscountAmount;

        // Применяем скидку по документу к товару после скидки по позиции
        // Скидка по документу применяется пропорционально к каждому товару
        const documentDiscountAmount =
          (itemSubtotalAfterItemDiscount * discountPercent) / 100;
        const itemTotal =
          itemSubtotalAfterItemDiscount - documentDiscountAmount;

        return {
          id: item.id || idx,
          name: itemName,
          qty: String(itemQty),
          unit_price: String(itemPrice.toFixed(2)),
          total: String(itemTotal.toFixed(2)),
          unit: item.unit || "ШТ",
          article: item.article || "",
          discount_percent: itemDiscount,
          price_before_discount: String(itemPrice.toFixed(2)), // Цена без скидки (исходная цена товара)
        };
      });

      // Формируем номер документа
      const docNumber = documentId.substring(0, 8) || "00001";
      const currentDate = documentDateValue
        ? new Date(documentDateValue)
        : new Date();

      if (printType === "invoice") {
        // Формируем данные для накладной
        const invoiceData = {
          document: {
            type: "sale_invoice",
            title: "Накладная",
            id: documentId,
            number: docNumber,
            date: currentDate.toISOString().split("T")[0],
            datetime: currentDate.toISOString(),
            created_at: currentDate.toISOString(),
            discount_percent: discountPercent, // Передаем скидку по документу
          },
          seller: {
            id: company?.id || "",
            name: company?.name || "",
            inn: company?.inn || "",
            okpo: company?.okpo || "",
            score: company?.score || "",
            bik: company?.bik || "",
            address: company?.address || "",
            phone: company?.phone || null,
            email: company?.email || null,
          },
          buyer: selectedClient
            ? {
              id: selectedCounterparty.id,
              name: selectedCounterparty.name || "",
              inn: selectedCounterparty.inn || "",
              okpo: selectedCounterparty.okpo || "",
              score: selectedCounterparty.score || "",
              bik: selectedCounterparty.bik || "",
              address: selectedCounterparty.address || "",
              phone: selectedCounterparty.phone || null,
              email: selectedCounterparty.email || null,
            }
            : null,
          items: items,
          totals: {
            subtotal: String(totals.subtotal.toFixed(2)),
            discount_total: String(totals.totalDiscount.toFixed(2)),
            tax_total: "0.00",
            total: String(totals.total.toFixed(2)),
          },
          warehouse: warehouseName,
        };

        // Генерируем PDF накладной
        const blob = await pdf(
          <InvoicePdfDocument data={invoiceData} />
        ).toBlob();
        downloadBlob(blob, `invoice_${docNumber}.pdf`);
      } else if (printType === "receipt") {
        // Формируем данные для чека
        const receiptData = {
          document: {
            type: "receipt",
            title: "Товарный чек",
            id: documentId,
            number: docNumber,
            doc_no: docNumber,
            date: currentDate.toISOString().split("T")[0],
            created_at: currentDate.toISOString(),
          },
          company: {
            id: company?.id || "",
            name: company?.name || "",
            address: company?.address || "",
            phone: company?.phone || null,
          },
          cashier: {
            id: userProfile?.id || "",
            name: userProfile?.full_name || userProfile?.name || "",
          },
          client: selectedClient
            ? {
              id: selectedCounterparty.id,
              full_name: selectedCounterparty.name || "",
            }
            : null,
          items: items,
          totals: {
            subtotal: String(totals.subtotal.toFixed(2)),
            discount_total: String(totals.totalDiscount.toFixed(2)),
            tax_total: "0.00",
            total: String(totals.total.toFixed(2)),
          },
          payment: {
            method: "cash",
            cash_received: String(totals.total.toFixed(2)),
            change: "0.00",
            paid_at: currentDate.toISOString(),
          },
          warehouse: warehouseName,
        };

        // Генерируем PDF чека
        const blob = await pdf(
          <ReceiptPdfDocument data={receiptData} />
        ).toBlob();
        downloadBlob(blob, `receipt_${docNumber}.pdf`);
      } else if (printType === "ko1") {
        const ko1Data = {
          organization: company?.name || "",
          structuralUnit: "",
          documentNumber: String(docNumber),
          date: currentDate.toISOString().split("T")[0],
          receivedFrom: selectedCounterparty?.name || "",
          basis: comment || "Оплата по договору",
          amountNumber: totals.total.toLocaleString("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          amountWords: numberToWords(totals.total),
          chiefAccountant:
            userProfile?.full_name || userProfile?.name || "",
          cashier: userProfile?.full_name || userProfile?.name || "",
        };

        const blob = await pdf(
          <Ko1PdfDocument data={ko1Data} />
        ).toBlob();
        downloadBlob(
          blob,
          `ko1_${String(docNumber).replace(/[^\w.-]+/g, "_")}.pdf`,
        );
      }

      // Очищаем корзину после успешного скачивания PDF
      setCartItems([]);

      // Сбрасываем локальное состояние
      setSelectedProductIds(new Set());
      setClientId("");
      setDocumentDiscount("");
      setComment("");
      setDocumentSearch("");

      navigate("/crm/market/documents");
    } catch (error: any) {
      console.error("Ошибка генерации PDF:", error);
      alert("Ошибка: " + (error.message || "Не удалось сгенерировать PDF"));
    }
  };



  return {
    activeTab,
    addingProduct,
    cartItems,
    clientId,
    comment,
    dateInputRef,
    displayDate,
    documentDateValue,
    documentDiscount,
    documentSearch,
    filterClient,
    filteredDocumentItems,
    handleAddProduct,
    handleQuantityChange,
    handleRemoveProduct,
    handleSave,
    handleSaveAndPrint,
    isDocumentPosted,
    navigate,
    productSearch,
    products,
    productsLoading,
    selectedProductIds,
    setActiveTab,
    setClientId,
    setComment,
    setDocumentDateValue,
    setDocumentDiscount,
    setDocumentSearch,
    setIsDocumentPosted,
    setProductSearch,
    setShowMoreProducts,
    setShowSavePrintMenu,
    showMoreProducts,
    showSavePrintMenu,
    totals,
    date: documentDateValue,
    document: null as any,
    documentId,
    documents: [] as any,
  };
}
