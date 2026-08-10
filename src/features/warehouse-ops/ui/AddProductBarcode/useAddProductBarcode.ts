import { useEffect, useState, useMemo, useRef } from "react";
import useScanDetection from "@shared/hooks/useScanDetection";
import {
  getProductByBarcodeAsync,
  createProductWithBarcode,
  scanWarehouseProductAsync,
  fetchProductsAsync,
} from "@entities/product";
import {
  useProducts,
  clearScannedProduct,
} from "@entities/product";
import { addCashFlows } from "@entities/cash";
import { useUser } from "@entities/user";
import {
  fetchClientsAsync,
  createClientAsync,
} from "@entities/client";
import { useClient } from "@entities/client";
import { createDeal } from "@entities/sale";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAppDispatch } from "@app/store";
import {
  buildPromotionRulesInput,
  parseAlternateBarcodesForApi,
} from "../AddProductPage/utils/productUtils";

// Функция для создания долга
async function createDebt(payload) {
  const res = await api.post("/main/debts/", payload);
  return res.data;
}

const initialSupplierFormState = {
  full_name: "",
  phone: "",
  email: "",
  date: new Date().toISOString().split("T")[0],
  type: "suppliers",
  llc: "",
  inn: "",
  okpo: "",
  score: "",
  bik: "",
  address: "",
};

