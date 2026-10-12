import { useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { PAGE_SIZE } from "../constants";

/**
 * Хук для управления пагинацией
 * @param {number} count - Общее количество элементов
 * @param {string|null} next - URL следующей страницы
 * @param {string|null} previous - URL предыдущей страницы
 * @returns {Object} Объект с данными и функциями пагинации
 */
export const usePagination = (count, next, previous) => {
  const [searchParams, setSearchParams] = useSearchParams();
  // setSearchParams меняется при каждом изменении URL — храним в ref,
  // чтобы колбэки ниже были стабильными (иначе useEffect-сбросы срабатывают повторно)
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  // URL — единственный источник правды для текущей страницы
  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return p > 0 ? p : 1;
  }, [searchParams]);

  const setCurrentPage = useCallback((page) => {
    setSearchParamsRef.current(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (page > 1) params.set("page", String(page));
        else params.delete("page");
        return params;
      },
      { replace: true }
    );
  }, []);

  // Расчет общего количества страниц
  const totalPages = useMemo(
    () => (count && PAGE_SIZE ? Math.ceil(count / PAGE_SIZE) : 1),
    [count]
  );

  const hasNextPage = useMemo(() => !!next, [next]);
  const hasPrevPage = useMemo(() => !!previous, [previous]);

  // Функция для получения номера строки
  const getRowNumber = useCallback(
    (index, itemsLength) => {
      const effectivePageSize = PAGE_SIZE || itemsLength || 1;
      return (currentPage - 1) * effectivePageSize + index + 1;
    },
    [currentPage]
  );

  // Обработчик смены страницы
  const handlePageChange = useCallback(
    (newPage, onPageChange) => {
      if (newPage < 1 || (totalPages && newPage > totalPages)) return;
      if (onPageChange) onPageChange();
      setCurrentPage(newPage);
    },
    [totalPages, setCurrentPage]
  );

  // Сброс на первую страницу (стабильная ссылка)
  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  return {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    getRowNumber,
    handlePageChange,
    resetToFirstPage,
    setCurrentPage,
  };
};
