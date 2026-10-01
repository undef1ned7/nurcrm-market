import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18n from "@shared/config/i18n";
import useScanDetection from "@shared/hooks/useScanDetection";
import { getBarcodeAmbiguity } from "@shared/lib/tools/barcodeAmbiguity";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  checkServerBarcode,
  classifyBarcodeFallback,
  createCompanyProduct,
  isMassIncomingEndpointMissing,
  postIncomingViaProduct,
  postMassIncoming,
  postMassIncomingBatch,
  resolveMarketWarehouseId,
  updateProductPrice,
} from "../api/massIncomingApi";
import { mergeScannedRow, rowKey } from "../lib/classifyBarcode";
import { playScanSuccess, playScanUnknown } from "../lib/scanSounds";
import type { MassIncomingCheck, MassIncomingRow, MassIncomingStatus } from "./types";

const DEBOUNCE_MS = 300;

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(`crm.warehouse.massIncoming.${key}`, options);

type Mode = { warehouseId: string; server: boolean };

const hasPrice = (value: string) => {
  const trimmed = String(value || "").trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
};

/** Тело одной позиции для единого батч-запроса приход (см. `postMassIncomingBatch`). */
const buildBatchItem = (row: MassIncomingRow) => {
  if (row.productId) {
    const price = row.price.trim();
    return {
      product_id: row.productId,
      quantity: String(row.quantity),
      ...(price && price !== row.initialPrice ? { price } : {}),
    };
  }
  // Карточки ещё нет: только source = "global" доходит сюда (UNKNOWN/"none"
  // в приход не идёт, см. `isIncoming` в `save`).
  return {
    barcode: row.barcode,
    name: row.name,
    price: row.price.trim(),
    quantity: String(row.quantity),
    from_global: row.source === "global",
  };
};

/** Заменяет строку `fromKey` на `next`; если строка с новым ключом уже есть — суммирует количество. */
const replaceRow = (rows: MassIncomingRow[], fromKey: string, next: MassIncomingRow) => {
  const duplicate = next.key !== fromKey && rows.some((row) => row.key === next.key);
  if (!duplicate) return rows.map((row) => (row.key === fromKey ? next : row));
  return rows
    .filter((row) => row.key !== fromKey)
    .map((row) =>
      row.key === next.key ? { ...row, quantity: row.quantity + next.quantity } : row,
    );
};