export const useAddProductBarcode = ({
  onClose: _onAddModalClose,
  onShowSuccessAlert,
  onShowErrorAlert,
  onShowSupplierCreated,
  selectCashBox,
  warehouseUuid,
  warehouseCategories = [],
  warehouseCategory,
  onWarehouseCategoryChange,
  cashBoxes = [],
}: any) => {
  const {
    scannedProduct,
    scanningProduct,
    scanProductError,
    addingToWarehouse,
    addToWarehouseError,
    barcodeError,
  } = useProducts();
  const { company } = useUser();
  const { list: clients = [] } = useClient();

  const [barcodeScan, setBarcodeScan] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState({
    name: "",
    quantity: "1",
    price: "",
    wholesale_price: "",
    purchase_price: "",
    markup: "0",
    plu: "",
    scale_type: "",
    alternateBarcodesText: "",
  });
  const [isPriceManuallyChanged, setIsPriceManuallyChanged] = useState(false);
  const [isMarkupManuallyChanged, setIsMarkupManuallyChanged] = useState(false);
  const [stockPromo, setStockPromo] = useState(false);
  const [promotionRules, setPromotionRules] = useState<any[]>([]);
  const [debt, setDebt] = useState("");
  const [amount, setAmount] = useState("");
  const [debtMonths, setDebtMonths] = useState("");
  const [clientId, setClientId] = useState("");
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const showSupplierFormRef = useRef(showSupplierForm);
  showSupplierFormRef.current = showSupplierForm;
  const [supplierFormState, setSupplierFormState] = useState(
    initialSupplierFormState
  );
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [debtState, setDebtState] = useState({
    phone: "",
    dueDate: "",
  });
  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "expense",
    name: "",
    amount: "",
    source_cashbox_flow_id: "",
    source_business_operation_id: "Склад",
    status:
      company?.subscription_plan?.name === "Старт" ? "approved" : "pending",
  });
  const dispatch = useAppDispatch();

  // Refs для отслеживания последних обработанных ошибок (чтобы избежать бесконечных циклов)
  const lastScanErrorRef = useRef<any>(null);
  const lastAddErrorRef = useRef<any>(null);
  const lastBarcodeErrorRef = useRef<any>(null);
  const lastSyncedScanKeyRef = useRef<any>(null);

  // Ref для хранения функции onShowErrorAlert, чтобы она не менялась при каждом рендере
  const onShowErrorAlertRef = useRef(onShowErrorAlert);

  // Обновляем ref при изменении функции
  useEffect(() => {
    onShowErrorAlertRef.current = onShowErrorAlert;
  }, [onShowErrorAlert]);

  // Фильтрация клиентов
  const filterClient = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).filter(
        (c) => c.type === "suppliers"
      ),
    [clients]
  );

  const pickClient = useMemo(
    () => filterClient.find((x) => String(x.id) === String(clientId)),
    [filterClient, clientId]
  );

  // Автоматическое заполнение телефона при выборе клиента в тарифе "Старт"
  useEffect(() => {
    if (company?.subscription_plan?.name === "Старт" && pickClient?.phone) {
      setDebtState((prev) => ({ ...prev, phone: pickClient.phone }));
    }
  }, [clientId, pickClient, company?.subscription_plan?.name]);

  // Загрузка клиентов
  useEffect(() => {
    dispatch(fetchClientsAsync({} as any) as any);
  }, [dispatch]);

  const onChange = (e) => {
    const { name, value } = e.target;

    // Если меняется наценка, помечаем что она изменена вручную
    if (name === "markup") {
      setIsMarkupManuallyChanged(true);
    }

    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик изменения цены продажи
  const handlePriceChange = (e) => {
    const { value } = e.target;
    setIsPriceManuallyChanged(true);
    onChange(e);

    // Если пользователь сам НЕ трогал наценку, считаем её из цены закупки и цены продажи
    if (!isMarkupManuallyChanged) {
      const purchasePrice = parseFloat(state.purchase_price) || 0;
      const sellingPrice = parseFloat(value) || 0;

      if (purchasePrice > 0 && sellingPrice > 0) {
        const markupPercent = (sellingPrice / purchasePrice - 1) * 100;
        const roundedMarkup = Math.round(markupPercent * 100) / 100;
        setState((prev) => ({
          ...prev,
          markup: roundedMarkup.toString(),
        }));
      }
    }
  };

  // Автоматический расчет цены продажи на основе цены закупки и наценки
  useEffect(() => {
    if (!isPriceManuallyChanged) {
      const purchasePrice = parseFloat(state.purchase_price) || 0;
      const markup = parseFloat(state.markup) || 0;

      if (purchasePrice > 0 && markup >= 0) {
        const sellingPrice = purchasePrice * (1 + markup / 100);
        const calculatedPrice = Math.round(sellingPrice * 100) / 100;

        setState((prev) => ({
          ...prev,
          price: calculatedPrice.toString(),
        }));
      } else if (purchasePrice === 0 && markup === 0) {
        setState((prev) => ({
          ...prev,
          price: "",
        }));
      }
    }
  }, [state.purchase_price, state.markup, isPriceManuallyChanged]);

  // Сброс флага ручного изменения при изменении цены закупки или наценки
  useEffect(() => {
    setIsPriceManuallyChanged(false);
  }, [state.purchase_price, state.markup]);

  const onChangeDebt = (e) => {
    const { name, value } = e.target;
    setDebtState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierFormChange = (e) => {
    const { name, value } = e.target;
    setSupplierFormState((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormState.full_name?.trim()) {
      if (onShowErrorAlert) onShowErrorAlert("Введите ФИО поставщика");
      return;
    }
    setCreatingSupplier(true);
    try {
      const client = await dispatch(
        createClientAsync(supplierFormState)
      ).unwrap();
      await dispatch(fetchClientsAsync({} as any) as any);
      setShowSupplierForm(false);
      if (client?.id) {
        setClientId(String(client.id));
      }
      setSupplierFormState(initialSupplierFormState);
      if (onShowSupplierCreated) {
        onShowSupplierCreated("Поставщик успешно создан!");
      }
    } catch (err: any) {
      const msg = validateResErrors(err, "Ошибка при создании поставщика");
      if (onShowErrorAlert) onShowErrorAlert(msg);
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Не обрабатывать скан, если пользователь вводит текст в поле (форма поставщика, долга или любое input/textarea/select)
  useScanDetection({
    onComplete: (scanned) => {
      const active = document.activeElement;
      const isInputFocused =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT");
      if (isInputFocused || showSupplierFormRef.current) {
        return;
      }
      if (scanned.length >= 3) {
        setBarcodeScan(scanned);
      }
    },
    minLength: 3,
  });

  useEffect(() => {
    if (!barcodeScan) return;

    // Очищаем предыдущий результат
    lastSyncedScanKeyRef.current = null;
    dispatch(clearScannedProduct({} as any) as any);

    (async () => {
      try {
        await dispatch(getProductByBarcodeAsync(barcodeScan)).unwrap();
        setBarcodeScan(""); // Очищаем штрих-код после успешного сканирования
      } catch (err: any) {
        console.error("Ошибка при получении товара по штрих-коду:", err);
        const errorMsg = "Товар с таким штрих-кодом не найден";
        setBarcodeScan(""); // Очищаем штрих-код даже при ошибке

        // Показываем AlertModal через колбэк (закрываем AddModal и показываем ошибку)
        if (onShowErrorAlert) {
          onShowErrorAlert(errorMsg);
        }
      }
    })();
  }, [barcodeScan, dispatch, onShowErrorAlert]);

  // Отслеживаем ошибки из Redux состояния (с защитой от повторных вызовов)
  useEffect(() => {
    if (!scanProductError) {
      lastScanErrorRef.current = null;
      return;
    }

    const errorId =
      scanProductError?.response?.data?.barcode ||
      scanProductError?.message ||
      String(scanProductError);

    // Проверяем, не обрабатывали ли мы уже эту ошибку
    if (lastScanErrorRef.current !== errorId && onShowErrorAlertRef.current) {
      lastScanErrorRef.current = errorId;
      const errorMsg = validateResErrors(
        scanProductError,
        "Произошла ошибка при добавлении товара в склад",
      );

      // Используем setTimeout, чтобы избежать синхронных обновлений состояния
      setTimeout(() => {
        if (onShowErrorAlertRef.current) {
          onShowErrorAlertRef.current(errorMsg);
        }
      }, 0);
    }
  }, [scanProductError]);

  useEffect(() => {
    if (!addToWarehouseError) {
      lastAddErrorRef.current = null;
      return;
    }

    const errorId =
      addToWarehouseError?.response?.data?.barcode ||
      addToWarehouseError?.message ||
      String(addToWarehouseError);

    // Проверяем, не обрабатывали ли мы уже эту ошибку
    if (lastAddErrorRef.current !== errorId && onShowErrorAlertRef.current) {
      lastAddErrorRef.current = errorId;
      const errorMsg = validateResErrors(
        addToWarehouseError,
        "Произошла ошибка при добавлении товара в склад",
      );

      // Используем setTimeout, чтобы избежать синхронных обновлений состояния
      setTimeout(() => {
        if (onShowErrorAlertRef.current) {
          onShowErrorAlertRef.current(errorMsg);
        }
      }, 0);
    }
  }, [addToWarehouseError]);

  useEffect(() => {
    if (!barcodeError) {
      lastBarcodeErrorRef.current = null;
      return;
    }

    const data = barcodeError?.response?.data;
    const errorId =
      data?.barcode ||
      (data && typeof data === "object" ? JSON.stringify(data) : null) ||
      barcodeError?.message ||
      String(barcodeError);

    // Проверяем, не обрабатывали ли мы уже эту ошибку
    if (
      lastBarcodeErrorRef.current !== errorId &&
      onShowErrorAlertRef.current
    ) {
      lastBarcodeErrorRef.current = errorId;
      let errorMsg = data?.barcode;
      if (!errorMsg && data && typeof data === "object") {
        const parts: any[] = [];
        if (Array.isArray(data.category)) parts.push(`Категория: ${data.category[0] ?? "Обязательное поле."}`);
        if (Array.isArray(data.warehouse)) parts.push(`Склад: ${data.warehouse[0] ?? "Обязательное поле."}`);
        if (parts.length > 0) errorMsg = parts.join(". ");
      }
      if (!errorMsg)
        errorMsg = validateResErrors(
          barcodeError,
          "Произошла ошибка при добавлении товара в склад",
        );

      setTimeout(() => {
        if (onShowErrorAlertRef.current) {
          onShowErrorAlertRef.current(errorMsg);
        }
      }, 0);
    }
  }, [barcodeError]);

  // Заполняем поля только при новом сканировании, не перезаписывая ручные правки
  useEffect(() => {
    if (!scannedProduct) {
      lastSyncedScanKeyRef.current = null;
      return;
    }

    const scanKey =
      scannedProduct.barcode ||
      scannedProduct.id ||
      scannedProduct.uuid ||
      null;
    if (!scanKey || lastSyncedScanKeyRef.current === scanKey) return;

    lastSyncedScanKeyRef.current = scanKey;
    setState((prev) => ({
      ...prev,
      name: scannedProduct.name || "",
      price:
        scannedProduct.price != null && scannedProduct.price !== ""
          ? String(scannedProduct.price)
          : prev.price,
      purchase_price:
        scannedProduct.purchase_price != null &&
        scannedProduct.purchase_price !== ""
          ? String(scannedProduct.purchase_price)
          : prev.purchase_price,
      wholesale_price:
        scannedProduct.wholesale_price != null &&
        scannedProduct.wholesale_price !== ""
          ? String(scannedProduct.wholesale_price)
          : prev.wholesale_price,
      plu:
        scannedProduct.plu != null && scannedProduct.plu !== ""
          ? String(scannedProduct.plu)
          : prev.plu,
      scale_type: scannedProduct.scale_type || prev.scale_type,
    }));
  }, [scannedProduct]);

  const handleAddToWarehouse = async () => {
    if (!scannedProduct || quantity <= 0) return;

    try {
      // Валидация для долговых операций
      if (debt && !clientId) {
        if (onShowErrorAlert) {
          onShowErrorAlert("Выберите клиента для долговой операции");
        }
        return;
      }

      if (debt === "Долги") {
        if (!debtMonths || Number(debtMonths) <= 0) {
          if (onShowErrorAlert) {
            onShowErrorAlert("Введите корректный срок долга");
          }
          return;
        }
        if (company?.subscription_plan?.name === "Старт") {
          if (!debtState.dueDate) {
            if (onShowErrorAlert) {
              onShowErrorAlert("Выберите дату");
            }
            return;
          }
          if (!debtState.phone) {
            if (onShowErrorAlert) {
              onShowErrorAlert("Введите номер телефона");
            }
            return;
          }
        }
      }

      if (debt === "Предоплата") {
        if (!amount || Number(amount) <= 0) {
          if (onShowErrorAlert) {
            onShowErrorAlert("Введите корректную сумму предоплаты");
          }
          return;
        }
        const totalAmount =
          Number(state.quantity) * Number(state.purchase_price);
        if (Number(amount) > totalAmount) {
          if (onShowErrorAlert) {
            onShowErrorAlert("Сумма предоплаты не может превышать общую сумму");
          }
          return;
        }
        if (!debtMonths || Number(debtMonths) <= 0) {
          if (onShowErrorAlert) {
            onShowErrorAlert("Введите корректный срок долга");
          }
          return;
        }
      }

      // Для сферы склад: обязательные поля category и warehouse
      if (warehouseUuid) {
        if (!warehouseCategory || (typeof warehouseCategory === "string" && !String(warehouseCategory).trim())) {
          if (onShowErrorAlert) {
            onShowErrorAlert("Категория: Обязательное поле.");
          }
          return;
        }
      }

      if (stockPromo) {
        const built = buildPromotionRulesInput(promotionRules);
        if (built.length === 0) {
          if (onShowErrorAlert) {
            onShowErrorAlert(
              "Для акционного товара добавьте хотя бы одну ступень скидки (сумма от, %).",
            );
          }
          return;
        }
      }

      // Нормализуем наценку: если не заполнена, считаем её 0
      const normalizedMarkup =
        state.markup !== undefined &&
        state.markup !== null &&
        String(state.markup).trim() !== ""
          ? String(state.markup)
          : "0";

      const payload = {
        barcode: scannedProduct.barcode,
        ...state,
        client: clientId || null,
        alternate_barcodes: parseAlternateBarcodesForApi(
          state.alternateBarcodesText,
          scannedProduct.barcode,
        ),
        markup_percent: normalizedMarkup,
        plu: state.plu ? Number(state.plu) : null,
        scale_type: state.scale_type || null,
        stock: stockPromo,
        promotion_rules_input: stockPromo
          ? buildPromotionRulesInput(promotionRules)
          : [],
      };
      const result = await dispatch(
        warehouseUuid
          ? scanWarehouseProductAsync({
              warehouse_uuid: warehouseUuid,
              warehouse: warehouseUuid,
              category: warehouseCategory,
              ...payload,
            })
          : createProductWithBarcode(payload)
      ).unwrap();

      const totalAmount = Number(state.quantity) * Number(state.purchase_price);

      // Создание долга, если выбран
      if (debt === "Долги" && clientId) {
        if (company?.subscription_plan?.name === "Старт") {
          await createDebt({
            name: pickClient?.full_name,
            phone: debtState.phone,
            due_date: debtState.dueDate,
            amount: totalAmount,
          });
        }

        // Создание сделки
        await dispatch(
          createDeal({
            clientId: clientId,
            title: `Долг ${pickClient?.full_name}`,
            statusRu: debt,
            amount: totalAmount,
            debtMonths: Number(debtMonths),
          })
        ).unwrap();
      }

      if (debt === "Предоплата" && clientId) {
        await dispatch(
          createDeal({
            clientId: clientId,
            title: `Предоплата ${pickClient?.full_name}`,
            statusRu: debt,
            amount: totalAmount,
            prepayment: Number(amount),
            debtMonths: Number(debtMonths),
          })
        ).unwrap();
      }

      // Запрос на кассу при добавлении через сканер (если не долг)
      if (debt !== "Долги") {
        const amountForCash = debt === "Предоплата" ? amount : totalAmount;
        const cashboxId =
          cashData.cashbox ||
          selectCashBox ||
          (cashBoxes?.[0]?.id ?? cashBoxes?.[0]);
        const sourceId = result?.id ?? result?.product_id ?? result?.product?.id;
        if (cashboxId && Number(amountForCash) > 0) {
          try {
            await dispatch(
              addCashFlows({
                cashbox: cashboxId,
                type: cashData.type || "expense",
                name: state.name === "" ? "Товар" : state.name,
                amount: amountForCash,
                source_cashbox_flow_id: sourceId ?? result?.id,
                source_business_operation_id:
                  cashData.source_business_operation_id || "Склад",
                status: cashData.status || "pending",
              })
            ).unwrap();
          } catch (cashError: any) {
            console.warn("Ошибка при создании денежного потока:", cashError);
          }
        }
      }

      // Сохраняем имя товара для модалки успеха перед очисткой
      const productName = state.name || "Неизвестный товар";

      // Очищаем все поля формы после успешного добавления
      setQuantity(1);
      setState({
        name: "",
        quantity: "1",
        price: "",
        wholesale_price: "",
        purchase_price: "",
        markup: "0",
        plu: "",
        scale_type: "",
        alternateBarcodesText: "",
      });
      setStockPromo(false);
      setPromotionRules([]);
      setIsPriceManuallyChanged(false);
      setIsMarkupManuallyChanged(false);
      setBarcodeScan("");
      setCashData((prev) => ({
        ...prev,
        name: "",
        amount: "",
      }));
      // Очищаем данные долга
      setDebt("");
      setAmount("");
      setDebtMonths("");
      setClientId("");
      setShowDebtForm(false);
      setDebtState({
        phone: "",
        dueDate: "",
      });

      dispatch(fetchProductsAsync({} as any) as any);
      // Очищаем отсканированный товар
      dispatch(clearScannedProduct({} as any) as any);

      // Показываем модалку успеха через колбэк (закрывает AddModal и показывает успех)
      if (onShowSuccessAlert) {
        onShowSuccessAlert(productName);
      }
    } catch (err: any) {
      console.error("Ошибка при добавлении товара в склад:", err);

      // Показываем модалку ошибки через колбэк (закрывает AddModal и показывает ошибку)
      const errorMsg = validateResErrors(
        err,
        "Произошла ошибка при добавлении товара в склад",
      );
      console.log(errorMsg);

      if (onShowErrorAlert) {
        onShowErrorAlert(errorMsg);
      }
    }
  };

  useEffect(() => {
    if (selectCashBox) {
      setCashData((prev) => ({
        ...prev,
        cashbox: selectCashBox,
      }));
    }
  }, [selectCashBox]);

  const handleCancel = () => {
    dispatch(clearScannedProduct({} as any) as any);
    lastSyncedScanKeyRef.current = null;
    setQuantity(1);
    setState({
      name: "",
      quantity: "1",
      price: "",
      wholesale_price: "",
      purchase_price: "",
      markup: "0",
      plu: "",
      scale_type: "",
      alternateBarcodesText: "",
    });
    setStockPromo(false);
    setPromotionRules([]);
    setIsPriceManuallyChanged(false);
    setIsMarkupManuallyChanged(false);
    setBarcodeScan("");
    setCashData((prev) => ({
      ...prev,
      name: "",
      amount: "",
    }));
    // Очищаем данные долга
    setDebt("");
    setAmount("");
    setDebtMonths("");
    setClientId("");
    setShowDebtForm(false);
    setDebtState({
      phone: "",
      dueDate: "",
    });
  };

  // Вычисляем общую сумму
  const totalAmount =
    Number(state.quantity || 0) * Number(state.purchase_price || 0);

  const handleStockPromoBarcodeChange = (checked) => {
    setStockPromo(checked);
    setPromotionRules((prev) => {
      if (!checked) return [];
      if (prev.length === 0) {
        return [
          {
            id: Date.now(),
            position: 0,
            min_amount: "",
            discount_percent: "",
            promo_quantity: "",
          },
        ];
      }
      return prev;
    });
  };

  return {
    initialSupplierFormState,
    scanningProduct,
    scannedProduct,
    addingToWarehouse,
    barcodeScan,
    setBarcodeScan,
    quantity,
    setQuantity,
    state,
    setState,
    onChange,
    handlePriceChange,
    stockPromo,
    promotionRules,
    setPromotionRules,
    handleStockPromoBarcodeChange,
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    clientId,
    setClientId,
    showDebtForm,
    setShowDebtForm,
    showSupplierForm,
    setShowSupplierForm,
    supplierFormState,
    setSupplierFormState,
    creatingSupplier,
    debtState,
    cashData,
    filterClient,
    pickClient,
    company,
    warehouseUuid,
    warehouseCategories,
    warehouseCategory,
    onWarehouseCategoryChange,
    cashBoxes,
    selectCashBox,
    onChangeDebt,
    handleSupplierFormChange,
    onSubmitSupplier,
    handleAddToWarehouse,
    handleCancel,
    totalAmount,
  };
};
