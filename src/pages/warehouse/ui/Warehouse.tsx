import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Warehouse.scss";
import api from "@shared/api";
import FilterModal from "./components/FilterModal";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import BarcodeAmbiguityModal from "@shared/ui/BarcodeAmbiguityModal/BarcodeAmbiguityModal";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import { ClipboardList, Plus, ScanBarcode } from "lucide-react";
import SearchSection from "./components/SearchSection";
import BulkActionsBar from "./components/BulkActionsBar";
import BulkEditModal from "./components/BulkEditModal";
import ProductTable from "./components/ProductTable";
import ProductCards from "./components/ProductCards";
import Pagination from "./components/Pagination";
import {
  bulkDeleteProductsAsync,
  bulkUpdateProductsAsync,
  fetchProductsAsync,
} from "@entities/product";
import useScanDetection from "@shared/hooks/useScanDetection";
import { useSearch } from "./hooks/useSearch";
import { usePagination } from "./hooks/usePagination";
import { useProductSelection } from "./hooks/useProductSelection";
import {
  useWarehouseData,
  useWarehouseReferences,
} from "./hooks/useWarehouseData";
import { STORAGE_KEY, VIEW_MODES } from "./constants";
import { formatDeleteMessage } from "./utils";
import { lookupMarketWarehouseProductByBarcode } from "@entities/product/lib/marketWarehouseBarcodeScan";
import { getBarcodeAmbiguity } from "@shared/lib/tools/barcodeAmbiguity";
import {
  applySaleUnitParams,
  filterProductsBySaleUnit,
} from "@shared/lib/tools/marketWarehouseFilters";

const WAREHOUSE_SELECTED_IDS_KEY = "marketWarehouseSelectedProductIds";
const WAREHOUSE_SELECTED_SNAPSHOTS_KEY = "marketWarehouseSelectedProductSnapshots";

const loadSnapshotsFromStorage = () => {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(WAREHOUSE_SELECTED_SNAPSHOTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: any = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (v && typeof v === "object") out[String(k)] = v;
    });
    return out;
  } catch {
    return {};
  }
};

const pickProductSnapshot = (product: any) => ({
  id: product.id,
  name: product.name,
  quantity: product.quantity ?? 0,
  unit: product.unit || "шт",
  code: product.code || product.article,
  article: product.article,
  barcode: product.barcode,
  alternate_barcodes: product.alternate_barcodes,
});
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAlert } from "@shared/hooks/useDialog";