export function useMassIncoming() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });
  const modeRef = useRef<Mode>({ warehouseId: "", server: false });
  const modeReadyRef = useRef<Promise<void> | null>(null);
  // Сканы обрабатываются строго по очереди: при быстром массовом скане
  // ни один код не теряется, пока предыдущий ещё проверяется.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const rowsRef = useRef<MassIncomingRow[]>([]);
  // Пока true — «Провести приход» сначала пробует один батч-запрос
  // (postMassIncomingBatch). После первого 404/405/501 переходим на
  // пошаговый фолбэк до конца сессии экрана.
  const batchSupportedRef = useRef(true);

  const [barcode, setBarcode] = useState("");
  const [rows, setRows] = useState<MassIncomingRow[]>([]);
  const [pending, setPending] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createFor, setCreateFor] = useState<MassIncomingRow | null>(null);
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPriceErrors, setShowPriceErrors] = useState(false);

  const busy = pending > 0 || creating;
  const dirty = rows.length > 0;

  rowsRef.current = rows;

  const ensureMode = useCallback(() => {
    if (!modeReadyRef.current) {
      modeReadyRef.current = resolveMarketWarehouseId().then((warehouseId) => {
        modeRef.current = { warehouseId, server: Boolean(warehouseId) };
      });
    }
    return modeReadyRef.current;
  }, []);

  useEffect(() => {
    void ensureMode();
  }, [ensureMode]);

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Сканер работает глобально (см. useScanDetection ниже) и не требует
  // фокуса на конкретном поле — фокусируем инпут только один раз при
  // монтировании, для удобства ручного ввода.
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const upsertRow = useCallback(
    (next: MassIncomingRow) => {
      setRows((prev) => {
        const index = prev.findIndex((row) => row.key === next.key);
        if (index === -1) return [next, ...prev];
        const copy = [...prev];
        copy[index] = { ...copy[index], quantity: copy[index].quantity + 1 };
        return copy;
      });
    },
    [],
  );

  const classify = useCallback(async (code: string): Promise<MassIncomingCheck> => {
    await ensureMode();
    const mode = modeRef.current;
    if (mode.server) {
      const checked = await checkServerBarcode(mode.warehouseId, code);
      if (checked) return checked;
      // Сервер не знает этот склад / endpoint — дальше работаем через /main/products/.
      modeRef.current = { ...mode, server: false };
    }
    return classifyBarcodeFallback(code);
  }, [ensureMode]);

  const processScan = useCallback(
    async (code: string) => {
      try {
        const checked = await classify(code);
        if (checked.ambiguous) {
          playScanUnknown();
          setError(t("ambiguousBarcodeClarify"));
          return;
        }
        upsertRow(mergeScannedRow(checked, code));
        if (checked.status === "UNKNOWN") playScanUnknown();
        else playScanSuccess();
      } catch (err) {
        playScanUnknown();
        setError(
          getBarcodeAmbiguity(err)
            ? t("ambiguousBarcode")
            : `${code}: ${validateResErrors(err, t("checkBarcodeFailed"))}`,
        );
      }
    },
    [classify, upsertRow],
  );

  const handleBarcode = useCallback(
    (raw: string) => {
      const code = String(raw || "").trim();
      setBarcode("");
      if (!code || saving || createFor) return;
      const now = Date.now();
      // Сканер в сфокусированном поле даёт и submit формы, и событие
      // useScanDetection — второй вызов с тем же кодом отбрасываем.
      if (lastScanRef.current.code === code && now - lastScanRef.current.at < DEBOUNCE_MS) {
        return;
      }
      lastScanRef.current = { code, at: now };
      setError("");
      setPending((n) => n + 1);
      queueRef.current = queueRef.current
        .then(() => processScan(code))
        .finally(() => setPending((n) => n - 1));
    },
    [processScan, saving, createFor],
  );

  useScanDetection({
    minLength: 3,
    onComplete: (code: any) => handleBarcode(String(code || "")),
  });

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      setRows((prev) =>
        prev.map((row) =>
          row.key === key
            ? { ...row, quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 0 }
            : row,
        ),
      );
    },
    [],
  );

  const setPrice = useCallback(
    (key: string, price: string) => {
      setRows((prev) => prev.map((row) => (row.key === key ? { ...row, price } : row)));
    },
    [],
  );

  const removeRow = useCallback(
    (key: string) => {
      setRows((prev) => prev.filter((row) => row.key !== key));
    },
    [],
  );

  const lists = useMemo(() => {
    const group = (status: MassIncomingStatus) => rows.filter((row) => row.status === status);
    return {
      inStock: group("IN_STOCK"),
      inCatalog: group("IN_CATALOG"),
      unknown: group("UNKNOWN"),
    };
  }, [rows]);

  const openCreate = useCallback((row: MassIncomingRow) => {
    setCreateFor(row);
    setCreateName("");
    setCreatePrice("");
    setCreateError("");
  }, []);

  const closeCreate = useCallback(() => {
    setCreateFor(null);
    setCreateError("");
    focusInput();
  }, [focusInput]);

  const submitCreate = useCallback(async () => {
    if (!createFor || creating) return;
    const name = createName.trim();
    const price = createPrice.trim();
    if (!name) {
      setCreateError(t("nameRequired"));
      return;
    }
    if (price && !hasPrice(price)) {
      setCreateError(t("priceInvalid"));
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const product = await createCompanyProduct({
        barcode: createFor.barcode,
        name,
        price: price || undefined,
        fromGlobal: false,
      });
      const id = String(product?.id || product?.uuid || "");
      if (!id) throw new Error(t("createCardFailed"));
      setRows((prev) =>
        replaceRow(prev, createFor.key, {
          ...createFor,
          key: rowKey("company", createFor.barcode, id),
          status: "IN_CATALOG",
          source: "company",
          name,
          productId: id,
          stockQty: 0,
          price,
          initialPrice: price,
        }),
      );
      setCreateFor(null);
      playScanSuccess();
      focusInput();
    } catch (err) {
      setCreateError(validateResErrors(err, t("createCardFailed")));
    } finally {
      setCreating(false);
    }
  }, [createFor, createName, createPrice, creating, focusInput]);

  const priceMissing = useCallback(
    (row: MassIncomingRow) => row.source === "global" && !hasPrice(row.price),
    [],
  );

  const save = useCallback(async () => {
    const isIncoming = (row: MassIncomingRow) =>
      row.status !== "UNKNOWN" && row.quantity > 0;

    const initial = rowsRef.current.filter(isIncoming);
    if (initial.length === 0) {
      setError(t("noItemsToPost"));
      return false;
    }
    if (initial.some(priceMissing)) {
      setShowPriceErrors(true);
      setError(t("priceRequiredForCatalog"));
      return false;
    }
    const badPrice = initial.find((row) => row.price.trim() && !hasPrice(row.price));
    if (badPrice) {
      setError(`${badPrice.name}: ${t("priceInvalid")}`);
      return false;
    }

    setSaving(true);
    setError("");
    // Рабочая копия: state обновляется асинхронно, а шаги ниже зависят
    // от результата предыдущих (id созданных карточек и т.п.).
    let work = initial;
    const applyReplace = (fromKey: string, next: MassIncomingRow) => {
      work = work.map((row) => (row.key === fromKey ? next : row));
      setRows((prev) => replaceRow(prev, fromKey, next));
    };
    try {
      await queueRef.current;
      await ensureMode();

      // 0. Единый батч-запрос: сервер создаёт недостающие карточки, меняет
      // цены и приходует всё одной транзакцией — вместо цепочки запросов
      // ниже. Пока бэкенд не поддержит §0, всегда падает на фолбэк 1-3b.
      if (batchSupportedRef.current) {
        try {
          const items = initial.map(buildBatchItem);
          await postMassIncomingBatch(items);
          const postedKeys = new Set(initial.map((row) => row.key));
          setRows((prev) => prev.filter((row) => !postedKeys.has(row.key)));
          return true;
        } catch (err) {
          if (!isMassIncomingEndpointMissing(err)) {
            setError(validateResErrors(err, t("postFailed")));
            return false;
          }
          batchSupportedRef.current = false;
        }
      }

      // 1. Карточки компании для товаров из глобальной базы NurCRM.
      for (const row of work.filter((r) => r.source === "global")) {
        try {
          const price = row.price.trim();
          const product = await createCompanyProduct({
            barcode: row.barcode,
            name: row.name,
            price,
            fromGlobal: true,
          });
          const id = String(product?.id || product?.uuid || "");
          if (!id) throw new Error(t("createCardFailed"));
          applyReplace(row.key, {
            ...row,
            key: rowKey("company", row.barcode, id),
            source: "company",
            productId: id,
            stockQty: 0,
            initialPrice: price,
          });
        } catch (err) {
          setError(`«${row.name}»: ${validateResErrors(err, t("createCardFailed"))}`);
          return false;
        }
      }

      // 2. Изменённые цены у существующих карточек.
      for (const row of work) {
        const price = row.price.trim();
        if (!row.productId || !price || price === row.initialPrice) continue;
        try {
          await updateProductPrice(row.productId, price);
          applyReplace(row.key, { ...row, initialPrice: price });
        } catch (err) {
          setError(`«${row.name}»: ${validateResErrors(err, t("priceUpdateFailed"))}`);
          return false;
        }
      }

      // Одна карточка могла попасть в список дважды (например, создана
      // из глобальной базы и отсканирована ещё раз) — схлопываем.
      const merged = new Map<string, MassIncomingRow>();
      for (const row of work) {
        if (!row.productId) continue;
        const prev = merged.get(row.key);
        merged.set(row.key, prev ? { ...prev, quantity: prev.quantity + row.quantity } : row);
      }
      const incoming = [...merged.values()];
      const postedKeys = new Set<string>();
      const dropPosted = () =>
        setRows((prev) => prev.filter((row) => !postedKeys.has(row.key)));

      // 3a. Атомарный приход, если сервер принял склад.
      const mode = modeRef.current;
      if (mode.server && mode.warehouseId) {
        try {
          await postMassIncoming(mode.warehouseId, incoming);
          incoming.forEach((row) => postedKeys.add(row.key));
          dropPosted();
          return true;
        } catch (err) {
          if (!isMassIncomingEndpointMissing(err)) {
            setError(validateResErrors(err, t("postFailed")));
            return false;
          }
          modeRef.current = { ...mode, server: false };
        }
      }

      // 3b. Склада нет — приход через карточки /main/products/.
      // Проведённые строки сразу убираем из списка, чтобы повторное
      // нажатие после ошибки не задвоило остаток.
      for (const [index, row] of incoming.entries()) {
        try {
          await postIncomingViaProduct(row);
          postedKeys.add(row.key);
        } catch (err) {
          dropPosted();
          setError(
            t("partialPosted", {
              done: index,
              total: incoming.length,
              name: row.name,
              reason: validateResErrors(err, t("postFailed")),
            }),
          );
          return false;
        }
      }
      dropPosted();
      return true;
    } finally {
      setSaving(false);
      focusInput();
    }
  }, [ensureMode, focusInput, priceMissing]);

  return {
    inputRef,
    barcode,
    setBarcode,
    busy,
    pending,
    saving,
    error,
    dirty,
    lists,
    handleBarcode,
    setQuantity,
    setPrice,
    priceMissing,
    showPriceErrors,
    removeRow,
    openCreate,
    closeCreate,
    createFor,
    createName,
    setCreateName,
    createPrice,
    setCreatePrice,
    createError,
    creating,
    submitCreate,
    save,
    focusInput,
  };
}
