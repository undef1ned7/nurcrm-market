import { createSlice } from "@reduxjs/toolkit";
import { applyPagination } from "@shared/lib/pagination";
import {
  fetchWarehousesAsync,
  createWarehouseAsync,
  updateWarehouseAsync,
  deleteWarehouseAsync,
  fetchWarehouseBrandsAsync,
  createWarehouseBrandAsync,
  updateWarehouseBrandAsync,
  deleteWarehouseBrandAsync,
  bulkDeleteWarehouseBrandsAsync,
  fetchWarehouseCategoriesAsync,
  createWarehouseCategoryAsync,
  updateWarehouseCategoryAsync,
  deleteWarehouseCategoryAsync,
  bulkDeleteWarehouseCategoriesAsync,
  fetchAgentProductsAsync,
} from "./warehouseCreators";

const initialState = {
  list: [] as any[],
  count: 0,
  next: null as any,
  previous: null as any,
  loading: false,
  error: null as any,

  creating: false,
  createError: null as any,

  updating: false,
  updateError: null as any,

  deleting: false,
  deleteError: null as any,

  // Warehouse Brands
  brands: [] as any[],
  brandsCount: 0,
  brandsNext: null as any,
  brandsPrevious: null as any,
  brandsLoading: false,
  brandsError: null as any,
  creatingBrand: false,
  createBrandError: null as any,
  updatingBrand: false,
  updateBrandError: null as any,
  deletingBrand: false,
  deleteBrandError: null as any,

  // Warehouse Categories
  categories: [] as any[],
  categoriesCount: 0,
  categoriesNext: null as any,
  categoriesPrevious: null as any,
  categoriesLoading: false,
  categoriesError: null as any,
  creatingCategory: false,
  createCategoryError: null as any,
  updatingCategory: false,
  updateCategoryError: null as any,
  deletingCategory: false,
  deleteCategoryError: null as any,

  // Warehouse agent products (my stocks)
  agentProducts: [] as any[],
  agentProductsCount: 0,
  agentProductsNext: null as any,
  agentProductsPrevious: null as any,
  agentProductsLoading: false,
  agentProductsError: null as any,
};

