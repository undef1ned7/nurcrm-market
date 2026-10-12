import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  createProductAsync,
  rememberAdultProduct,
  updateProductAsync,
} from "@entities/product";
import { createDeal } from "@entities/sale";
import { buildExpenseVariableRouting } from "@shared/lib/tools/cashboxResolution";
import * as utils from "../utils";
import { useAppDispatch } from "@app/store";
import { useRef, useState } from "react";

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
  loadedQuantity = null,
  debt,
  debtMonths,
  amount,
  debtState,
  company,
  pickSupplier,
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
  paidFromShiftDrawer,
  setPaidFromShiftDrawer,
  shiftDrawerFundingTarget,
  recordShiftDrawerOutflow,
}: any) => {
  const dispatch = useAppDispatch();
  // Блокировка отправки: на время запроса и ПОСЛЕ успеха — до перехода со страницы
  // (раньше кнопка оживала на ~1,5 с до редиректа, и повторный клик создавал дубль товара).
  // После ошибки снимается, чтобы можно было повторить.
  const submitLockRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
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

    // Правка без изменения остатка: quantity, payment_mode и касса расхода не
    // отправляются. Иначе PATCH возвращал остаток, снятый при открытии формы, —
    // продажи за время правки «откатывались», а бэк мог провести закупку.
    const quantityUntouched =
      isEditMode &&
      loadedQuantity !== null &&
      utils.isSameQuantity(quantity, loadedQuantity);

    const builtPayload = utils.buildProductPayload({
      newItemData,
      marketData,
      itemType,
      weightProductsCount,
    });
    if (quantityUntouched) delete builtPayload.quantity;

    const payload = {
      ...builtPayload,
      ...(quantityUntouched
        ? {}
        : debt !== "Долги"
          ? {
              payment_mode: debt === "Предоплата" ? "prepayment" : "cash",
              ...buildExpenseVariableRouting(),
            }
          : { payment_mode: "debt" }),
    };

    submitLockRef.current = true;
    setSubmitting(true);
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
      const savedProductId = isEditMode
        ? productId
        : product?.id || product?.data?.id;
      rememberAdultProduct(
        savedProductId,
        itemType === "product" && Boolean(marketData.isAdult),
        company?.id,
      );
      // Вычисляем totalAmount
      let totalAmount = 0;
      const purchasePrice =
        itemType === "product" ? purchase_price || "0" : "0";
      const qty = itemType === "product" ? Number(quantity || "0") : 0;
      totalAmount = Number(purchasePrice) * qty;

      let imageUploadWarning: string | null = null;

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
              const uploadResults = await Promise.allSettled(uploads);
              const failedUploads = uploadResults.filter(
                (r) => r.status === "rejected",
              );
              if (failedUploads.length > 0) {
                console.warn(
                  "Загрузка части изображений не удалась:",
                  failedUploads,
                );
                imageUploadWarning =
                  failedUploads.length === uploadResults.length
                    ? "Товар сохранён, но не удалось загрузить изображения. Попробуйте добавить фото снова."
                    : `Товар сохранён, но не удалось загрузить ${failedUploads.length} из ${uploadResults.length} изображений.`;
              }
            }
          }
        }
      } catch (e: any) {
        console.warn("Загрузка изображений не удалась:", e);
        imageUploadWarning =
          "Товар сохранён, но не удалось загрузить изображения. Попробуйте добавить фото снова.";
        // не блокируем основной флоу
      }

      // Создание долга, если выбран
      // Сделки с поставщиком — только при создании товара (приход). При правке карточки
      // каждое сохранение раньше создавало новую сделку на закупка × остаток.
      if (!isEditMode && debt === "Долги" && client) {
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

      if (!isEditMode && debt === "Предоплата" && client) {
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
        if (Number(amountForCash) > 0) {
          // Расход по закупке создаёт бэк при создании товара.

          if (
            paidFromShiftDrawer &&
            shiftDrawerFundingTarget?.available &&
            shiftDrawerFundingTarget?.cashboxId
          ) {
            const drawerResult = await recordShiftDrawerOutflow({
              cashboxId: shiftDrawerFundingTarget.cashboxId,
              amount: Number(amountForCash),
              name: `Закупка товара — оплата из кассы смены: ${name || product?.name || "Новый товар"}`,
            });
            if (!drawerResult.ok) {
              imageUploadWarning =
                imageUploadWarning ||
                "Товар сохранён, но списание из кассы смены не записалось — добавьте вручную в «Касса».";
            }
          }
        }
      }

      if (!isEditMode && client !== "" && !debt) {
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
      setPaidFromShiftDrawer(false);
      setDebtState({
        phone: "",
        dueDate: "",
      });

      showAlert(
        imageUploadWarning
          ? imageUploadWarning
          : isEditMode
            ? "Товар успешно обновлен!"
            : "Товар успешно добавлен!",
        imageUploadWarning ? "warning" : "success",
        imageUploadWarning ? "Внимание" : "Успех",
      );
      setTimeout(() => {
        if (embedded && typeof onEmbeddedSaved === "function") {
          onEmbeddedSaved();
          return;
        }
        navigate(returnToPath);
      }, 1500);
    } catch (err: any) {
      submitLockRef.current = false;
      setSubmitting(false);
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

  return { handleSubmit, submitting };
};
