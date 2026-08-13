import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listWarehouses } from "@entities/warehouse";
import { getBarcodeAmbiguity } from "@shared/lib/tools/barcodeAmbiguity";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  checkWarehouseBarcode,
  createProductByBarcode,
  isMassIncomingEndpointMissing,
  postMassIncoming,
} from "../api/massIncomingApi";
import { mergeScannedRow } from "../lib/classifyBarcode";
import { playScanSuccess, playScanUnknown } from "../lib/scanSounds";
import type { MassIncomingRow, MassIncomingStatus } from "./types";

const DEBOUNCE_MS = 300;
const FOCUS_RESTORE_MS = 1000;

const listFrom = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results;
  }
  return [];
};

export function useMassIncoming() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastScanRef = useRef({ code: "", at: 0 });
  const [warehouseId, setWarehouseId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [rows, setRows] = useState<MassIncomingRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createFor, setCreateFor] = useState<MassIncomingRow | null>(null);
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");

  const dirty = rows.length > 0;

  useEffect(() => {
    let cancelled = false;
    listWarehouses({ page_size: 100 })
      .then((data) => {
        if (cancelled) return;
        const first = listFrom(data)[0];
        const id = first?.id ?? first?.uuid ?? first?.pk;
        if (id) setWarehouseId(String(id));
      })
      .catch(() => {
        /* склад опционален для fallback lookup */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    focusInput();
    const onBlur = () => {
      window.setTimeout(() => inputRef.current?.focus(), FOCUS_RESTORE_MS);
    };
    const el = inputRef.current;
    el?.addEventListener("blur", onBlur);
    return () => el?.removeEventListener("blur", onBlur);
  }, [focusInput]);

  const upsertRow = useCallback((next: MassIncomingRow) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.key === next.key);
      if (index === -1) return [next, ...prev];
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: copy[index].quantity + 1,
      };
      return copy;
    });
  }, []);

  const handleBarcode = useCallback(
    async (raw: string) => {
      const code = String(raw || "").trim();
      if (!code) return;
      const now = Date.now();
      if (
        lastScanRef.current.code === code &&
        now - lastScanRef.current.at < DEBOUNCE_MS
      ) {
        return;
      }
      lastScanRef.current = { code, at: now };
      setBusy(true);
      setError("");
      try {
        const checked = await checkWarehouseBarcode(warehouseId, code);
        if (checked.ambiguous) {
          playScanUnknown();
          setError("Найдено несколько товаров с этим штрихкодом. Уточните карточку.");
          return;
        }
        const row = mergeScannedRow(
          checked.status,
          checked.barcode || code,
          checked.product,
        );
        upsertRow(row);
        if (checked.status === "UNKNOWN") playScanUnknown();
        else playScanSuccess();
      } catch (err) {
        const ambiguity = getBarcodeAmbiguity(err);
        if (ambiguity) {
          playScanUnknown();
          setError("Найдено несколько товаров с этим штрихкодом.");
          return;
        }
        playScanUnknown();
        setError(validateResErrors(err, "Не удалось проверить штрихкод"));
      } finally {
        setBusy(false);
        setBarcode("");
        focusInput();
      }
    },
    [focusInput, upsertRow, warehouseId],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? { ...row, quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 0 }
          : row,
      ),
    );
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }, []);

  const lists = useMemo(() => {
    const group = (status: MassIncomingStatus) =>
      rows.filter((row) => row.status === status);
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
  }, []);

  const submitCreate = useCallback(async () => {
    if (!createFor) return;
    const name = createName.trim();
    if (!name) {
      setError("Укажите название товара");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const product = await createProductByBarcode({
        barcode: createFor.barcode,
        name,
        price: createPrice.trim() || undefined,
        warehouseId,
      });
      const id = String(product?.id || product?.uuid || "");
      setRows((prev) =>
        prev.map((row) =>
          row.key === createFor.key
            ? {
                ...row,
                key: id ? `IN_CATALOG:${id}` : row.key,
                status: "IN_CATALOG",
                name,
                productId: id || row.productId,
              }
            : row,
        ),
      );
      setCreateFor(null);
      playScanSuccess();
    } catch (err) {
      setError(validateResErrors(err, "Не удалось создать карточку"));
    } finally {
      setBusy(false);
      focusInput();
    }
  }, [createFor, createName, createPrice, focusInput, warehouseId]);

  const save = useCallback(async () => {
    const incoming = [...lists.inStock, ...lists.inCatalog].filter(
      (row) => row.productId && row.quantity > 0,
    );
    if (incoming.length === 0) {
      setError("Нет позиций для прихода");
      return false;
    }
    if (!warehouseId) {
      setError("Не найден склад компании. Дождитесь загрузки или обновите страницу.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await postMassIncoming(warehouseId, incoming);
      setRows((prev) => prev.filter((row) => row.status === "UNKNOWN"));
      return true;
    } catch (err) {
      if (isMassIncomingEndpointMissing(err)) {
        setError(
          "Сервер ещё не поддерживает атомарный массовый приход. Нужен endpoint POST /warehouse/{id}/mass-incoming/.",
        );
      } else {
        setError(validateResErrors(err, "Не удалось провести приход"));
      }
      return false;
    } finally {
      setSaving(false);
      focusInput();
    }
  }, [focusInput, lists.inCatalog, lists.inStock, warehouseId]);

  return {
    inputRef,
    barcode,
    setBarcode,
    busy,
    saving,
    error,
    dirty,
    lists,
    handleBarcode,
    setQuantity,
    removeRow,
    openCreate,
    createFor,
    setCreateFor,
    createName,
    setCreateName,
    createPrice,
    setCreatePrice,
    submitCreate,
    save,
    focusInput,
  };
}
