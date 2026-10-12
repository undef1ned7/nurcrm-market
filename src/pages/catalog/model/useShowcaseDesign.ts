import { useCallback, useEffect, useRef, useState } from "react";
import api from "@shared/api";
import { normalizeDesign, type ShowcaseDesign } from "./showcaseDesign";

/** Сколько ждём оформление, прежде чем показать витрину в стандартном виде. */
const FIRST_PAINT_WAIT_MS = 2500;
/** Повторный запрос при возврате на вкладку — не чаще, чем раз в N мс. */
const REFETCH_ON_FOCUS_MS = 15_000;

const cacheKey = (slug: string) => `showcase_design_${slug}`;

const readCache = (slug: string): ShowcaseDesign | null => {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    return raw ? normalizeDesign(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const writeCache = (slug: string, raw: unknown) => {
  try {
    if (raw) localStorage.setItem(cacheKey(slug), JSON.stringify(raw));
    else localStorage.removeItem(cacheKey(slug));
  } catch {
    // ignore
  }
};

export type DesignState = {
  /** Нормализованный документ; null — показываем витрину в стандартном виде. */
  design: ShowcaseDesign | null;
  /** Можно рисовать страницу (оформление пришло, взято из кэша или истекло ожидание). */
  ready: boolean;
  /** В адресе есть ?preview=, но сервер его не принял — показан опубликованный вид. */
  previewInvalid: boolean;
};

/**
 * Оформление витрины. Опубликованный вид кэшируется в localStorage и сразу
 * показывается при следующем открытии, затем сверяется с сервером.
 * Черновик (?preview=) не кэшируется.
 */
export function useShowcaseDesign(slug: string, previewToken: string): DesignState {
  const [state, setState] = useState<DesignState>(() => {
    const cached = !previewToken && slug ? readCache(slug) : null;
    return { design: cached, ready: !!cached, previewInvalid: false };
  });
  const lastFetchRef = useRef(0);

  const load = useCallback(
    async (isAlive: () => boolean) => {
      if (!slug) return;
      lastFetchRef.current = Date.now();
      const url = `/main/public/companies/${encodeURIComponent(slug)}/showcase/design/`;

      const fetchDesign = async (preview?: string) => {
        const res = await api.get(url, {
          params: preview ? { preview } : undefined,
          timeout: 10_000,
        });
        return res?.data;
      };

      let previewInvalid = false;
      let raw: unknown = null;
      let ok = false;

      if (previewToken) {
        try {
          raw = await fetchDesign(previewToken);
          ok = true;
        } catch (e: any) {
          previewInvalid = !!e?.response;
        }
      }
      if (!ok) {
        try {
          raw = await fetchDesign();
          ok = true;
          if (!previewToken) writeCache(slug, raw);
        } catch (e) {
          console.error(e);
        }
      }
      if (!isAlive()) return;

      setState((prev) => {
        if (!ok) {
          // Нет связи: оставляем то, что уже показано (кэш), иначе стандартный вид.
          return { ...prev, ready: true, previewInvalid };
        }
        return { design: normalizeDesign(raw), ready: true, previewInvalid };
      });
    },
    [slug, previewToken],
  );

  useEffect(() => {
    let alive = true;
    const cached = !previewToken && slug ? readCache(slug) : null;
    setState({ design: cached, ready: !!cached, previewInvalid: false });

    const timer = window.setTimeout(() => {
      if (alive) setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    }, FIRST_PAINT_WAIT_MS);

    load(() => alive);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetchRef.current < REFETCH_ON_FOCUS_MS) return;
      load(() => alive);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug, previewToken, load]);

  return state;
}

/** true, если устройство в тёмной теме (для `theme.mode = auto`). */
export function usePrefersDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setDark(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return dark;
}
