import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRICE_CHECK_PAGE_SIZE,
  PriceCheckUnavailableError,
  buildLocalPriceCheck,
  fetchCatalogSnapshotMeta,
  fetchCatalogVersion,
  fetchPriceCheckPage,
  type CatalogSnapshot,
  type PriceCheckPage,
  type PriceCheckQuery,
} from "@entities/product";

/** Автообновление, пока вкладка открыта и видна. */
export const PRICE_CHECK_REFRESH_MS = 120_000;

type LoadKind = "initial" | "query" | "refresh";

const isCanceled = (err: any, signal: AbortSignal) =>
  signal.aborted || err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

/**
 * Данные «Проверки цен».
 * Обычно — сервер (`price-check/`): одна страница строк + итоги и счётчики.
 * Если на сервере такого эндпоинта нет — запасной путь: каталог качается целиком
 * и считается в браузере (как было до 08.10.2026), с предупреждением об обрезке.
 *
 * Автообновление раз в 2 минуты сначала спрашивает лёгкую версию каталога
 * (`catalog-version/`): не изменилась — ничего не качаем. Если версию узнать
 * нельзя — повторный запрос с If-None-Match, сервер отвечает 304 без тела.
 */
export function usePriceCheck(query: PriceCheckQuery, active: boolean) {
  const [data, setData] = useState<PriceCheckPage | null>(null);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [mode, setMode] = useState<"server" | "local">("server");
  const [truncated, setTruncated] = useState<{ loaded: number; total: number | null } | null>(null);

  const modeRef = useRef<"server" | "local">("server");
  const snapshotRef = useRef<CatalogSnapshot | null>(null);
  /** Версия каталога, по которой получены текущие данные. */
  const versionRef = useRef<string | null>(null);
  /** ETag первой страницы текущего запроса. */
  const etagRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const loadedAtRef = useRef(0);
  const pagesRef = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;
  const queryKey = JSON.stringify(query);

  const switchToLocal = () => {
    modeRef.current = "local";
    setMode("local");
  };

  /** Страницы 1..n текущего запроса. null — сервер ответил 304 (ничего не изменилось). */
  const fetchPages = async (
    q: PriceCheckQuery,
    n: number,
    signal: AbortSignal,
    { etag, reloadCatalog }: { etag: string | null; reloadCatalog: boolean },
  ): Promise<PriceCheckPage | null> => {
    if (modeRef.current === "server") {
      try {
        const first = await fetchPriceCheckPage(q, 1, { signal, etag });
        if (first === null) return null;
        let merged = first;
        for (let p = 2; p <= n && merged.hasNext; p += 1) {
          const next = await fetchPriceCheckPage(q, p, { signal });
          if (!next) break;
          merged = { ...merged, rows: [...merged.rows, ...next.rows], hasNext: next.hasNext };
        }
        return merged;
      } catch (err) {
        if (!(err instanceof PriceCheckUnavailableError)) throw err;
        switchToLocal();
      }
    }
    if (!snapshotRef.current || reloadCatalog) {
      snapshotRef.current = await fetchCatalogSnapshotMeta(signal);
    }
    const snap = snapshotRef.current;
    setTruncated(snap.truncated ? { loaded: snap.items.length, total: snap.total } : null);
    return buildLocalPriceCheck(snap.items, q, 1, n * PRICE_CHECK_PAGE_SIZE);
  };

  const load = useCallback(async (kind: LoadKind) => {
    // Новая загрузка отменяет старую: на медленной сети они не идут параллельно,
    // и старый ответ не перетирает свежий.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const q = queryRef.current;
    const key = JSON.stringify(q);
    setLoading(true);
    setLoadingMore(false);
    setError(false);
    try {
      // Версию берём ДО данных: если каталог поменяется посреди загрузки,
      // следующее автообновление увидит новую версию и перезагрузит.
      let version: string | null = null;
      if (kind !== "query") {
        version = await fetchCatalogVersion(ctrl.signal);
        if (
          kind === "refresh" &&
          version !== null &&
          version === versionRef.current &&
          loadedKeyRef.current === key
        ) {
          loadedAtRef.current = Date.now();
          setCheckedAt(new Date());
          return;
        }
      }
      const sameQuery = loadedKeyRef.current === key;
      const n = sameQuery ? Math.max(pagesRef.current, 1) : 1;
      const result = await fetchPages(q, n, ctrl.signal, {
        etag: kind === "refresh" && sameQuery ? etagRef.current : null,
        reloadCatalog: kind !== "query",
      });
      if (ctrl.signal.aborted) return;
      if (result) {
        setData(result);
        pagesRef.current = n;
        setPages(n);
        etagRef.current = result.etag;
        loadedKeyRef.current = key;
      }
      if (kind !== "query") versionRef.current = version;
      loadedAtRef.current = Date.now();
      setCheckedAt(new Date());
    } catch (err) {
      if (!isCanceled(err, ctrl.signal)) setError(true);
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  /** «Показать ещё»: следующая страница строк. */
  const loadMore = useCallback(async () => {
    if (abortRef.current || !data?.hasNext) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const q = queryRef.current;
    const nextPage = pagesRef.current + 1;
    setLoadingMore(true);
    setError(false);
    try {
      let page: PriceCheckPage | null;
      if (modeRef.current === "server") {
        page = await fetchPriceCheckPage(q, nextPage, { signal: ctrl.signal });
      } else {
        page = buildLocalPriceCheck(snapshotRef.current?.items ?? [], q, nextPage);
      }
      if (ctrl.signal.aborted || !page) return;
      const more = page;
      setData((prev) =>
        prev ? { ...prev, rows: [...prev.rows, ...more.rows], hasNext: more.hasNext } : more,
      );
      pagesRef.current = nextPage;
      setPages(nextPage);
    } catch (err) {
      if (err instanceof PriceCheckUnavailableError) {
        switchToLocal();
        void load("initial");
      } else if (!isCanceled(err, ctrl.signal)) {
        setError(true);
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setLoadingMore(false);
      }
    }
  }, [data?.hasNext, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Первая загрузка — при первом показе вкладки; смена фильтра/поиска/порога —
  // сразу новый запрос; автообновление — пока вкладка открыта и видна.
  useEffect(() => {
    if (!active) return undefined;
    if (loadedKeyRef.current === null) {
      // Ещё ничего не загружено: (пере)запускаем с актуальным запросом, даже если
      // первая загрузка уже идёт — иначе фильтр, выбранный во время неё, потеряется.
      void load("initial");
    } else if (loadedKeyRef.current !== queryKey) {
      void load("query");
    } else if (Date.now() - loadedAtRef.current >= PRICE_CHECK_REFRESH_MS && !abortRef.current) {
      void load("refresh");
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && !abortRef.current) void load("refresh");
    }, PRICE_CHECK_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [active, queryKey, load]);

  const refresh = useCallback(() => void load("refresh"), [load]);

  return { data, pages, loading, loadingMore, error, checkedAt, mode, truncated, refresh, loadMore };
}
