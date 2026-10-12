import { createSlice } from "@reduxjs/toolkit";
import { applyPagination } from "@shared/lib/pagination";
import {
  fetchProductsAsync,
  createProductAsync,
  updateProductAsync,
  deleteProductAsync,
  bulkDeleteProductsAsync,
  bulkUpdateProductsAsync,
  fetchBrandsAsync,
  fetchCategoriesAsync,
  createBrandAsync,
  createCategoryAsync,
  updateBrandAsync,
  updateCategoryAsync,
  deleteBrandAsync,
  deleteCategoryAsync,
  createKassa,
  createProductWithBarcode,
  scanWarehouseProductAsync,
  getItemsMake,
  getProcessedItemsMake,
  processItemMake,
  createItemMake,
  consumeItemsMake,
  setItemMakeQuantity,
  updateItemsMake,
  deleteItemsMake,
  fetchAgentProductsAsync,
  getProductByBarcodeAsync,
  addProductToWarehouseAsync,
} from "./productCreators";
import { useSelector } from "react-redux";

const initialState = {
  list: [] as any[],
  count: 0,
  next: null as any,
  previous: null as any,
  loading: false,
  error: null as any,
  itemsMake: [] as any[],
  itemsMakeProcessed: [] as any[],
  itemsMakeLoading: false,

  brands: [] as any[],
  brandsLoading: false,
  brandsError: null as any,
  brandsCount: 0,
  brandsNext: null as any,
  brandsPrevious: null as any,
  creatingBrand: false,
  createBrandError: null as any,

  categories: [] as any[],
  categoriesLoading: false,
  categoriesError: null as any,
  categoriesCount: 0,
  categoriesNext: null as any,
  categoriesPrevious: null as any,
  creatingCategory: false,
  createCategoryError: null as any,
  // Последний запрос списка: ответы на более ранние (старый поиск/страница) игнорируются
  brandsRequestId: null as string | null,
  categoriesRequestId: null as string | null,
  // Правка/удаление бренда или категории (свои флаги, чтобы не трогать товарные updating/deleting)
  savingBrandCategory: false,
  deletingBrandCategory: false,

  // Agent products
  agentProducts: [] as any[],
  agentProductsLoading: false,
  agentProductsError: null as any,

  creating: false,
  createError: null as any,
  updating: false,
  updateError: null as any,
  bulkUpdating: false,
  bulkUpdateError: null as any,
  deleting: false,
  deleteError: null as any,
  barcodeError: null as any,

  // Barcode scanning
  scannedProduct: null as any,
  scanningProduct: false,
  scanProductError: null as any,

  // Warehouse operations
  addingToWarehouse: false,
  addToWarehouseError: null as any,

  // Weight products count
  weightProductsCount: 0,

  // Кэш для товаров (ключ - сериализованные параметры запроса)
  productsCache: {} as any,
  latestFetchRequestId: null as any,
};

