import { useEffect, useState } from "react";
import BarcodePrintTab from "./components/BarcodePrintTab";
import { fetchProductsAsync } from "@entities/product";
import { clearProducts } from "@entities/product";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import { PageShell, PageHeader } from "@shared/ui/page-shell";
import { useAppDispatch, useAppSelector } from "@app/store";

const PAGE_SIZE = 100;

/**
 * Отдельная страница для печати штрих-кодов,
 * независимая от общей страницы склада.
 * Товары загружаются постранично (по 100 шт) через API.
 */
const BarcodePrintPage = () => {
  const dispatch = useAppDispatch();
  const { list: products, loading, count } = useAppSelector(
    (state: any) => state.product,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300, undefined);
  const normalizedSearch = debouncedSearch.trim();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch]);

  // Загрузка товаров с пагинацией
  useEffect(() => {
    dispatch(
      fetchProductsAsync({
        page,
        page_size: PAGE_SIZE,
        search: normalizedSearch || undefined,
      } as any),
    );
  }, [dispatch, page, normalizedSearch]);

  // Очистка списка при выходе со страницы
  useEffect(() => {
    return () => {
      dispatch(clearProducts());
    };
  }, [dispatch]);

  const handleSearchChange = (e: any) => {
    setSearchTerm(e.target.value);
  };

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  return (
    <PageShell className="barcode-print-page">
      <PageHeader
        title="Печать штрихкодов"
        subtitle="Поиск товаров и печать этикеток"
      />
      <BarcodePrintTab
        products={products}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        page={page}
        totalPages={totalPages}
        count={count ?? 0}
        onPageChange={setPage}
      />
    </PageShell>
  );
};

export default BarcodePrintPage;
