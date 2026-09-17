import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { fetchProductsApi } from "@entities/product";
import {
  loadQuickSlots,
  saveQuickSlots,
} from "../model/storage";
import { QUICK_SLOT_DIGITS, type QuickSlotDigit, type QuickSlotsMap } from "../model/types";
import "./QuickSlotsModal.scss";

type ProductOption = {
  id: string;
  name: string;
};

const listFrom = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results;
  }
  return [];
};

export function QuickSlotsModal({
  companyId,
  onClose,
  onChange,
}: {
  companyId?: string | number | null;
  onClose: () => void;
  onChange?: (slots: QuickSlotsMap) => void;
}) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<QuickSlotsMap>(() => loadQuickSlots(companyId));
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [activeDigit, setActiveDigit] = useState<QuickSlotDigit>("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = Object.values(slots).filter(Boolean);
    if (ids.length === 0) return undefined;

    const loadNames = async () => {
      try {
        const data = await fetchProductsApi({ page_size: 200 });
        const list = Array.isArray(data) ? data : data?.results || [];
        if (cancelled) return;
        const next: Record<string, string> = {};
        list.forEach((product: any) => {
          const id = String(product?.id || "");
          if (ids.includes(id))
            next[id] = String(product?.name || t("crm.sell.product"));
        });
        setNames((prev) => ({ ...prev, ...next }));
      } catch {
        /* names are optional */
      }
    };

    loadNames();
    return () => {
      cancelled = true;
    };
  }, [slots]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchProductsApi({ search: q, page_size: 20 });
        const list = listFrom(data);
        if (cancelled) return;
        setResults(
          list
            .map((product: any) => ({
              id: String(product?.id || ""),
              name: String(product?.name || t("crm.sell.product")),
            }))
            .filter((item) => item.id),
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const persist = (next: QuickSlotsMap) => {
    setSlots(next);
    saveQuickSlots(next, companyId);
    onChange?.(next);
  };

  const assign = (digit: QuickSlotDigit, product: ProductOption) => {
    persist({ ...slots, [digit]: product.id });
    setNames((prev) => ({ ...prev, [product.id]: product.name }));
    setQuery("");
    setResults([]);
  };

  const clearSlot = (digit: QuickSlotDigit) => {
    const next = { ...slots };
    delete next[digit];
    persist(next);
  };

  const hint = useMemo(
    () => `F3 + ${activeDigit}`,
    [activeDigit],
  );

  return (
    <div className="quick-slots-modal-overlay" onClick={onClose}>
      <div
        className="quick-slots-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-slots-title"
      >
        <div className="quick-slots-modal__header">
          <div>
            <h2 id="quick-slots-title">
              {t("crm.cashier.quickSlotsModal.title")}
            </h2>
            <p>{t("crm.cashier.quickSlotsModal.hint")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <div className="quick-slots-modal__grid">
          {QUICK_SLOT_DIGITS.map((digit) => {
            const productId = slots[digit];
            return (
              <button
                key={digit}
                type="button"
                className={`quick-slots-modal__slot ${
                  activeDigit === digit ? "is-active" : ""
                }`}
                onClick={() => setActiveDigit(digit)}
              >
                <span className="quick-slots-modal__key">F3 + {digit}</span>
                <strong>
                  {productId
                    ? names[productId] || t("crm.sell.product")
                    : t("crm.cashier.quickSlotsModal.empty")}
                </strong>
                {productId ? (
                  <span
                    className="quick-slots-modal__clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSlot(digit);
                    }}
                  >
                    {t("crm.cashier.quickSlotsModal.clear")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="quick-slots-modal__search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("crm.cashier.quickSlotsModal.searchPlaceholder", {
              hint,
            })}
          />
        </label>
        {loading ? (
          <p className="quick-slots-modal__hint">
            {t("crm.cashier.quickSlotsModal.searching")}
          </p>
        ) : null}
        <ul className="quick-slots-modal__results">
          {results.map((product) => (
            <li key={product.id}>
              <button type="button" onClick={() => assign(activeDigit, product)}>
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
