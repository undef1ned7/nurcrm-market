import { useCallback, useEffect, useState } from "react";
import api from "@shared/api";
import { listFrom } from "../ui/catalog.utils";
import type { PaginationMode } from "./showcaseDesign";

export type ItemsQuery = {
  slug: string;
  category: string;
  q: string;
  ordering: string;
  pageSize: number;
  mode: PaginationMode;
  /** Номер страницы из адреса — только для режима `pages`. */
  page: number;
};

/** null — ошибки нет; число — HTTP-статус; 0 — нет ответа сервера. */
export type LoadError = number | null;

/**
 * Товары витрины. `pages` — одна страница по номеру из адреса;
 * `load_more` / `infinite` — страницы дописываются к уже показанным.
 */
export function useShowcaseItems({ slug, category, q, ordering, pageSize, mode, page }: ItemsQuery) {
  const append = mode !== "pages";
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError>(null);
  const [hasMore, setHasMore] = useState(false);

  const filterKey = `${slug}|${category}|${q}|${ordering}|${pageSize}|${mode}`;
  // Страница дописывания привязана к фильтру: новый фильтр — снова с первой.
  const [appendState, setAppendState] = useState({ key: filterKey, page: 1 });
  const appendPage = appendState.key === filterKey ? appendState.page : 1;

  const pageNum = append ? appendPage : Math.max(1, page);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const first = pageNum === 1 || !append;
    if (first) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    const params: Record<string, any> = { page_size: pageSize, page: pageNum };
    if (category) params.category = category;
    if (q) params.search = q;
    if (ordering) params.ordering = ordering;

    api
      .get(`/main/public/companies/${encodeURIComponent(slug)}/showcase/`, { params })
      .then((res) => {
        if (!alive) return;
        const data = res?.data || {};
        const arr = listFrom(res);
        const safeArr = Array.isArray(arr) ? arr : [];
        const total = Number.isFinite(Number(data.count)) ? Number(data.count) : safeArr.length;
        setItems((prev) => {
          if (first) return safeArr;
          const seen = new Set(prev.map((x) => String(x?.id)));
          return [...prev, ...safeArr.filter((x) => !seen.has(String(x?.id)))];
        });
        setCount(total);
        setHasMore(data.next ? true : pageNum * pageSize < total);
      })
      .catch((e: any) => {
        if (!alive) return;
        console.error(e);
        if (first) {
          setItems([]);
          setCount(0);
        }
        setHasMore(false);
        setError(e?.response?.status || 0);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      alive = false;
    };
  }, [filterKey, pageNum]);

  const loadMore = useCallback(() => {
    if (!append || loading || loadingMore || !hasMore) return;
    setAppendState({ key: filterKey, page: appendPage + 1 });
  }, [append, loading, loadingMore, hasMore, filterKey, appendPage]);

  return { items, count, loading, loadingMore, error, hasMore, loadMore };
}

export type PublicCategory = {
  id: string;
  title: any;
  name?: string;
  products_count?: number | null;
  image?: string | null;
  image_urls?: any;
};

/** Полный список категорий витрины; null — эндпоинт недоступен (берём из товаров). */
export function useShowcaseCategories(slug: string) {
  const [list, setList] = useState<PublicCategory[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    api
      .get(`/main/public/companies/${encodeURIComponent(slug)}/showcase/categories/`)
      .then((res) => {
        if (!alive) return;
        const arr = listFrom(res);
        setList(Array.isArray(arr) ? arr : null);
      })
      .catch(() => alive && setList(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  return list;
}