const MAX_PRODUCTS_CACHE_KEYS = 30;

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    clearProducts: (state) => {
      state.list = [];
      state.count = 0;
      state.next = null;
      state.previous = null;
      state.loading = false;
      state.error = null;
    },
    clearScannedProduct: (state) => {
      state.scannedProduct = null;
      state.scanProductError = null;
    },
    loadProductsFromCache: (state, action) => {
      const { cacheKey: _cacheKey, cachedData } = action.payload;
      if (cachedData) {
        // Загружаем данные из кэша синхронно
        state.list = cachedData.list || [];
        state.count = cachedData.count || 0;
        state.next = cachedData.next || null;
        state.previous = cachedData.previous || null;
        state.weightProductsCount = cachedData.weightProductsCount || 0;
        // Ответ запроса, отправленного до показа кэша (другие параметры), больше
        // не должен перетереть список: новый запрос, если он нужен, получит свой id.
        state.latestFetchRequestId = null;
        // Данные на экране — из кэша; отброшенный запрос loading уже не сбросит.
        // Если нужен фоновый запрос, его pending сам решит, показывать ли загрузку.
        state.loading = false;
      }
    },
    clearProductsCache: (state) => {
      state.productsCache = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsAsync.pending, (state, action) => {
        state.latestFetchRequestId = action.meta.requestId;
        // Не устанавливаем loading, если есть валидный кэш (stale-while-revalidate)
        // Это позволяет показывать кэшированные данные без белого экрана при быстрой смене страниц
        const skipLoading = action.meta?.arg?._skipLoadingIfCached;
        if (!skipLoading || state.list.length === 0) {
        state.loading = true;
        }
        state.error = null;
        // Сбрасываем счетчик при начале новой загрузки только если нет данных
        if (state.list.length === 0) {
        state.weightProductsCount = 0;
        }
      })
      .addCase(fetchProductsAsync.fulfilled, (state, action) => {
        if (state.latestFetchRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = null;
        applyPagination(state, action.payload, "list");
        
        // Подсчет товаров с is_weight: true используя цикл
        // payload может быть null (пустое тело ответа) — раньше здесь падал редьюсер,
        // и страница навсегда оставалась в «Загрузка…»
        const products = Array.isArray(action.payload?.results)
          ? action.payload.results
          : Array.isArray(action.payload)
          ? action.payload
          : [] as any[];
        
        let weightCount = 0;
        for (let i = 0; i < products.length; i++) {
          if (products[i]?.is_weight === true) {
            weightCount++;
          }
        }
        state.weightProductsCount = weightCount;

        // Сохраняем в кэш (если передан _cacheKey в params)
        const cacheKey = action.meta?.arg?._cacheKey;
        if (cacheKey) {
          const nextEntry = {
            list: [...state.list], // Копируем массив
            count: state.count,
            next: state.next,
            previous: state.previous,
            weightProductsCount: state.weightProductsCount,
            timestamp: Date.now(),
            // Версия каталога, по которой получен список (если известна) —
            // при той же версии склад покажет кэш без повторного запроса.
            catalogVersion: action.meta?.arg?._catalogVersion ?? null,
          };

          state.productsCache[cacheKey] = nextEntry;

          // LRU-стиль эвикт по timestamp (без затрат на структуру связного списка).
          const keys = Object.keys(state.productsCache);
          if (keys.length > MAX_PRODUCTS_CACHE_KEYS) {
            // Сортируем по свежести (desc), затем удаляем хвост.
            keys.sort((a, b) => {
              const ta = state.productsCache[a]?.timestamp ?? 0;
              const tb = state.productsCache[b]?.timestamp ?? 0;
              return tb - ta;
            });
            for (const k of keys.slice(MAX_PRODUCTS_CACHE_KEYS)) {
              delete state.productsCache[k];
            }
          }
        }
      })
      .addCase(fetchProductsAsync.rejected, (state, action) => {
        if (state.latestFetchRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error =
          action.meta.aborted ? null : action.payload;
      })

      // 🆕 FETCH BRANDS
      .addCase(fetchBrandsAsync.pending, (state, action) => {
        state.brandsLoading = true;
        state.brandsError = null;
        state.brandsRequestId = action.meta.requestId;
      })
      .addCase(fetchBrandsAsync.fulfilled, (state, action) => {
        // Устаревший ответ (пока он шёл, ушёл запрос с другим поиском/страницей) — не применяем
        if (action.meta.requestId !== state.brandsRequestId) return;
        state.brandsLoading = false;
        const results = Array.isArray(action.payload?.results)
          ? action.payload.results
          : Array.isArray(action.payload)
            ? action.payload
            : [] as any[];
        if (action.meta?.arg?.append) {
          // Догрузка следующей страницы («Смотреть ещё») — дописываем без дублей
          const existingIds = new Set(
            state.brands.map((b) => String(b?.id ?? b?.name)),
          );
          state.brands = [
            ...state.brands,
            ...results.filter(
              (b) => !existingIds.has(String(b?.id ?? b?.name)),
            ),
          ];
        } else {
          state.brands = results;
        }
        state.brandsCount =
          typeof action.payload?.count === "number"
            ? action.payload.count
            : results.length;
        state.brandsNext = action.payload?.next ?? null;
        state.brandsPrevious = action.payload?.previous ?? null;
      })
      .addCase(fetchBrandsAsync.rejected, (state, action) => {
        if (action.meta.requestId !== state.brandsRequestId) return;
        state.brandsLoading = false;
        state.brandsError = action.payload;
      })
      .addCase(updateItemsMake.pending, (_state) => {
        // state.loading = true;
        // state.brandsError = null;
      })
      .addCase(updateItemsMake.fulfilled, (state) => {
        state.loading = false;
        // state.brands = action.payload.results || action.payload;
      })
      .addCase(updateItemsMake.rejected, (_state, _action) => {
        // state.loading = false;
        // state.error = action.payload;
      })
      .addCase(deleteItemsMake.pending, (state) => {
        state.loading = true;
        // state.brandsError = null;
      })
      .addCase(deleteItemsMake.fulfilled, (state) => {
        state.loading = false;
        // state.brands = action.payload.results || action.payload;
      })
      .addCase(deleteItemsMake.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getItemsMake.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(getItemsMake.fulfilled, (state, action) => {
        state.itemsMakeLoading = false;
        state.itemsMake = action.payload;
      })
      .addCase(getItemsMake.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })

      .addCase(getProcessedItemsMake.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(getProcessedItemsMake.fulfilled, (state, action) => {
        state.itemsMakeLoading = false;
        state.itemsMakeProcessed = action.payload;
      })
      .addCase(getProcessedItemsMake.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })

      .addCase(processItemMake.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(processItemMake.fulfilled, (state) => {
        state.itemsMakeLoading = false;
      })
      .addCase(processItemMake.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })

      .addCase(createItemMake.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(createItemMake.fulfilled, (state) => {
        state.itemsMakeLoading = false;
        // state.itemsMake = action.payload;
      })
      .addCase(createItemMake.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })
      .addCase(consumeItemsMake.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(consumeItemsMake.fulfilled, (state) => {
        state.itemsMakeLoading = false;
        // state.itemsMake = action.payload;
      })
      .addCase(consumeItemsMake.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })
      .addCase(setItemMakeQuantity.pending, (state) => {
        state.itemsMakeLoading = true;
        state.error = null;
      })
      .addCase(setItemMakeQuantity.fulfilled, (state) => {
        state.itemsMakeLoading = false;
        // state.itemsMake = action.payload;
      })
      .addCase(setItemMakeQuantity.rejected, (state, action) => {
        state.itemsMakeLoading = false;
        state.error = action.payload;
      })

      // 🆕 FETCH CATEGORIES
      .addCase(fetchCategoriesAsync.pending, (state, action) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
        state.categoriesRequestId = action.meta.requestId;
      })
      .addCase(fetchCategoriesAsync.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.categoriesRequestId) return;
        state.categoriesLoading = false;
        const results = Array.isArray(action.payload?.results)
          ? action.payload.results
          : Array.isArray(action.payload)
            ? action.payload
            : [] as any[];
        if (action.meta?.arg?.append) {
          // Догрузка следующей страницы («Смотреть ещё») — дописываем без дублей
          const existingIds = new Set(
            state.categories.map((c) => String(c?.id ?? c?.name)),
          );
          state.categories = [
            ...state.categories,
            ...results.filter(
              (c) => !existingIds.has(String(c?.id ?? c?.name)),
            ),
          ];
        } else {
          state.categories = results;
        }
        state.categoriesCount =
          typeof action.payload?.count === "number"
            ? action.payload.count
            : results.length;
        state.categoriesNext = action.payload?.next ?? null;
        state.categoriesPrevious = action.payload?.previous ?? null;
      })
      .addCase(fetchCategoriesAsync.rejected, (state, action) => {
        if (action.meta.requestId !== state.categoriesRequestId) return;
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })

      // ➕ CREATE BRAND
      .addCase(createBrandAsync.pending, (state) => {
        state.creatingBrand = true;
        state.createBrandError = null;
      })
      .addCase(createBrandAsync.fulfilled, (state, action) => {
        state.creatingBrand = false;
        // Сервер мог ответить без тела — null в списке уронил бы таблицу (item.id)
        if (action.payload && typeof action.payload === "object") {
          state.brands.push(action.payload);
        }
      })
      .addCase(createBrandAsync.rejected, (state, action) => {
        state.creatingBrand = false;
        state.createBrandError = action.payload;
      })

      // ➕ CREATE CATEGORY
      .addCase(createCategoryAsync.pending, (state) => {
        state.creatingCategory = true;
        state.createCategoryError = null;
      })
      .addCase(createCategoryAsync.fulfilled, (state, action) => {
        state.creatingCategory = false;
        if (action.payload && typeof action.payload === "object") {
          state.categories.push(action.payload);
        }
      })
      .addCase(createCategoryAsync.rejected, (state, action) => {
        state.creatingCategory = false;
        state.createCategoryError = action.payload;
      })

      // ✏️ UPDATE / 🗑 DELETE BRAND & CATEGORY — флаги блокируют кнопки модалки на время запроса
      .addCase(updateBrandAsync.pending, (state) => {
        state.savingBrandCategory = true;
      })
      .addCase(updateBrandAsync.fulfilled, (state, action) => {
        state.savingBrandCategory = false;
        const updated = action.payload;
        if (updated && typeof updated === "object") {
          state.brands = state.brands.map((b) =>
            String(b?.id) === String(updated.id) ? { ...b, ...updated } : b,
          );
        }
      })
      .addCase(updateBrandAsync.rejected, (state) => {
        state.savingBrandCategory = false;
      })
      .addCase(updateCategoryAsync.pending, (state) => {
        state.savingBrandCategory = true;
      })
      .addCase(updateCategoryAsync.fulfilled, (state, action) => {
        state.savingBrandCategory = false;
        const updated = action.payload;
        if (updated && typeof updated === "object") {
          state.categories = state.categories.map((c) =>
            String(c?.id) === String(updated.id) ? { ...c, ...updated } : c,
          );
        }
      })
      .addCase(updateCategoryAsync.rejected, (state) => {
        state.savingBrandCategory = false;
      })
      .addCase(deleteBrandAsync.pending, (state) => {
        state.deletingBrandCategory = true;
      })
      .addCase(deleteBrandAsync.fulfilled, (state, action) => {
        state.deletingBrandCategory = false;
        state.brands = state.brands.filter((b) => String(b?.id) !== String(action.payload));
      })
      .addCase(deleteBrandAsync.rejected, (state) => {
        state.deletingBrandCategory = false;
      })
      .addCase(deleteCategoryAsync.pending, (state) => {
        state.deletingBrandCategory = true;
      })
      .addCase(deleteCategoryAsync.fulfilled, (state, action) => {
        state.deletingBrandCategory = false;
        state.categories = state.categories.filter((c) => String(c?.id) !== String(action.payload));
      })
      .addCase(deleteCategoryAsync.rejected, (state) => {
        state.deletingBrandCategory = false;
      })

      // ➕ CREATE PRODUCT
      .addCase(createProductAsync.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createProductAsync.fulfilled, (state, action) => {
        state.creating = false;
        state.list.unshift(action.payload);
        state.count += 1;
        state.productsCache = {};
      })
      .addCase(createProductAsync.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })

      // 🔄 UPDATE PRODUCT
      .addCase(updateProductAsync.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateProductAsync.fulfilled, (state, action) => {
        state.updating = false;
        state.productsCache = {};
        const index = state.list.findIndex(
          (product) => product.id === action.payload.id
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateProductAsync.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })

      // ❌ DELETE PRODUCT
      .addCase(deleteProductAsync.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteProductAsync.fulfilled, (state, action) => {
        state.deleting = false;
        state.productsCache = {};
        state.list = state.list.filter(
          (product) => product.id !== action.payload
        );
        state.count -= 1;
      })
      .addCase(deleteProductAsync.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      })
      .addCase(bulkUpdateProductsAsync.pending, (state) => {
        state.bulkUpdating = true;
        state.bulkUpdateError = null;
      })
      .addCase(bulkUpdateProductsAsync.fulfilled, (state, action) => {
        state.bulkUpdating = false;
        state.productsCache = {};
        // Оптимистично проставляем новые значения в текущем списке
        const {
          ids = [],
          brand_name,
          category_name,
          client,
        } = action.meta.arg || {};
        const idSet = new Set(ids.map((id) => String(id)));
        state.list = state.list.map((product) =>
          idSet.has(String(product.id))
            ? {
                ...product,
                ...(brand_name !== undefined
                  ? { brand: brand_name, brand_name }
                  : {}),
                ...(category_name !== undefined
                  ? { category: category_name, category_name }
                  : {}),
                ...(client !== undefined ? { client } : {}),
              }
            : product
        );
      })
      .addCase(bulkUpdateProductsAsync.rejected, (state, action) => {
        state.bulkUpdating = false;
        state.bulkUpdateError = action.payload;
      })
      .addCase(bulkDeleteProductsAsync.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(bulkDeleteProductsAsync.fulfilled, (state, action) => {
        state.deleting = false;
        state.productsCache = {};
        // Удаляем удаленные товары из списка
        const deletedIds = action.meta.arg.ids;
        state.list = state.list.filter(
          (product) => !deletedIds.includes(product.id)
        );
        state.count -= deletedIds.length;
      })
      .addCase(bulkDeleteProductsAsync.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      })
      .addCase(createKassa.pending, (state) => {
        state.loading = true;
        // state.deleteError = null;
      })
      .addCase(createKassa.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createKassa.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(createProductWithBarcode.pending, (state) => {
        state.loading = true;
      })
      .addCase(createProductWithBarcode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createProductWithBarcode.rejected, (state, { payload }) => {
        state.loading = false;
        if (payload) {
          state.barcodeError = payload;
        } else {
          state.barcodeError = {
            detail: "Что-то пошло не так. Попробуйте снова.",
          };
        }
      })
      .addCase(scanWarehouseProductAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(scanWarehouseProductAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(scanWarehouseProductAsync.rejected, (state, { payload }) => {
        state.loading = false;
        if (payload) {
          state.barcodeError = payload;
        } else {
          state.barcodeError = {
            detail: "Что-то пошло не так. Попробуйте снова.",
          };
        }
      })

      // 🆕 FETCH AGENT PRODUCTS
      .addCase(fetchAgentProductsAsync.pending, (state) => {
        state.agentProductsLoading = true;
        state.agentProductsError = null;
      })
      .addCase(fetchAgentProductsAsync.fulfilled, (state, action) => {
        state.agentProductsLoading = false;
        state.agentProducts = action.payload;
      })
      .addCase(fetchAgentProductsAsync.rejected, (state, action) => {
        state.agentProductsLoading = false;
        state.agentProductsError = action.payload;
      })

      // Получение товара по штрих-коду
      .addCase(getProductByBarcodeAsync.pending, (state) => {
        state.scanningProduct = true;
        state.scanProductError = null;
        state.scannedProduct = null;
      })
      .addCase(getProductByBarcodeAsync.fulfilled, (state, action) => {
        state.scanningProduct = false;
        state.scannedProduct = action.payload;
      })
      .addCase(getProductByBarcodeAsync.rejected, (state, action) => {
        state.scanningProduct = false;
        state.scanProductError = action.payload;
        state.scannedProduct = null;
      })

      // Добавление товара в склад
      .addCase(addProductToWarehouseAsync.pending, (state) => {
        state.addingToWarehouse = true;
        state.addToWarehouseError = null;
      })
      .addCase(addProductToWarehouseAsync.fulfilled, (state) => {
        state.addingToWarehouse = false;
        // Очищаем отсканированный товар после успешного добавления
        state.scannedProduct = null;
      })
      .addCase(addProductToWarehouseAsync.rejected, (state, action) => {
        state.addingToWarehouse = false;
        state.addToWarehouseError = action.payload;
      });
  },
});

export const useProducts = () => useSelector((state: any) => state.product);
export const {
  clearProducts,
  clearScannedProduct,
  loadProductsFromCache,
  clearProductsCache,
} = productSlice.actions;
export default productSlice.reducer;
