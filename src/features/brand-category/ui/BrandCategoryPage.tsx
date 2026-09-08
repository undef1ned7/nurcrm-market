import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  X,
  LayoutGrid,
  Table2,
  Pencil,
  Tag,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  fetchBrandsAsync,
  createBrandAsync,
  updateBrandAsync,
  deleteBrandAsync,
  fetchCategoriesAsync,
  createCategoryAsync,
  updateCategoryAsync,
  deleteCategoryAsync,
} from "@entities/product";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import "./Employ.scss";
import {
  PageShell,
  PageHeader,
  FilterBar,
  PagePanel,
  EmptyState,
} from "@shared/ui/page-shell";
import { useAlert, useConfirm } from "@shared/hooks/useDialog";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useAppDispatch, useAppSelector } from "@app/store";

const TABS = {
  BRANDS: "brands",
  CATEGORIES: "categories",
};

const VIEW_MODES = {
  TABLE: "table",
  CARDS: "cards",
};

const VIEW_MODE_STORAGE_KEY = "crm_brand_category_view_mode";
const PAGE_SIZE = 100;

const getInitialViewMode = () => {
  if (typeof window === "undefined") return VIEW_MODES.TABLE;
  const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (saved === VIEW_MODES.TABLE || saved === VIEW_MODES.CARDS) return saved;
  return VIEW_MODES.TABLE;
};