const warehouseSlice = createSlice({
  name: "warehouse",
  initialState,
  reducers: {
    clearWarehouses: (state) => {
      state.list = [];
      state.count = 0;
      state.next = null;
      state.previous = null;
      state.loading = false;
      state.error = null;
    },
    clearCreateError: (state) => {
      state.createError = null;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    },
    clearDeleteError: (state) => {
      state.deleteError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch warehouses
      .addCase(fetchWarehousesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWarehousesAsync.fulfilled, (state, action) => {
        state.loading = false;
        applyPagination(state, action.payload, "list");
      })
      .addCase(fetchWarehousesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create warehouse
      .addCase(createWarehouseAsync.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createWarehouseAsync.fulfilled, (state, action) => {
        state.creating = false;
        // Добавляем новый склад в начало списка
        state.list = [action.payload, ...state.list];
        state.count = (state.count || 0) + 1;
      })
      .addCase(createWarehouseAsync.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })

      // Update warehouse
      .addCase(updateWarehouseAsync.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateWarehouseAsync.fulfilled, (state, action) => {
        state.updating = false;
        // Обновляем склад в списке
        const index = state.list.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateWarehouseAsync.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })

      // Delete warehouse
      .addCase(deleteWarehouseAsync.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteWarehouseAsync.fulfilled, (state, action) => {
        state.deleting = false;
        // Удаляем склад из списка
        state.list = state.list.filter((w) => w.id !== action.payload);
        state.count = Math.max(0, (state.count || 0) - 1);
      })
      .addCase(deleteWarehouseAsync.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      })

      // Warehouse Brands
      .addCase(fetchWarehouseBrandsAsync.pending, (state) => {
        state.brandsLoading = true;
        state.brandsError = null;
      })
      .addCase(fetchWarehouseBrandsAsync.fulfilled, (state, action) => {
        state.brandsLoading = false;
        const results = Array.isArray(action.payload.results)
          ? action.payload.results
          : Array.isArray(action.payload)
          ? action.payload
          : [] as any[];
        state.brands = results;
        state.brandsCount =
          typeof action.payload.count === "number"
            ? action.payload.count
            : results.length;
        state.brandsNext = action.payload.next ?? null;
        state.brandsPrevious = action.payload.previous ?? null;
      })
      .addCase(fetchWarehouseBrandsAsync.rejected, (state, action) => {
        state.brandsLoading = false;
        state.brandsError = action.payload;
      })
      .addCase(createWarehouseBrandAsync.pending, (state) => {
        state.creatingBrand = true;
        state.createBrandError = null;
      })
      .addCase(createWarehouseBrandAsync.fulfilled, (state, action) => {
        state.creatingBrand = false;
        state.brands = [action.payload, ...state.brands];
        state.brandsCount = (state.brandsCount || 0) + 1;
      })
      .addCase(createWarehouseBrandAsync.rejected, (state, action) => {
        state.creatingBrand = false;
        state.createBrandError = action.payload;
      })
      .addCase(updateWarehouseBrandAsync.pending, (state) => {
        state.updatingBrand = true;
        state.updateBrandError = null;
      })
      .addCase(updateWarehouseBrandAsync.fulfilled, (state, action) => {
        state.updatingBrand = false;
        const index = state.brands.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.brands[index] = action.payload;
        }
      })
      .addCase(updateWarehouseBrandAsync.rejected, (state, action) => {
        state.updatingBrand = false;
        state.updateBrandError = action.payload;
      })
      .addCase(deleteWarehouseBrandAsync.pending, (state) => {
        state.deletingBrand = true;
        state.deleteBrandError = null;
      })
      .addCase(deleteWarehouseBrandAsync.fulfilled, (state, action) => {
        state.deletingBrand = false;
        state.brands = state.brands.filter((b) => b.id !== action.payload);
        state.brandsCount = Math.max(0, (state.brandsCount || 0) - 1);
      })
      .addCase(deleteWarehouseBrandAsync.rejected, (state, action) => {
        state.deletingBrand = false;
        state.deleteBrandError = action.payload;
      })
      .addCase(bulkDeleteWarehouseBrandsAsync.pending, (state) => {
        state.deletingBrand = true;
        state.deleteBrandError = null;
      })
      .addCase(bulkDeleteWarehouseBrandsAsync.fulfilled, (state, action) => {
        state.deletingBrand = false;
        const deletedIds = new Set(action.payload?.deleted_ids || []);
        state.brands = state.brands.filter((b) => !deletedIds.has(b.id));
        state.brandsCount = Math.max(
          0,
          (state.brandsCount || 0) - deletedIds.size
        );
      })
      .addCase(bulkDeleteWarehouseBrandsAsync.rejected, (state, action) => {
        state.deletingBrand = false;
        state.deleteBrandError = action.payload;
      })

      // Warehouse Categories
      .addCase(fetchWarehouseCategoriesAsync.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchWarehouseCategoriesAsync.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        const results = Array.isArray(action.payload.results)
          ? action.payload.results
          : Array.isArray(action.payload)
          ? action.payload
          : [] as any[];
        state.categories = results;
        state.categoriesCount =
          typeof action.payload.count === "number"
            ? action.payload.count
            : results.length;
        state.categoriesNext = action.payload.next ?? null;
        state.categoriesPrevious = action.payload.previous ?? null;
      })
      .addCase(fetchWarehouseCategoriesAsync.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      })
      .addCase(createWarehouseCategoryAsync.pending, (state) => {
        state.creatingCategory = true;
        state.createCategoryError = null;
      })
      .addCase(createWarehouseCategoryAsync.fulfilled, (state, action) => {
        state.creatingCategory = false;
        state.categories = [action.payload, ...state.categories];
        state.categoriesCount = (state.categoriesCount || 0) + 1;
      })
      .addCase(createWarehouseCategoryAsync.rejected, (state, action) => {
        state.creatingCategory = false;
        state.createCategoryError = action.payload;
      })
      .addCase(updateWarehouseCategoryAsync.pending, (state) => {
        state.updatingCategory = true;
        state.updateCategoryError = null;
      })
      .addCase(updateWarehouseCategoryAsync.fulfilled, (state, action) => {
        state.updatingCategory = false;
        const index = state.categories.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(updateWarehouseCategoryAsync.rejected, (state, action) => {
        state.updatingCategory = false;
        state.updateCategoryError = action.payload;
      })
      .addCase(deleteWarehouseCategoryAsync.pending, (state) => {
        state.deletingCategory = true;
        state.deleteCategoryError = null;
      })
      .addCase(deleteWarehouseCategoryAsync.fulfilled, (state, action) => {
        state.deletingCategory = false;
        state.categories = state.categories.filter(
          (c) => c.id !== action.payload
        );
        state.categoriesCount = Math.max(0, (state.categoriesCount || 0) - 1);
      })
      .addCase(deleteWarehouseCategoryAsync.rejected, (state, action) => {
        state.deletingCategory = false;
        state.deleteCategoryError = action.payload;
      })
      .addCase(bulkDeleteWarehouseCategoriesAsync.pending, (state) => {
        state.deletingCategory = true;
        state.deleteCategoryError = null;
      })
      .addCase(
        bulkDeleteWarehouseCategoriesAsync.fulfilled,
        (state, action) => {
          state.deletingCategory = false;
          const deletedIds = new Set(action.payload?.deleted_ids || []);
          state.categories = state.categories.filter(
            (c) => !deletedIds.has(c.id)
          );
          state.categoriesCount = Math.max(
            0,
            (state.categoriesCount || 0) - deletedIds.size
          );
        }
      )
      .addCase(bulkDeleteWarehouseCategoriesAsync.rejected, (state, action) => {
        state.deletingCategory = false;
        state.deleteCategoryError = action.payload;
      })

      // Warehouse agent products
      .addCase(fetchAgentProductsAsync.pending, (state) => {
        state.agentProductsLoading = true;
        state.agentProductsError = null;
      })
      .addCase(fetchAgentProductsAsync.fulfilled, (state, action) => {
        state.agentProductsLoading = false;
        const results = Array.isArray(action.payload?.results)
          ? action.payload.results
          : Array.isArray(action.payload)
            ? action.payload
            : [] as any[];
        state.agentProducts = results;
        state.agentProductsCount =
          typeof action.payload?.count === "number"
            ? action.payload.count
            : results.length;
        state.agentProductsNext = action.payload?.next ?? null;
        state.agentProductsPrevious = action.payload?.previous ?? null;
      })
      .addCase(fetchAgentProductsAsync.rejected, (state, action) => {
        state.agentProductsLoading = false;
        state.agentProductsError = action.payload;
      });
  },
});

export const {
  clearWarehouses,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
} = warehouseSlice.actions;

export default warehouseSlice.reducer;
