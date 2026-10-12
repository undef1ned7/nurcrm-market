import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProductsAsync,
  fetchBrandsAsync,
  fetchCategoriesAsync,
} from "@entities/product";
import { fetchCatalogVersion, loadProductsFromCache } from "@entities/product";

/**
 * Хук для загрузки справочников (бренды и категории)
 * @returns {Object} Объект с брендами и категориями
 */
export const useWarehouseReferences = () => {
  const dispatch = useDispatch() as any;

  // Оптимизация селекторов с мемоизацией
  const brands = useSelector(
    (state: any) => state.product.brands || [],
    (prev, next) =>
      prev.length === next.length &&
      prev.every((item, idx) => item.id === next[idx]?.id)
  );

  const categories = useSelector(
    (state: any) => state.product.categories || [],
    (prev, next) =>
      prev.length === next.length &&
      prev.every((item, idx) => item.id === next[idx]?.id)
  );

  // Загрузка справочников только если данных нет (кэширование)
  useEffect(() => {
    if (brands.length === 0) {
      dispatch((fetchBrandsAsync as any)());
    }
    if (categories.length === 0) {
      dispatch((fetchCategoriesAsync as any)());
    }
  }, [dispatch, brands.length, categories.length]);


  return { brands, categories };
};

// Функция для создания ключа кэша из параметров
const createCacheKey = (params) => {
  if (!params || Object.keys(params).length === 0) return "";
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as any);
  return JSON.stringify(sortedParams);
};

// Время жизни кэша (5 минут)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Хук для управления данными склада с кэшированием
 * @param {Object} params - Параметры запроса товаров
 * @returns {Object} Объект с данными и состоянием загрузки
 */
export const useWarehouseData = (params) => {
  const dispatch = useDispatch() as any;
  const lastParamsRef = useRef("");
  const cacheLoadedRef = useRef(false);

  // Сериализация params для стабильного сравнения и ключа кэша
  const paramsString = useMemo(() => {
    return createCacheKey(params);
  }, [params]);

  // Селектор для кэша
  const productsCache = useSelector(
    (state: any) => state.product.productsCache || {}
  );

  // Проверяем кэш синхронно и загружаем данные сразу, если они есть
  const cachedData = useMemo(() => {
    if (!paramsString) return null;
    const data = productsCache[paramsString];
    if (data && data.timestamp) {
      const cacheAge = Date.now() - data.timestamp;
      if (cacheAge < CACHE_TTL) {
        return data;
      }
    }
    return null;
  }, [paramsString, productsCache]);

  // Оптимизированные селекторы - выбираем только нужные поля
  const products = useSelector((state: any) => state.product.list);
  const loading = useSelector((state: any) => state.product.loading);
  const count = useSelector((state: any) => state.product.count);
  const next = useSelector((state: any) => state.product.next);
  const previous = useSelector((state: any) => state.product.previous);
  const error = useSelector((state: any) => state.product.error);

  // Загрузка товаров при изменении параметров с приоритетом кэша
  useEffect(() => {
    if (!params || Object.keys(params).length === 0) return;

    const cacheKey = paramsString;

    // Пропускаем, если это те же параметры
    if (cacheKey === lastParamsRef.current) return;

    lastParamsRef.current = cacheKey;

    const fetchFresh = (catalogVersion: string | null) =>
      dispatch(
        fetchProductsAsync({
          ...params,
          _cacheKey: cacheKey,
          _skipLoadingIfCached: !!cachedData, // Флаг для пропуска loading если есть кэш
          ...(catalogVersion ? { _catalogVersion: catalogVersion } : {}),
        })
      );

    if (!cachedData) {
      fetchFresh(null);
      return;
    }

    // Есть валидный кэш — показываем его СИНХРОННО (без белого экрана при
    // быстрой смене страниц) и сверяем версию каталога (~30 мс). Каталог не
    // менялся — список заново не качаем; изменился или версию узнать нельзя —
    // фоновое обновление, как раньше (stale-while-revalidate).
    dispatch(loadProductsFromCache({ cacheKey, cachedData }));
    cacheLoadedRef.current = true;
    // Версию берём до списка: изменение посреди загрузки увидит следующая сверка
    void fetchCatalogVersion()
      .catch(() => null)
      .then((version) => {
        // Пока ждали версию, пользователь ушёл на другие параметры — не мешаем
        if (lastParamsRef.current !== cacheKey) return;
        if (version !== null && cachedData.catalogVersion === version) return;
        fetchFresh(version);
      });
  }, [dispatch, paramsString, cachedData, params]);

  // Если есть валидный кэш и данные уже загружены, не показываем loading
  // Это предотвращает белый экран при быстрой смене страниц
  const effectiveLoading = cachedData && products.length > 0 ? false : loading;

  // Повторная загрузка тех же параметров (кнопка «Повторить» после ошибки)
  const reload = useCallback(() => {
    if (!params || Object.keys(params).length === 0) return;
    dispatch(fetchProductsAsync({ ...params, _cacheKey: paramsString }));
  }, [dispatch, params, paramsString]);

  return {
    products,
    loading: effectiveLoading,
    count,
    next,
    previous,
    error,
    reload,
  };
};
