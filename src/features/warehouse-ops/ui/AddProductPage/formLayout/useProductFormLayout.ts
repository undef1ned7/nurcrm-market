import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchProductFormLayout,
  isMissingLayoutEndpoint,
  updateProductFormLayout,
} from "./api";
import { PRODUCT_FORM_BLOCK_META } from "./constants";
import { isBlockVisible } from "./hasBlockValue";
import { loadProductFormLayout, saveProductFormLayout } from "./storage";
import type {
  ProductFormBlockId,
  ProductFormLayout,
  ProductFormLayoutValues,
} from "./types";

const SAVE_DEBOUNCE_MS = 500;

type Options = {
  companyId?: string | number | null;
  canCustomize?: boolean;
  values?: ProductFormLayoutValues;
  onSaveError?: (message: string) => void;
  /** Блоки, скрытые видом магазина (не раскладкой): их нельзя «добавить обратно». */
  sphereHidden?: readonly string[];
};

export function useProductFormLayout({
  companyId,
  canCustomize = false,
  values = {},
  onSaveError,
  sphereHidden = [],
}: Options) {
  const [layout, setLayout] = useState<ProductFormLayout>(() =>
    loadProductFormLayout(companyId),
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [remoteAvailable, setRemoteAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const dirtyRef = useRef(false);
  const remoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  const persistLocal = useCallback(
    (next: ProductFormLayout) => {
      saveProductFormLayout(next, companyId);
    },
    [companyId],
  );

  const flushRemote = useCallback(
    async (next: ProductFormLayout) => {
      if (!remoteRef.current || !canCustomize) return;
      setSaving(true);
      try {
        const saved = await updateProductFormLayout(next);
        persistLocal(saved);
        setLayout(saved);
        layoutRef.current = saved;
      } catch (error) {
        if (isMissingLayoutEndpoint(error)) {
          remoteRef.current = false;
          setRemoteAvailable(false);
          return;
        }
        onSaveErrorRef.current?.(
          "Не удалось сохранить раскладку формы на сервер. На этом устройстве она останется.",
        );
      } finally {
        setSaving(false);
      }
    },
    [canCustomize, persistLocal],
  );

  const scheduleRemote = useCallback(
    (next: ProductFormLayout) => {
      persistLocal(next);
      if (!remoteRef.current || !canCustomize) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        flushRemote(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [canCustomize, flushRemote, persistLocal],
  );

  useEffect(() => {
    let cancelled = false;
    dirtyRef.current = false;

    const cached = loadProductFormLayout(companyId);
    setLayout(cached);
    layoutRef.current = cached;

    const load = async () => {
      try {
        const remote = await fetchProductFormLayout();
        if (cancelled || dirtyRef.current) return;
        persistLocal(remote);
        setLayout(remote);
        layoutRef.current = remote;
        remoteRef.current = true;
        setRemoteAvailable(true);
      } catch {
        if (cancelled) return;
        remoteRef.current = false;
        setRemoteAvailable(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [companyId, persistLocal]);

  const apply = useCallback(
    (nextHidden: ProductFormBlockId[]) => {
      dirtyRef.current = true;
      const next = { hidden: nextHidden };
      setLayout(next);
      layoutRef.current = next;
      scheduleRemote(next);
    },
    [scheduleRemote],
  );

  const hideBlock = useCallback(
    (id: ProductFormBlockId) => {
      if (layoutRef.current.hidden.includes(id)) return;
      apply([...layoutRef.current.hidden, id]);
    },
    [apply],
  );

  const showBlock = useCallback(
    (id: ProductFormBlockId) => {
      apply(layoutRef.current.hidden.filter((item) => item !== id));
    },
    [apply],
  );

  const resetLayout = useCallback(() => {
    apply([]);
  }, [apply]);

  const startCustomize = useCallback(() => {
    if (!canCustomize) return;
    setIsCustomizing(true);
  }, [canCustomize]);

  const finishCustomize = useCallback(() => {
    setIsCustomizing(false);
    setAddSheetOpen(false);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    flushRemote(layoutRef.current);
  }, [flushRemote]);

  const sphereHiddenKey = sphereHidden.join(",");
  const isVisible = useCallback(
    (id: ProductFormBlockId) =>
      !sphereHiddenKey.split(",").includes(id) &&
      isBlockVisible(id, layout.hidden, valuesRef.current),
    [layout.hidden, sphereHiddenKey],
  );

  const hiddenBlocks = useMemo(
    () => layout.hidden.map((id) => PRODUCT_FORM_BLOCK_META[id]),
    [layout.hidden],
  );

  const hiddenCount = layout.hidden.length;

  return {
    layout,
    hiddenCount,
    hiddenBlocks,
    isCustomizing,
    addSheetOpen,
    setAddSheetOpen,
    remoteAvailable,
    saving,
    canCustomize,
    isVisible,
    hideBlock,
    showBlock,
    resetLayout,
    startCustomize,
    finishCustomize,
  };
}

export type ProductFormLayoutApi = ReturnType<typeof useProductFormLayout>;