const Warehouse = () => {
  const dispatch = useDispatch() as any;
  const navigate = useNavigate();
  const alert = useAlert();

  // Реф для отслеживания предыдущих продуктов
  const prevProductsRef = useRef<any[]>([]);
  // Реф для первого рендера
  const isInitialMountRef = useRef(true);
  // Состояние фильтров и модальных окон
  const [showFilterModal, setShowFilterModal] = useState<any>(false);
  const [filters, setFilters] = useState<any>({});
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState<any>(false);
  const [scanLookupLoading, setScanLookupLoading] = useState<any>(false);
  const [barcodeAmbiguity, setBarcodeAmbiguity] = useState<any>(null);
  const [bulkDeleting, setBulkDeleting] = useState<any>(false);
  const [bulkUpdating, setBulkUpdating] = useState<any>(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState<any>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<any>(false);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return VIEW_MODES.TABLE;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === VIEW_MODES.TABLE || saved === VIEW_MODES.CARDS) return saved;
    const isSmall = window.matchMedia("(max-width: 1199px)").matches;
    return isSmall ? VIEW_MODES.CARDS : VIEW_MODES.TABLE;
  });


  // Хуки для управления данными
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useSearch();
  const [searchParams] = useSearchParams();

  // Загрузка справочников
  const { brands, categories } = useWarehouseReferences();

  useEffect(() => {
    let mounted = true;

    const loadSuppliers = async () => {
      try {
        setSuppliersLoading(true);
        const res = await api.get("/main/clients/", {
          params: { type: "suppliers", page_size: 500 },
        });
        const nextSuppliers = res?.data?.results || res?.data || [];
        if (!mounted) return;
        setSuppliers(Array.isArray(nextSuppliers) ? nextSuppliers : []);
      } catch (error: any) {
        if (!mounted) return;
        console.error("Ошибка при загрузке поставщиков склада:", error);
        setSuppliers([]);
      } finally {
        if (mounted) setSuppliersLoading(false);
      }
    };

    void loadSuppliers();

    return () => {
      mounted = false;
    };
  }, []);

  // Получаем текущую страницу из URL
  const currentPageFromUrl = useMemo(
    () => parseInt(searchParams.get("page") || "1", 10),
    [searchParams]
  );

  // Параметры запроса
  const requestParams = useMemo(() => {
    const params = {
      page: currentPageFromUrl,
      ...filters,
    };
    if (debouncedSearchTerm?.trim()) {
      params.search = debouncedSearchTerm.trim();
    }
    return params;
  }, [currentPageFromUrl, filters, debouncedSearchTerm]);

  // Загрузка товаров
  const { products, loading, count, next, previous } =
    useWarehouseData(requestParams);

  const visibleProducts = useMemo(
    () => filterProductsBySaleUnit(products, filters.sale_unit),
    [products, filters.sale_unit],
  );



  useEffect(() => {
    if (loading) return;
    // Пропускаем первый рендер
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Проверяем, что продукты изменились (новый запрос)
    const prevProducts = prevProductsRef.current;
    const currentProducts = products || [];

    // Сравниваем первые товары - если они разные, значит новый запрос
    const isNewData =
      prevProducts.length > 0 &&
      currentProducts.length > 0 &&
      prevProducts[0]?.id !== currentProducts[0]?.id;

    if (isNewData) {
      (document.getElementById('root') as any)?.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
    prevProductsRef.current = currentProducts;
  }, [products, loading]);

  // Хук для пагинации с реальными данными
  const {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    getRowNumber,
    handlePageChange: handlePageChangeBase,
    resetToFirstPage,
  } = usePagination(count, next, previous);

  // Сброс на первую страницу при изменении поиска
  useEffect(() => {
    if (debouncedSearchTerm) {
      resetToFirstPage();
    }
  }, [debouncedSearchTerm, resetToFirstPage]);

  // Хук для выбора товаров
  const {
    selectedRows,
    isAllSelected,
    selectedCount,
    handleRowSelect,
    handleSelectAll,
    clearSelection,
    setSelectedRows,
  } = useProductSelection(visibleProducts, WAREHOUSE_SELECTED_IDS_KEY);

  const [selectedSnapshots, setSelectedSnapshots] = useState(
    loadSnapshotsFromStorage,
  );
  const barcodeProcessingRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const lastScannedBarcodeRef = useRef("");
  const isScanningRef = useRef(false);

  useEffect(() => {
    setSelectedSnapshots((prev: any) => {
      const next = { ...prev };
      (visibleProducts || []).forEach((p: any) => {
        const sid = String(p.id);
        if (selectedRows.has(sid)) {
          next[sid] = pickProductSnapshot(p);
        }
      });
      Object.keys(next).forEach((id: any) => {
        if (!selectedRows.has(id)) delete next[id];
      });
      try {
        sessionStorage.setItem(
          WAREHOUSE_SELECTED_SNAPSHOTS_KEY,
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [visibleProducts, selectedRows]);

  // Сохранение режима просмотра
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  // Обработчики событий
  const handleProductClick = useCallback(
    (product: any) => {
      navigate(`/crm/sklad/${product.id}`);
    },
    [navigate]
  );

  const handlePageChange = useCallback(
    (newPage: any, ...rest: any[]) => {
      (handlePageChangeBase as any)(newPage, ...rest);
    },
    [handlePageChangeBase],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedCount === 0) return;
    setShowDeleteConfirmModal(true);
  }, [selectedCount]);

  const confirmBulkDelete = useCallback(async () => {
    setShowDeleteConfirmModal(false);
    setBulkDeleting(true);
    try {
      await dispatch(
        bulkDeleteProductsAsync({
          ids: Array.from(selectedRows),
          soft: true,
          require_all: false,
        })
      ).unwrap();

      setSelectedRows(new Set());
      dispatch(fetchProductsAsync(requestParams));
    } catch (e: any) {
      const errorMessage = validateResErrors(e, "Ошибка при удалении товаров");
      alert(errorMessage, true);
    } finally {
      setBulkDeleting(false);
    }
  }, [alert, dispatch, requestParams, selectedRows, setSelectedRows]);

  const handleBulkEdit = useCallback(() => {
    if (selectedCount === 0) return;
    setShowBulkEditModal(true);
  }, [selectedCount]);

  const confirmBulkEdit = useCallback(
    async (changes) => {
      if (selectedRows.size === 0) return;
      setBulkUpdating(true);
      try {
        const result = await dispatch(
          bulkUpdateProductsAsync({
            ids: Array.from(selectedRows),
            ...changes,
            require_all: false,
          })
        ).unwrap();

        setShowBulkEditModal(false);
        setSelectedRows(new Set());

        const failed = Number(result?.failed) || 0;
        if (failed > 0) {
          alert(
            `Обновлено товаров: ${result?.updated ?? 0}, не удалось: ${failed}`,
            true,
          );
        }

        dispatch(fetchProductsAsync(requestParams));
      } catch (e: any) {
        const errorMessage = validateResErrors(
          e,
          "Ошибка при изменении товаров",
        );
        alert(errorMessage, true);
      } finally {
        setBulkUpdating(false);
      }
    },
    [dispatch, selectedRows, setSelectedRows, requestParams, alert],
  );

  const handleApplyFilters = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      resetToFirstPage();
    },
    [resetToFirstPage],
  );

  const handleResetFilters = useCallback(() => {
    setFilters({});
    resetToFirstPage();
  }, [resetToFirstPage]);

  const handleSaleUnitChange = useCallback(
    (saleUnit: any) => {
      setFilters((prev: any) => {
        const next = { ...prev };
        delete next.sale_unit;
        delete next.is_weight;
        applySaleUnitParams(next, saleUnit);
        return next;
      });
      resetToFirstPage();
    },
    [resetToFirstPage],
  );

  const handleCreateProduct = useCallback(() => {
    navigate("/crm/sklad/add-product");
  }, [navigate]);

  const selectedProducts = useMemo(() => {
    if (!selectedRows?.size) return [];
    return [...selectedRows]
      .map((id: any) => selectedSnapshots[id])
      .filter(Boolean);
  }, [selectedRows, selectedSnapshots]);

  const handleOpenInventory = useCallback(() => {
    if (selectedProducts.length === 0) {
      navigate("/crm/market/documents?tab=inventory");
      return;
    }
    navigate("/crm/market/documents?tab=inventory", {
      state: { inventoryProducts: selectedProducts },
    });
  }, [navigate, selectedProducts]);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  useScanDetection({
    minLength: 3,
    onComplete: async (barcode) => {
      const scanned = String(barcode || "").trim();
      if (!scanned || barcodeProcessingRef.current) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as any).isContentEditable)
      ) {
        return;
      }
      if (
        showFilterModal ||
        showDeleteConfirmModal ||
        showBulkEditModal ||
        barcodeAmbiguity
      )
        return;

      const now = Date.now();
      const isDuplicateScan =
        lastScannedBarcodeRef.current === scanned &&
        now - lastScanTimeRef.current < 1500;
      if (isDuplicateScan || isScanningRef.current) return;

      barcodeProcessingRef.current = true;
      isScanningRef.current = true;
      lastScannedBarcodeRef.current = scanned;
      lastScanTimeRef.current = now;
      setScanLookupLoading(true);
      try {
        const result = await lookupMarketWarehouseProductByBarcode(scanned);
        const productId = result?.product?.id;

        if (productId) {
          navigate(`/crm/sklad/${productId}`);
          return;
        }

        alert("Товар с таким штрихкодом не найден.", true);
      } catch (error: any) {
        const ambiguity = getBarcodeAmbiguity(error);
        if (ambiguity) {
          setBarcodeAmbiguity(ambiguity);
          return;
        }
        const errorMessage = validateResErrors(
          error,
          "Ошибка поиска товара по штрихкоду",
        );
        alert(errorMessage, true);
      } finally {
        barcodeProcessingRef.current = false;
        setScanLookupLoading(false);
        setTimeout(() => {
          isScanningRef.current = false;
        }, 300);
      }
    },
  });

  // Мемоизация сообщения для модального окна удаления
  const deleteModalMessage = useMemo(
    () => formatDeleteMessage(selectedCount),
    [selectedCount]
  );

  return (
    <PageShell className="warehouse-page">
      <PageHeader
        title="Склад"
        subtitle="Управление товарами и запасами"
        actions={
          <>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={handleOpenInventory}
              title={
                selectedCount > 0
                  ? "Открыть документы: инвентаризация с выбранными товарами"
                  : "Открыть раздел актов инвентаризации (Документы)"
              }
              aria-label={
                selectedCount > 0
                  ? `Инвентаризация (${selectedCount})`
                  : "Инвентаризация"
              }
            >
              <ClipboardList size={16} />
              <span className="nur-btn__label">
                Инвентаризация{selectedCount > 0 ? ` (${selectedCount})` : ""}
              </span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={() => navigate("/crm/sklad/mass-scan")}
              title="Массовое сканирование"
              aria-label="Массовое сканирование"
            >
              <ScanBarcode size={16} />
              <span className="nur-btn__label">Массовое сканирование</span>
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={handleCreateProduct}
              title="Создать товар"
              aria-label="Создать товар"
            >
              <Plus size={16} />
              <span className="nur-btn__label">Создать товар</span>
            </button>
          </>
        }
      />

      <SearchSection
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        scanLookupLoading={scanLookupLoading}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenFilters={() => setShowFilterModal(true)}
        count={count}
        foundCount={visibleProducts.length}
        saleUnit={filters.sale_unit || ""}
        onSaleUnitChange={handleSaleUnitChange}
      />

      <BulkActionsBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkEdit={handleBulkEdit}
        isDeleting={bulkDeleting}
        isUpdating={bulkUpdating}
      />
      <DataContainer>
        <PagePanel flush className="warehouse-table-container w-full">
          {viewMode === VIEW_MODES.TABLE ? (
            <ProductTable
              products={visibleProducts}
              loading={loading}
              selectedRows={selectedRows}
              isAllSelected={isAllSelected}
              onRowSelect={handleRowSelect}
              onSelectAll={handleSelectAll}
              onProductClick={handleProductClick}
              getRowNumber={getRowNumber}
            />
          ) : (
            <ProductCards
              products={visibleProducts}
              loading={loading}
              selectedRows={selectedRows}
              isAllSelected={isAllSelected}
              onRowSelect={handleRowSelect}
              onSelectAll={handleSelectAll}
              onProductClick={handleProductClick}
              getRowNumber={getRowNumber}
            />
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            count={count}
            loading={loading}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onPageChange={handlePageChange}
          />
        </PagePanel>
      </DataContainer>

      {showFilterModal && (
        <ReactPortal wrapperId="warehouse-filter-modal">
          <FilterModal
            onClose={() => setShowFilterModal(false)}
            currentFilters={filters}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            brands={brands}
            categories={categories}
            suppliers={suppliers}
            suppliersLoading={suppliersLoading}
          />
        </ReactPortal>
      )}

      {showBulkEditModal && (
        <ReactPortal wrapperId="warehouse-bulk-edit-modal">
          <BulkEditModal
            selectedCount={selectedCount}
            onClose={() => setShowBulkEditModal(false)}
            onApply={confirmBulkEdit}
            saving={bulkUpdating}
            brands={brands}
            categories={categories}
            suppliers={suppliers}
            suppliersLoading={suppliersLoading}
          />
        </ReactPortal>
      )}

      <AlertModal
        open={showDeleteConfirmModal}
        type="warning"
        title="Подтверждение удаления"
        message={deleteModalMessage}
        okText="Удалить"
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmBulkDelete}
      />

      <BarcodeAmbiguityModal
        open={Boolean(barcodeAmbiguity)}
        message={barcodeAmbiguity?.message}
        matches={barcodeAmbiguity?.matches}
        onSelect={(match) => {
          setBarcodeAmbiguity(null);
          navigate(`/crm/sklad/${match.id}`);
        }}
        onClose={() => setBarcodeAmbiguity(null)}
      />
    </PageShell>
  );
};

export default Warehouse;