const TextModal = ({
  title,
  initial,
  onSubmit,
  onClose,
  deleting,
  onDelete,
  saving,
}: any) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial?.name || "");

  return (
    <ReactPortal wrapperId="brand-category-text-modal">
      {/* brandSection keeps Employ.scss modal rules after portal to body */}
      <div className="brandSection">
        <div className="edit-modal brand" role="dialog" aria-modal="true">
          <div className="edit-modal__overlay" onClick={onClose} />
          <div className="edit-modal__content brand-category-page__edit-modal-content">
            <div className="edit-modal__header">
              <h3>{title}</h3>
              <X size={18} className="edit-modal__close-icon" onClick={onClose} />
            </div>
            <div className="edit-modal__section">
              <label className="nur-label">{t("crm.brandCategory.nameRequired")}</label>
              <input
                className="nur-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("crm.brandCategory.namePlaceholder")}
                autoFocus
              />
            </div>
            <div className="edit-modal__footer">
              {initial && onDelete && (
                <button
                  type="button"
                  className="nur-btn nur-btn--danger"
                  onClick={onDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? t("common.deleting") : t("common.delete")}
                </button>
              )}
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={() => onSubmit(value)}
                disabled={deleting || saving}
              >
                {saving
                  ? t("common.saving")
                  : initial
                    ? t("common.save")
                    : t("common.create")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
};

const ItemsTable = ({ items, onEdit, startIndex = 0 }: any) => {
  const { t } = useTranslation();
  return (
  <div className="nur-table-wrap brand-category-page__table-wrap">
    <table className="nur-table nur-table--clickable brand-category-page__table">
      <thead>
        <tr>
          <th>{t("crm.brandCategory.number")}</th>
          <th>{t("crm.brandCategory.name")}</th>
          <th className="brand-category-page__table-actions-col">{t("crm.brandCategory.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={item.id} onClick={() => onEdit(item)}>
            <td>{startIndex + idx + 1}</td>
            <td>{item.name}</td>
            <td className="brand-category-page__table-actions-col">
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm brand-category-page__row-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                aria-label={t("crm.brandCategory.edit")}
              >
                <Pencil size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

const ItemsCards = ({ items, onEdit, startIndex = 0 }: any) => {
  const { t } = useTranslation();
  return (
  <div className="brand-category-page__cards">
    {items.map((item, idx) => (
      <article
        key={item.id}
        className="brand-category-page__card"
        onClick={() => onEdit(item)}
      >
        <span className="brand-category-page__card-index">
          {startIndex + idx + 1}
        </span>
        <h3 className="brand-category-page__card-title">{item.name}</h3>
        <button
          type="button"
          className="brand-category-page__card-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          aria-label={t("crm.brandCategory.editAria")}
        >
          <Pencil size={15} />
        </button>
      </article>
    ))}
  </div>
  );
};

const BrandCategoryPagination = ({
  currentPage,
  totalPages,
  totalCount,
  countLabel,
  loading,
  hasNextPage,
  hasPrevPage,
  onPageChange,
}: any) => {
  const { t } = useTranslation();
  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const result: any[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) result.push("ellipsis-start");
    for (let p = start; p <= end; p += 1) result.push(p);
    if (end < totalPages - 1) result.push("ellipsis-end");
    result.push(totalPages);

    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1 && !hasNextPage && !hasPrevPage) return null;

  return (
    <nav
      className="brand-category-page__pagination"
      aria-label={t("crm.brandCategory.paginationAria")}
    >
      <button
        type="button"
        className="brand-category-page__pagination-btn brand-category-page__pagination-btn--nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading || !hasPrevPage}
        aria-label={t("crm.brandCategory.prevPageAria")}
      >
        <ChevronLeft size={18} />
        {t("common.back")}
      </button>

      <div className="brand-category-page__pagination-pages">
        {pages.map((page) =>
          typeof page === "string" ? (
            <span
              key={page}
              className="brand-category-page__pagination-ellipsis"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`brand-category-page__pagination-page${
                page === currentPage
                  ? " brand-category-page__pagination-page--active"
                  : ""
              }`}
              onClick={() => onPageChange(page)}
              disabled={loading || page === currentPage}
              aria-label={t("crm.brandCategory.page", { page })}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <span className="brand-category-page__pagination-info">
        {totalCount > 0 && (
          <>
            {totalCount} {countLabel}
            {" · "}
          </>
        )}
        {currentPage} из {totalPages}
      </span>

      <button
        type="button"
        className="brand-category-page__pagination-btn brand-category-page__pagination-btn--nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || !hasNextPage || currentPage >= totalPages}
        aria-label={t("crm.brandCategory.nextPageAria")}
      >
        {t("common.forward")}
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

export default function BrandCategoryPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    brands,
    categories,
    brandsLoading,
    categoriesLoading,
    brandsError,
    categoriesError,
    brandsCount,
    brandsNext,
    brandsPrevious,
    categoriesCount,
    categoriesNext,
    categoriesPrevious,
    creatingBrand,
    creatingCategory,
    updating,
    deleting,
  } = useAppSelector((s) => s.product);

  const confirm = useConfirm();
  const alert = useAlert();

  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab");
    return tab === TABS.CATEGORIES ? TABS.CATEGORIES : TABS.BRANDS;
  }, [searchParams]);

  const currentPage = useMemo(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }, [searchParams]);

  const [modalCfg, setModalCfg] = useState<any>(null);
  const [searchBrand, setSearchBrand] = useState("");
  const [searchCat, setSearchCat] = useState("");
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const prevDebouncedSearchRef = useRef<any>(null);

  const debouncedSearchBrand = useDebouncedValue(searchBrand, 500, undefined);
  const debouncedSearchCat = useDebouncedValue(searchCat, 500, undefined);

  const isBrandsTab = activeTab === TABS.BRANDS;
  const items = isBrandsTab ? brands : categories;
  const loading = isBrandsTab ? brandsLoading : categoriesLoading;
  const error = isBrandsTab ? brandsError : categoriesError;
  const totalCount = isBrandsTab ? brandsCount : categoriesCount;
  const hasNextPage = isBrandsTab ? !!brandsNext : !!categoriesNext;
  const hasPrevPage = isBrandsTab ? !!brandsPrevious : !!categoriesPrevious;
  const search = isBrandsTab ? searchBrand : searchCat;
  const setSearch = isBrandsTab ? setSearchBrand : setSearchCat;
  const debouncedSearch = isBrandsTab
    ? debouncedSearchBrand
    : debouncedSearchCat;
  const saving = creatingBrand || creatingCategory || updating;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE)),
    [totalCount],
  );

  const countLabel = isBrandsTab
    ? t("crm.brandCategory.brandsCount")
    : t("crm.brandCategory.categoriesCount");
  const rowStartIndex = (currentPage - 1) * PAGE_SIZE;

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage < 1 || newPage > totalPages) return;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newPage <= 1) next.delete("page");
        else next.set("page", String(newPage));
        return next;
      });
    },
    [setSearchParams, totalPages],
  );

  const setActiveTab = useCallback(
    (tab) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  const refreshBrands = useCallback(() => {
    dispatch(
      fetchBrandsAsync({
        search: debouncedSearchBrand || undefined,
        page: currentPage,
        page_size: PAGE_SIZE,
      }),
    );
  }, [dispatch, debouncedSearchBrand, currentPage]);

  const refreshCategories = useCallback(() => {
    dispatch(
      fetchCategoriesAsync({
        search: debouncedSearchCat || undefined,
        page: currentPage,
        page_size: PAGE_SIZE,
      }),
    );
  }, [dispatch, debouncedSearchCat, currentPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", TABS.BRANDS);
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (isBrandsTab) refreshBrands();
    else refreshCategories();
  }, [
    isBrandsTab,
    debouncedSearchBrand,
    debouncedSearchCat,
    currentPage,
    refreshBrands,
    refreshCategories,
  ]);

  useEffect(() => {
    if (prevDebouncedSearchRef.current === null) {
      prevDebouncedSearchRef.current = debouncedSearch;
      return;
    }
    if (prevDebouncedSearchRef.current === debouncedSearch) return;
    prevDebouncedSearchRef.current = debouncedSearch;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const handleSubmit = async (name) => {
    const { type, mode, item } = modalCfg;
    if (!name.trim()) return alert(t("crm.brandCategory.enterName"));
    try {
      if (type === "brand") {
        if (mode === "add") await dispatch(createBrandAsync({ name })).unwrap();
        else
          await dispatch(
            updateBrandAsync({ brandId: item.id, updatedData: { name } }),
          ).unwrap();
        refreshBrands();
      } else {
        if (mode === "add")
          await dispatch(createCategoryAsync({ name })).unwrap();
        else
          await dispatch(
            updateCategoryAsync({ categoryId: item.id, updatedData: { name } }),
          ).unwrap();
        refreshCategories();
      }
      setModalCfg(null);
    } catch (e: any) {
      alert(validateResErrors(e, t("crm.brandCategory.saveError")));
      console.error(e);
    }
  };

  const handleDelete = async () => {
    const { type, item } = modalCfg;
    confirm(t("crm.brandCategory.deleteConfirmShort"), async (result) => {
      if (!result) return;
      try {
        if (type === "brand") {
          await dispatch(deleteBrandAsync(item.id)).unwrap();
          refreshBrands();
        } else {
          await dispatch(deleteCategoryAsync(item.id)).unwrap();
          refreshCategories();
        }
        setModalCfg(null);
      } catch (e: any) {
        alert(validateResErrors(e, t("crm.brandCategory.deleteError")));
      }
    });
  };

  const handleCreate = () => {
    setModalCfg({
      type: isBrandsTab ? "brand" : "category",
      mode: "add",
    });
  };

  const handleEdit = (item) => {
    setModalCfg({
      type: isBrandsTab ? "brand" : "category",
      mode: "edit",
      item,
    });
  };

  const tabMeta = isBrandsTab
    ? {
        title: t("crm.brandCategory.brands"),
        subtitle: t("crm.brandCategory.subtitle"),
        icon: Tag,
        createLabel: t("crm.brandCategory.addBrandTitle"),
        emptyText: t("crm.brandCategory.emptyBrands"),
        searchPlaceholder: t("crm.brandCategory.searchBrands"),
      }
    : {
        title: t("crm.brandCategory.categories"),
        subtitle: t("crm.brandCategory.subtitleCategories"),
        icon: FolderOpen,
        createLabel: t("crm.brandCategory.addCategoryTitle"),
        emptyText: t("crm.brandCategory.emptyCategories"),
        searchPlaceholder: t("crm.brandCategory.searchCategories"),
      };

  const TabIcon = tabMeta.icon;
  const list = Array.isArray(items) ? items : [];

  return (
    <PageShell className="brand-category-page brandSection">
      <PageHeader
        title={t("crm.brandCategory.pageTitle")}
        subtitle={tabMeta.subtitle}
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={handleCreate}
            title={tabMeta.createLabel}
            aria-label={tabMeta.createLabel}
          >
            <Plus size={16} />
            <span className="nur-btn__label">{tabMeta.createLabel}</span>
          </button>
        }
      />

      <nav
        className="brand-category-page__tabs"
        aria-label={t("crm.brandCategory.sectionsAria")}
      >
        <button
          type="button"
          className={`brand-category-page__tab${
            isBrandsTab ? " brand-category-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab(TABS.BRANDS)}
        >
          <Tag size={16} />
          {t("crm.brandCategory.brands")}
        </button>
        <button
          type="button"
          className={`brand-category-page__tab${
            !isBrandsTab ? " brand-category-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab(TABS.CATEGORIES)}
        >
          <FolderOpen size={16} />
          {t("crm.brandCategory.categories")}
        </button>
      </nav>

      <FilterBar className="brand-category-page__toolbar">
        <div className="brand-category-page__search">
          <Search size={16} className="brand-category-page__search-icon" />
          <input
            className="nur-input brand-category-page__search-input"
            placeholder={tabMeta.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="nur-btn nur-btn--ghost nur-btn--sm brand-category-page__search-clear"
              onClick={() => setSearch("")}
              aria-label={t("crm.brandCategory.clearSearchAria")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="brand-category-page__toolbar-meta">
          <span className="nur-chip">
            {t("crm.brandCategory.totalLabel")}: {totalCount}
          </span>

          <div
            className="brand-category-page__view-toggle"
            role="group"
            aria-label={t("crm.brandCategory.viewModeAria")}
          >
            <button
              type="button"
              className={`nur-btn nur-btn--sm ${
                viewMode === VIEW_MODES.TABLE
                  ? "nur-btn--primary"
                  : "nur-btn--secondary"
              }`}
              onClick={() => setViewMode(VIEW_MODES.TABLE)}
            >
              <Table2 size={16} />
              {t("crm.brandCategory.list")}
            </button>
            <button
              type="button"
              className={`nur-btn nur-btn--sm ${
                viewMode === VIEW_MODES.CARDS
                  ? "nur-btn--primary"
                  : "nur-btn--secondary"
              }`}
              onClick={() => setViewMode(VIEW_MODES.CARDS)}
            >
              <LayoutGrid size={16} />
              {t("crm.brandCategory.cards")}
            </button>
          </div>
        </div>
      </FilterBar>

      <PagePanel className="brand-category-page__content" flush>
        {loading ? (
          <p className="brand-category-page__status">{t("common.loading")}</p>
        ) : error ? (
          <p className="brand-category-page__status brand-category-page__status--error">
            {String(error?.message || error)}
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<TabIcon size={22} />}
            title={tabMeta.emptyText}
            action={
              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={handleCreate}
              >
                <Plus size={16} />
                {tabMeta.createLabel}
              </button>
            }
          />
        ) : viewMode === VIEW_MODES.TABLE ? (
          <ItemsTable
            items={list}
            onEdit={handleEdit}
            startIndex={rowStartIndex}
          />
        ) : (
          <ItemsCards
            items={list}
            onEdit={handleEdit}
            startIndex={rowStartIndex}
          />
        )}
      </PagePanel>

      {!loading && !error && list.length > 0 && (
        <BrandCategoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          countLabel={countLabel}
          loading={loading}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          onPageChange={handlePageChange}
        />
      )}

      {modalCfg && (
        <TextModal
          title={
            modalCfg.mode === "add"
              ? modalCfg.type === "brand"
                ? t("crm.brandCategory.newBrand")
                : t("crm.brandCategory.newCategory")
              : `${t("common.edit")}: ${modalCfg.item?.name || ""}`
          }
          initial={modalCfg.item}
          onSubmit={handleSubmit}
          onClose={() => setModalCfg(null)}
          deleting={deleting}
          saving={saving}
          onDelete={modalCfg.mode === "edit" ? handleDelete : undefined}
        />
      )}
    </PageShell>
  );
}
