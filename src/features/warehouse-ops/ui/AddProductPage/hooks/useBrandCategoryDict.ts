import { useEffect, useState, useMemo, useCallback } from "react";
import {
  fetchBrandsAsync,
  fetchCategoriesAsync,
  createBrandAsync,
  createCategoryAsync,
} from "@entities/product";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import { normalizeName, DICT_PAGE_LIMIT } from "./addProductHelpers";
import { useAppDispatch } from "@app/store";

/**
 * Brand/category dictionary search, uniqueness, and create forms.
 */
export const useBrandCategoryDict = ({
  brands,
  brandsNext,
  brandsCount,
  categories,
  categoriesNext,
  categoriesCount,
  setNewItemData,
  showAlert,
}: any) => {
  const dispatch = useAppDispatch();
  const [newBrand, setNewBrand] = useState({ name: "" });
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [brandQuery, setBrandQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const debouncedBrandQuery = useDebouncedValue(brandQuery, 350, undefined);
  const debouncedCategoryQuery = useDebouncedValue(categoryQuery, 350, undefined);
  const [showBrandInputs, setShowBrandInputs] = useState(false);
  const [showCategoryInputs, setShowCategoryInputs] = useState(false);

  useEffect(() => {
    dispatch(
      fetchBrandsAsync({
        search: debouncedBrandQuery.trim() || undefined,
        page: 1,
        page_size: DICT_PAGE_LIMIT,
      }),
    );
  }, [dispatch, debouncedBrandQuery]);

  useEffect(() => {
    dispatch(
      fetchCategoriesAsync({
        search: debouncedCategoryQuery.trim() || undefined,
        page: 1,
        page_size: DICT_PAGE_LIMIT,
      }),
    );
  }, [dispatch, debouncedCategoryQuery]);

  const handleLoadMoreBrands = useCallback(() => {
    dispatch(
      fetchBrandsAsync({
        search: debouncedBrandQuery.trim() || undefined,
        page: Math.floor((brands || []).length / DICT_PAGE_LIMIT) + 1,
        page_size: DICT_PAGE_LIMIT,
        append: true,
      }),
    );
  }, [dispatch, debouncedBrandQuery, brands]);

  const handleLoadMoreCategories = useCallback(() => {
    dispatch(
      fetchCategoriesAsync({
        search: debouncedCategoryQuery.trim() || undefined,
        page: Math.floor((categories || []).length / DICT_PAGE_LIMIT) + 1,
        page_size: DICT_PAGE_LIMIT,
        append: true,
      }),
    );
  }, [dispatch, debouncedCategoryQuery, categories]);

  const hasMoreBrands =
    Boolean(brandsNext) ||
    (Number(brandsCount) || 0) > (brands || []).length;
  const hasMoreCategories =
    Boolean(categoriesNext) ||
    (Number(categoriesCount) || 0) > (categories || []).length;

  const debouncedBrandName = useDebouncedValue(newBrand.name, 400, undefined);
  const debouncedCategoryName = useDebouncedValue(newCategory.name, 400, undefined);

  const isBrandNameTaken = useMemo(() => {
    const name = normalizeName(debouncedBrandName);
    return (
      name !== "" &&
      (brands || []).some((brand) => normalizeName(brand?.name) === name)
    );
  }, [debouncedBrandName, brands]);

  const isCategoryNameTaken = useMemo(() => {
    const name = normalizeName(debouncedCategoryName);
    return (
      name !== "" &&
      (categories || []).some(
        (category) => normalizeName(category?.name) === name,
      )
    );
  }, [debouncedCategoryName, categories]);

  const brandOptions = useMemo(
    () =>
      (brands || [])
        .filter((b) => b?.name)
        .map((b) => ({ value: b.name, label: b.name })),
    [brands],
  );
  const categoryOptions = useMemo(
    () =>
      (categories || [])
        .filter((c) => c?.name)
        .map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const onSubmitBrand = async (e) => {
    e.preventDefault();
    if (!newBrand.name || !newBrand.name.trim()) {
      showAlert("Введите название бренда", "error", "Ошибка");
      return;
    }
    if (
      (brands || []).some(
        (brand) => normalizeName(brand?.name) === normalizeName(newBrand.name),
      )
    ) {
      showAlert("Бренд с таким названием уже существует", "error", "Ошибка");
      return;
    }
    try {
      const brand = await dispatch(
        createBrandAsync({ name: newBrand.name.trim() }),
      ).unwrap();
      dispatch(fetchBrandsAsync({ page: 1, page_size: DICT_PAGE_LIMIT }));
      setShowBrandInputs(false);
      setNewItemData((prev) => ({
        ...prev,
        brand_name: brand.name || newBrand.name.trim(),
      }));
      setNewBrand({ name: "" });
      showAlert("Бренд успешно создан!", "success", "Успех");
    } catch (e: any) {
      console.log(e);
      showAlert(
        validateResErrors(e, "Ошибка при создании бренда"),
        "error",
        "Ошибка",
      );
    }
  };

  const onSubmitCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.name.trim()) {
      showAlert("Введите название категории", "error", "Ошибка");
      return;
    }
    if (
      (categories || []).some(
        (category) =>
          normalizeName(category?.name) === normalizeName(newCategory.name),
      )
    ) {
      showAlert(
        "Категория с таким названием уже существует",
        "error",
        "Ошибка",
      );
      return;
    }
    try {
      const category = await dispatch(
        createCategoryAsync({ name: newCategory.name.trim() }),
      ).unwrap();
      dispatch(fetchCategoriesAsync({ page: 1, page_size: DICT_PAGE_LIMIT }));
      setShowCategoryInputs(false);
      setNewItemData((prev) => ({
        ...prev,
        category_name: category.name || newCategory.name.trim(),
      }));
      setNewCategory({ name: "" });
      showAlert("Категория успешно создана!", "success", "Успех");
    } catch (e: any) {
      console.log(e);
      showAlert(
        validateResErrors(e, "Ошибка при создании категории"),
        "error",
        "Ошибка",
      );
    }
  };

  return {
    newBrand,
    setNewBrand,
    newCategory,
    setNewCategory,
    brandQuery,
    setBrandQuery,
    categoryQuery,
    setCategoryQuery,
    showBrandInputs,
    setShowBrandInputs,
    showCategoryInputs,
    setShowCategoryInputs,
    hasMoreBrands,
    hasMoreCategories,
    handleLoadMoreBrands,
    handleLoadMoreCategories,
    isBrandNameTaken,
    isCategoryNameTaken,
    brandOptions,
    categoryOptions,
    onSubmitBrand,
    onSubmitCategory,
  };
};
