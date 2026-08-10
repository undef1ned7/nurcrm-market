import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  createProductAsync,
  updateProductAsync,
} from "@entities/product";
import { createDeal } from "@entities/sale";
import { addCashFlows } from "@entities/cash";
import * as utils from "../utils";
import { useAppDispatch } from "@app/store";

/**
 * Product create/update submit flow (images, debt, cash, deals).
 */
export const useAddProductSubmitFlow = ({
  newItemData,
  marketData,
  itemType,
  weightProductsCount,
  isEditMode,
  productId,
  images,
  initialProductImageIds,
  debt,
  debtMonths,
  amount,
  debtState,
  company,
  pickSupplier,
  cashData,
  selectCashBox,
  embedded,
  onEmbeddedSaved,
  returnToPath,
  navigate,
  showAlert,
  setFieldErrors,
  setDebt,
  setAmount,
  setDebtMonths,
  setShowDebtForm,
  setDebtState,
}: any) => {
  const dispatch = useAppDispatch();

  const handleSubmit = async () => {
    const {
      name,
      quantity,
      client,
      purchase_price,
    } = newItemData;

    // Сбрасываем предыдущие ошибки
    setFieldErrors({});

    // Валидация товара
    const productErrors = utils.validateProductData({
      newItemData,
      marketData,
      itemType,
    });

    if (Object.keys(productErrors).length > 0) {
      setFieldErrors(productErrors);
      showAlert("Пожалуйста, заполните обязательные поля.");
      return;
    }

    // Валидация для долговых операций
    if (debt && !client) {
      showAlert("Выберите поставщика для долговой операции");
      return;
    }

    const debtErrors = utils.validateDebtData(
      {
        debt,
        debtMonths,
        amount,
        purchasePrice: purchase_price,
        quantity,
        debtState,
      },
      company,
    );

    if (Object.keys(debtErrors).length > 0) {
      const firstError = Object.values(debtErrors)[0];
      showAlert(firstError);
      return;
    }

    // Формируем payload используя утилиту (убрано ~150 строк дублирующего кода)
    const payload = utils.buildProductPayload({
      newItemData,
      marketData,
      itemType,
      weightProductsCount,
    });

    try {
      let product;
      if (isEditMode && productId) {
        // Режим редактирования
        product = await dispatch(
          updateProductAsync({
            productId,
            updatedData: payload,
          }),
        ).unwrap();
      } else {
        // Режим создания
        product = await dispatch(createProductAsync(payload)).unwrap();
      }
      // Вычисляем totalAmount
      let totalAmount = 0;
      const purchasePrice =
        itemType === "product" ? purchase_price || "0" : "0";
      const qty = itemType === "product" ? Number(quantity || "0") : 0;
      totalAmount = Number(purchasePrice) * qty;

      // Загрузка изображений (после создания товара или при редактировании)
      try {
        const targetProductId = isEditMode
          ? productId
          : product?.id || product?.data?.id;
        if (targetProductId) {
          // В режиме редактирования: удаляем с сервера изображения, которые пользователь убрал из списка
          if (isEditMode && initialProductImageIds.length > 0) {
            const currentIds = images.filter((im) => im.id).map((im) => im.id);
            const removedIds = initialProductImageIds.filter(
              (id) => !currentIds.includes(id),
            );
            if (removedIds.length > 0) {
              await Promise.allSettled(
                removedIds.map((imageId) =>
                  api.delete(
                    `/main/products/${targetProductId}/images/${imageId}/`,
                  ),
                ),
              );
            }
          }
          // Загружаем только новые изображения (с файлами)
          if (images.length > 0) {
            const newImages = images.filter((im) => im.file);
            if (newImages.length > 0) {
              const uploads = newImages.map(async (im) => {
                const fd = new FormData();
                fd.append("image", im.file);
                if (im.alt) fd.append("alt", im.alt || name);
                fd.append("is_primary", String(Boolean(im.is_primary)));
                return api.post(
                  `/main/products/${targetProductId}/images/`,
                  fd,
                  {
                    headers: { "Content-Type": "multipart/form-data" },
                  },
                );
              });
              if (uploads.length) await Promise.allSettled(uploads);
            }
          }
        }
      } catch (e: any) {
        console.warn("Загрузка изображений не удалась:", e);
        // не блокируем основной флоу
      }

      // Создание долга, если выбран
      if (debt === "Долги" && client) {
        if (company?.subscription_plan?.name === "Старт") {
          await utils.createDebt({
            name: pickSupplier?.full_name,
            phone: debtState.phone,
            due_date: debtState.dueDate,
            amount: totalAmount,
          });
        }

        // Создание сделки
        await dispatch(
          createDeal({
            clientId: client,
            title: `Долг ${pickSupplier?.full_name}`,
            statusRu: debt,
            amount: totalAmount,
            debtMonths: Number(debtMonths),
          }),
        ).unwrap();
      }

      if (debt === "Предоплата" && client) {
        await dispatch(
          createDeal({
            clientId: client,
            title: `Предоплата ${pickSupplier?.full_name}`,
            statusRu: debt,
            amount: totalAmount,
            prepayment: Number(amount),
            debtMonths: Number(debtMonths),
          }),
        ).unwrap();
      }

      // Добавление денежного потока при создании товара
      // Создаем запрос на кассу только если не долг и не режим редактирования
      if (!isEditMode && debt !== "Долги") {
        // Сумма в кассу: количество × закупочная цена за единицу (для Предоплаты — переданная сумма)
        const purchaseUnitPrice =
          purchase_price || newItemData.purchase_price || "0";
        const amountForCash =
          debt === "Предоплата"
            ? Number(amount || "0")
            : qty * Number(purchaseUnitPrice);
        // Используем selectCashBox если cashData.cashbox пустой
        const cashboxId = cashData.cashbox || selectCashBox;

        // Создаем денежный поток если есть касса и сумма больше 0
        if (cashboxId && Number(amountForCash) > 0) {
          try {
            await dispatch(
              addCashFlows({
                cashbox: cashboxId,
                type: "expense",
                name: name || product?.name || "Новый товар",
                amount: amountForCash,
                source_cashbox_flow_id: product.id,
                source_business_operation_id: "Склад",
                status:
                  company?.subscription_plan?.name === "Старт"
                    ? "approved"
                    : "pending",
              }),
            ).unwrap();
          } catch (cashError: any) {
            console.warn("Ошибка при создании денежного потока:", cashError);
            // Не блокируем создание товара, если ошибка с кассой
          }
        } else {
          console.log("CashFlow не создан:", {
            cashboxId,
            amountForCash,
            hasCashbox: !!cashboxId,
            amountGreaterThanZero: Number(amountForCash) > 0,
          });
        }
      }

      if (client !== "" && !debt) {
        await dispatch(
          createDeal({
            clientId: newItemData?.client,
            title: newItemData?.name,
            statusRu: "Продажа",
            amount: totalAmount,
          }),
        ).unwrap();
      }

      // Очищаем данные долга
      setDebt("");
      setAmount("");
      setDebtMonths("");
      setShowDebtForm(false);
      setDebtState({
        phone: "",
        dueDate: "",
      });

      showAlert(
        isEditMode ? "Товар успешно обновлен!" : "Товар успешно добавлен!",
        "success",
        "Успех",
      );
      setTimeout(() => {
        if (embedded && typeof onEmbeddedSaved === "function") {
          onEmbeddedSaved();
          return;
        }
        navigate(returnToPath);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to create product:", err);
      const errorMessage = validateResErrors(
        err,
        isEditMode
          ? "Ошибка при обновлении товара."
          : "Ошибка при добавлении товара.",
      );
      showAlert(errorMessage, "error", "Ошибка");
    }
  };

  return { handleSubmit };
};
