import { useState, useCallback } from "react";
import {
  fetchBrandsAsync,
  fetchCategoriesAsync,
  createBrandAsync,
  createCategoryAsync,
} from "@entities/product";
import { useAppDispatch } from "@app/store";

/**
 * Хук для управления формами создания бренда и категории
 */
export const useBrandCategoryForms = (setNewItemData: any, showAlert: any) => {
  const dispatch = useAppDispatch();

  // Бренд
  const [showBrandInputs, setShowBrandInputs] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "" });

  // Категория
  const [showCategoryInputs, setShowCategoryInputs] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "" });

  const onSubmitBrand = useCallback(
    async (e: any) => {
      e.preventDefault();
      if (!newBrand.name || !newBrand.name.trim()) {
        showAlert("Введите название бренда", "error", "Ошибка");
        return;
      }
      try {
        const brand: any = await dispatch(
          createBrandAsync({ name: newBrand.name.trim() } as any)
        ).unwrap();
        dispatch(fetchBrandsAsync({} as any) as any);
        setShowBrandInputs(false);
        // Автоматически выбираем созданный бренд
        setNewItemData((prev: any) => ({
          ...prev,
          brand_name: brand.name || newBrand.name.trim(),
        }));
        setNewBrand({ name: "" });
        showAlert("Бренд успешно создан!", "success", "Успех");
      } catch (e: any) {
        console.error("Ошибка при создании бренда:", e);
        showAlert(
          `Ошибка при создании бренда: ${e?.message || JSON.stringify(e)}`,
          "error",
          "Ошибка"
        );
      }
    },
    [dispatch, newBrand.name, setNewItemData, showAlert]
  );

  const onSubmitCategory = useCallback(
    async (e: any) => {
      e.preventDefault();
      if (!newCategory.name || !newCategory.name.trim()) {
        showAlert("Введите название категории", "error", "Ошибка");
        return;
      }
      try {
        const category: any = await dispatch(
          createCategoryAsync({ name: newCategory.name.trim() } as any)
        ).unwrap();
        dispatch(fetchCategoriesAsync({} as any) as any);
        setShowCategoryInputs(false);
        // Автоматически выбираем созданную категорию
        setNewItemData((prev: any) => ({
          ...prev,
          category_name: category.name || newCategory.name.trim(),
        }));
        setNewCategory({ name: "" });
        showAlert("Категория успешно создана!", "success", "Успех");
      } catch (e: any) {
        console.error("Ошибка при создании категории:", e);
        showAlert(
          `Ошибка при создании категории: ${e?.message || JSON.stringify(e)}`,
          "error",
          "Ошибка"
        );
      }
    },
    [dispatch, newCategory.name, setNewItemData, showAlert]
  );

  return {
    // Бренд
    showBrandInputs,
    setShowBrandInputs,
    newBrand,
    setNewBrand,
    onSubmitBrand,
    // Категория
    showCategoryInputs,
    setShowCategoryInputs,
    newCategory,
    setNewCategory,
    onSubmitCategory,
  };
};
