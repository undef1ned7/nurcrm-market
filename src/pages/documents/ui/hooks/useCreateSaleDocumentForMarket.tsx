import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { pdf } from "@react-pdf/renderer";
import ReceiptPdfDocument from "../components/ReceiptPdfDocument";
import InvoicePdfDocument from "../components/InvoicePdfDocument";
import {
    fetchWarehouseCounterparties,
    createWarehouseDocument,
    fetchWarehouses,
} from "@entities/warehouse";
import { useCash } from "@entities/cash";
import { useCounterparty } from "@entities/counterparty";
import { useUser } from "@entities/user";
import {
  formatDisplayDate,
  downloadBlob,
  computeCartTotals,
  updateCartItemQuantity,
  removeCartItem,
} from "../create-sale/utils";
import { useAlert, useErrorModal } from "@shared/hooks/useDialog";
import { fetchProductsAsync } from "@entities/product";
import { useProducts } from "@entities/product";
import { useDebouncedValue } from "@shared/hooks/useDebounce";


export function useCreateSaleDocumentForMarket() {
    ///Modal
    const alert = useAlert() as any
    const error = useErrorModal() as any


    const dispatch = useDispatch() as any;
    const navigate = useNavigate();
    const { company, profile: userProfile } = useUser();
    const { list: cashBoxes } = useCash();
    const { list: counterparties } = useCounterparty();
    const [selectedProductIds, setSelectedProductIds] = useState<any>(new Set());


    ////Products
    const [products, setProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState<any>("");
    const debouncedProductSearch = useDebouncedValue(productSearch, 500, () => {
        setShowMoreProducts(1)
    })
    const [showMoreProducts, setShowMoreProducts] = useState(1);
    const [addingProduct, setAddingProduct] = useState<any>(false);
    const { next: isNextPageProducts, loading: productsLoading, error: productsFetchError } = useProducts();
    const uniqueProductsList = useMemo(() => {
        const reduced = products.reduce((acc: any, item: any) => {
            if (acc.ids.includes(item.id)) return acc;
            acc.list.push(item)
            acc.ids.push(item.id)
            return acc
        }, {
            ids: [],
            list: []
        })
        return reduced.list
    }, [products]);
    useEffect(() => {
        if (productsLoading || !productsFetchError) return;
        error('Ошибка при загрузке товаров!')
    }, [productsFetchError, productsLoading, error]);
    //////


    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [warehouse, setWarehouse] = useState<any>("");
    const [warehouseTo, setWarehouseTo] = useState<any>("");
    const [clientId, setClientId] = useState<any>("");
    const [docType, setDocType] = useState("SALE");
    const [activeTab, setActiveTab] = useState("products");
    const [documentSearch, setDocumentSearch] = useState<any>("");
    const [isDocumentPosted, setIsDocumentPosted] = useState<any>(false);
    const [documentDateValue, setDocumentDateValue] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [showSavePrintMenu, setShowSavePrintMenu] = useState<any>(false);
    const dateInputRef = useRef<any>(null);
    const [documentDiscount, setDocumentDiscount] = useState<any>("");
    const [comment, setComment] = useState<any>("");
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [documentId] = useState(
        () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );


    // Форматирование даты для отображения

    const displayDate = formatDisplayDate(
        documentDateValue ? new Date(documentDateValue).toISOString() : null
    );




    // Загрузка товаров через новый warehouse API
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const result = await dispatch(fetchProductsAsync({
                    search: debouncedProductSearch || undefined,
                    page: showMoreProducts,
                }));
                if (fetchProductsAsync.fulfilled.match(result)) {
                    // Обрабатываем стандартный формат DRF пагинации
                    setProducts(prev => [...prev, ...(result.payload?.results || (Array.isArray(result.payload) ? result.payload : []))]);
                }
            } catch (error: any) {
                error("Ошибка загрузки товаров")
                console.error("Ошибка загрузки товаров:", error);
            }
        };
        loadProducts();
    }, [dispatch, debouncedProductSearch, showMoreProducts]);

    // Загрузка контрагентов через warehouse API
    useEffect(() => {
        // Загружаем всех контрагентов (CLIENT, SUPPLIER, BOTH)
        dispatch(fetchWarehouseCounterparties(undefined));
    }, [dispatch]);

    // Загрузка складов через новый warehouse API
    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const result = await dispatch(fetchWarehouses(undefined));
                if (fetchWarehouses.fulfilled.match(result)) {
                    setWarehouses(result.payload?.results || (Array.isArray(result.payload) ? result.payload : []));
                }
            } catch (error: any) {
                console.error("Ошибка загрузки складов:", error);
            }
        };
        loadWarehouses();
    }, [dispatch]);

    // Синхронизация выбранных товаров с товарами в корзине
    useEffect(() => {
        if (cartItems && cartItems.length > 0) {
            const productIdsInCart = new Set();
            cartItems.forEach((item: any) => {
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

    // Фильтрация контрагентов в зависимости от типа документа
    const filteredCounterparties = useMemo(() => {
        const all = counterparties || [];
        // Для SALE, SALE_RETURN, PURCHASE, PURCHASE_RETURN нужны контрагенты
        if (["SALE", "SALE_RETURN", "PURCHASE", "PURCHASE_RETURN"].includes(docType)) {
            return all.filter((c: any) => {
                if (docType === "SALE" || docType === "SALE_RETURN") {
                    return c.type === "CLIENT" || c.type === "BOTH";
                }
                if (docType === "PURCHASE" || docType === "PURCHASE_RETURN") {
                    return c.type === "SUPPLIER" || c.type === "BOTH";
                }
                return true;
            });
        }
        // Для других типов документов показываем всех
        return all;
    }, [counterparties, docType]);

    // Определяем, требуется ли контрагент для текущего типа документа
    const isCounterpartyRequired = useMemo(() => {
        return ["SALE", "SALE_RETURN", "PURCHASE", "PURCHASE_RETURN"].includes(docType);
    }, [docType]);

    // Определяем, требуется ли второй склад (для TRANSFER)
    const isWarehouseToRequired = useMemo(() => {
        return docType === "TRANSFER";
    }, [docType]);

    // Фильтрация товаров в документе
    const filteredDocumentItems = useMemo(() => {
        if (!cartItems || cartItems.length === 0) return [];
        const search = documentSearch.toLowerCase();
        return cartItems.filter((item: any) => {
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
    const handleAddProduct = async (productId: any) => {
        if (addingProduct) return; // Предотвращаем множественные клики

        setAddingProduct(true);
        try {
            // Находим товар в списке продуктов
            const product = products.find((p: any) => p.id === productId);
            if (!product) {
                alert("Товар не найден");
                return;
            }

            // Проверяем, есть ли уже этот товар в корзине
            const existingItemIndex = cartItems.findIndex(
                (item: any) => item.productId === productId
            );

            if (existingItemIndex >= 0) {
                // Увеличиваем количество существующего товара
                setCartItems((prev: any) => {
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
                setCartItems((prev: any) => [...prev, newItem]);
            }

            // Добавляем товар в список выбранных
            setSelectedProductIds((prev: any) => new Set([...prev, productId]));
        } catch (error: any) {
            console.error("Ошибка при добавлении товара:", error);
            alert("Ошибка при добавлении товара");
        } finally {
            setAddingProduct(false);
        }
    };

    // Изменение количества товара
    const handleQuantityChange = (itemId: any, newQuantity: any) => {
        setCartItems((prev: any) => updateCartItemQuantity(prev, itemId, newQuantity));
    };

    const handleRemoveProduct = (itemId: any) => {
        setCartItems((prev: any) => removeCartItem(prev, itemId));
    };

    // Сохранение документа
    const handleSave = async () => {
        if (!cartItems || cartItems.length === 0) {
            error("Добавьте товары в документ");
            return;
        }

        if (!warehouse) {
            error("Выберите склад");
            return;
        }

        if (isWarehouseToRequired && !warehouseTo) {
            error("Выберите склад получатель");
            return;
        }

        if (isWarehouseToRequired && warehouse === warehouseTo) {
            error("Склад отправитель и склад получатель должны быть разными");
            return;
        }

        if (isCounterpartyRequired && !clientId) {
            const counterpartyLabel = docType === "SALE" || docType === "SALE_RETURN" ? "клиента" : "поставщика";
            error(`Выберите ${counterpartyLabel}`);
            return;
        }

        try {
            // Формируем данные для создания документа через новый API
            const documentData = {
                doc_type: docType,
                warehouse_from: warehouse,
                ...(isWarehouseToRequired && { warehouse_to: warehouseTo }),
                ...(isCounterpartyRequired && clientId && { counterparty: clientId }),
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
            error("Ошибка: " + (error.message || "Не удалось сохранить документ"));
        }
    };

    // Вспомогательная функция для скачивания blob

    // Сохранение и печать
    const handleSaveAndPrint = async (printType: any) => {
        if (!cartItems || cartItems.length === 0) {
            error("Добавьте товары в документ");
            return;
        }

        if (!warehouse) {
            error("Выберите склад");
            return;
        }

        if (isWarehouseToRequired && !warehouseTo) {
            error("Выберите склад получатель");
            return;
        }

        if (isWarehouseToRequired && warehouse === warehouseTo) {
            error("Склад отправитель и склад получатель должны быть разными");
            return;
        }

        if (isCounterpartyRequired && !clientId) {
            const counterpartyLabel = docType === "SALE" || docType === "SALE_RETURN" ? "клиента" : "поставщика";
            error(`Выберите ${counterpartyLabel}`);
            return;
        }

        try {
            // Сначала создаем документ через новый API
            const documentData = {
                doc_type: docType,
                warehouse_from: warehouse,
                ...(isWarehouseToRequired && { warehouse_to: warehouseTo }),
                ...(isCounterpartyRequired && clientId && { counterparty: clientId }),
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

            const createdDocument = createResult.payload;

            // Получаем данные компании и контрагента
            const selectedCounterparty = filteredCounterparties.find((c: any) => c.id === clientId);
            const warehouseName = warehouse
                ? warehouses.find((w: any) => w.id === warehouse)?.name ||
                cashBoxes?.find((b: any) => b.id === warehouse)?.name ||
                warehouse
                : null;
            const warehouseToName = warehouseTo
                ? warehouses.find((w: any) => w.id === warehouseTo)?.name ||
                cashBoxes?.find((b: any) => b.id === warehouseTo)?.name ||
                warehouseTo
                : null;

            // Получаем скидку по документу
            const discountPercent = Number(documentDiscount) || 0;

            // Формируем данные для PDF из текущей корзины
            const items = cartItems.map((item: any, idx: any) => {
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

            // Используем данные из созданного документа
            const docNumber = createdDocument.number || documentId.substring(0, 8) || "00001";
            const currentDate = createdDocument.date || documentDateValue
                ? new Date(createdDocument.date || documentDateValue)
                : new Date();

            if (printType === "invoice") {
                // Формируем данные для накладной
                const invoiceData = {
                    doc_type: docType, // Передаем тип документа
                    document: {
                        type: "sale_invoice",
                        doc_type: docType,
                        title: "Накладная",
                        id: createdDocument.id || documentId,
                        number: docNumber,
                        date: currentDate.toISOString().split("T")[0],
                        datetime: currentDate.toISOString(),
                        created_at: createdDocument.created_at || currentDate.toISOString(),
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
                    buyer: selectedCounterparty
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
                    warehouse_to: warehouseToName, // Склад получатель для TRANSFER
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
                        id: createdDocument.id || documentId,
                        number: docNumber,
                        doc_no: docNumber,
                        date: currentDate.toISOString().split("T")[0],
                        created_at: createdDocument.created_at || currentDate.toISOString(),
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
                    client: selectedCounterparty
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
            error("Ошибка: " + (error.message || "Не удалось сгенерировать PDF"));
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
    docType,
    documentDateValue,
    documentDiscount,
    documentSearch,
    filteredCounterparties,
    filteredDocumentItems,
    handleAddProduct,
    handleQuantityChange,
    handleRemoveProduct,
    handleSave,
    handleSaveAndPrint,
    isCounterpartyRequired,
    isDocumentPosted,
    isNextPageProducts,
    isWarehouseToRequired,
    productSearch,
    products,
    selectedProductIds,
    setActiveTab,
    setClientId,
    setComment,
    setDocType,
    setDocumentDateValue,
    setDocumentDiscount,
    setDocumentSearch,
    setIsDocumentPosted,
    setProductSearch,
    setShowMoreProducts,
    setShowSavePrintMenu,
    setWarehouse,
    setWarehouseTo,
    showSavePrintMenu,
    totals,
    uniqueProductsList,
    warehouse,
    warehouseTo,
    warehouses,
    cashBoxes,
    counterparty: clientId,
    date: documentDateValue,
    document: null as any,
    documentId,
    productsLoading,
  };
}
