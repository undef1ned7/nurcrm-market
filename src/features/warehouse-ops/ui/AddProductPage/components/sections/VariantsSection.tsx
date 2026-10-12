import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer, Trash2, Wand2 } from "lucide-react";
import {
  createProductVariant,
  deleteProductVariant,
  fetchProductVariants,
  sortVariants,
  updateProductVariant,
  variantDiscountPercent,
  type ProductVariant,
} from "@entities/product";
import { useConfirm } from "@shared/hooks/useDialog";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import {
  buildVariantLabelsHtml,
  printHtmlDocument,
} from "../../utils/printVariantLabels";
import VariantsQuickFillModal from "./VariantsQuickFillModal";
import "./VariantsSection.scss";

type RowDraft = {
  size: string;
  color: string;
  barcode: string;
  quantity: string;
  price: string;
  is_active: boolean;
};

const toDraft = (v: ProductVariant): RowDraft => ({
  size: v.size,
  color: v.color,
  barcode: v.barcode,
  quantity: String(v.quantity),
  price: v.price == null ? "" : String(v.price),
  is_active: v.is_active,
});

/** Сколько строк рисовать сразу: тысячи вариантов = десятки тысяч полей ввода. */
const VARIANTS_PAGE = 200;

const parseNonNegative = (raw: string): number | null => {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Ошибка строки или "" — если строку можно сохранять. */
export const validateVariantDraft = (d: RowDraft, t: (k: string) => string): string => {
  if (!d.size.trim() && !d.color.trim()) return t("crm.sphere.variants.errors.sizeOrColor");
  if (parseNonNegative(d.quantity) === null) return t("crm.sphere.variants.errors.quantity");
  if (d.price.trim() !== "" && parseNonNegative(d.price) === null) {
    return t("crm.sphere.variants.errors.price");
  }
  if (d.barcode.length > 64) return t("crm.sphere.variants.errors.barcode");
  return "";
};

const draftToPayload = (d: RowDraft) => ({
  size: d.size.trim(),
  color: d.color.trim(),
  barcode: d.barcode.trim(),
  quantity: String(parseNonNegative(d.quantity) ?? 0),
  price: d.price.trim() === "" ? null : String(parseNonNegative(d.price)),
  is_active: d.is_active,
});

/**
 * «Размеры и цвета» — вкладка карточки товара в режиме «Одежда».
 * Работает с уже сохранённым товаром: у нового товара ещё нет id на сервере.
 */
export default function VariantsSection({
  productId,
  productName,
  productPrice,
}: {
  productId?: string | number | null;
  productName?: string;
  productPrice?: unknown;
}) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(VARIANTS_PAGE);
  const busyRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const list = await fetchProductVariants(productId);
      setVariants(sortVariants(list));
      setDrafts({});
      setRowErrors({});
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.variants.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [productId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredVariants = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter((v) =>
      `${v.size}, ${v.color} ${v.barcode}`.toLowerCase().includes(q),
    );
  }, [variants, filter]);

  const rows = useMemo(
    () =>
      filteredVariants
        .slice(0, limit)
        .map((v) => ({ variant: v, draft: drafts[v.id] ?? toDraft(v) })),
    [filteredVariants, limit, drafts],
  );
  const hiddenCount = Math.max(0, filteredVariants.length - rows.length);

  const isDirty = (v: ProductVariant, d: RowDraft) =>
    JSON.stringify(toDraft(v)) !== JSON.stringify(d);

  const setField = (id: string, field: keyof RowDraft, value: string | boolean) => {
    const base = variants.find((v) => v.id === id);
    if (!base) return;
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? toDraft(base)), [field]: value } }));
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const withRowLock = async (id: string, fn: () => Promise<void>) => {
    if (busyRef.current.has(id)) return;
    busyRef.current.add(id);
    setBusyRows((prev) => ({ ...prev, [id]: true }));
    try {
      await fn();
    } finally {
      busyRef.current.delete(id);
      setBusyRows((prev) => ({ ...prev, [id]: false }));
    }
  };

  const saveRow = (v: ProductVariant, d: RowDraft) =>
    withRowLock(v.id, async () => {
      const msg = validateVariantDraft(d, t);
      if (msg) {
        setRowErrors((prev) => ({ ...prev, [v.id]: msg }));
        return;
      }
      try {
        const payload = draftToPayload(d);
        const saved = await updateProductVariant(productId!, v.id, payload);
        // Пустой ответ сервера — применяем то, что отправили.
        const next: ProductVariant = saved ?? {
          ...v,
          ...payload,
          quantity: Number(payload.quantity),
          price: payload.price == null ? null : Number(payload.price),
        };
        setVariants((prev) => sortVariants(prev.map((x) => (x.id === v.id ? next : x))));
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[v.id];
          return next;
        });
      } catch (err: any) {
        setRowErrors((prev) => ({
          ...prev,
          [v.id]: validateResErrors(err, t("crm.sphere.variants.saveFailed")),
        }));
      }
    });

  const removeRow = async (v: ProductVariant) => {
    const ok = await new Promise<boolean>((resolve) =>
      confirm(
        t("crm.sphere.variants.deleteConfirm", {
          label: [v.size, v.color].filter(Boolean).join(", "),
        }),
        resolve,
      ),
    );
    if (!ok) return;
    await withRowLock(v.id, async () => {
      try {
        await deleteProductVariant(productId!, v.id);
        setVariants((prev) => prev.filter((x) => x.id !== v.id));
      } catch (err: any) {
        setRowErrors((prev) => ({
          ...prev,
          [v.id]: validateResErrors(err, t("crm.sphere.variants.deleteFailed")),
        }));
      }
    });
  };

  const handleQuickFillCreate = async (
    combos: { size: string; color: string }[],
    defaults: { quantity: string; price: string },
  ): Promise<{ created: number; failed: string[] }> => {
    const created: ProductVariant[] = [];
    const failed: string[] = [];
    // По одному: сервер может отказать в отдельном сочетании (дубль), остальные сохраняем.
    for (const combo of combos) {
      try {
        const v = await createProductVariant(productId!, {
          size: combo.size,
          color: combo.color,
          quantity: String(parseNonNegative(defaults.quantity) ?? 0),
          price: defaults.price.trim() === "" ? null : String(parseNonNegative(defaults.price)),
          is_active: true,
        });
        if (v) created.push(v);
      } catch (err: any) {
        failed.push(
          `${[combo.size, combo.color].filter(Boolean).join(", ")}: ${validateResErrors(err, t("crm.sphere.variants.saveFailed"))}`,
        );
      }
    }
    if (created.length) setVariants((prev) => sortVariants([...prev, ...created]));
    return { created: created.length, failed };
  };

  const handlePrint = () => {
    const { html, count } = buildVariantLabelsHtml({
      productName: productName || "",
      productPrice,
      variants: variants.filter((v) => v.is_active),
    });
    if (!count) {
      setError(t("crm.sphere.variants.printNothing"));
      return;
    }
    printHtmlDocument(html);
  };

  const totalStock = variants.reduce((s, v) => s + (v.is_active ? v.quantity : 0), 0);

  return (
      <section
        className="market-product-form__section variants-section"
        aria-labelledby="variants-section-title"
      >
        <div className="variants-section__head">
          <h3 id="variants-section-title" className="market-product-form__section-title">
            {t("crm.sphere.variants.title")}
          </h3>
          {productId ? (
            <div className="variants-section__actions">
              <button
                type="button"
                className="nur-btn nur-btn--secondary nur-btn--sm"
                onClick={() => setQuickFillOpen(true)}
                disabled={loading}
              >
                <Wand2 size={16} aria-hidden="true" />
                {t("crm.sphere.variants.quickFill")}
              </button>
              <button
                type="button"
                className="nur-btn nur-btn--secondary nur-btn--sm"
                onClick={handlePrint}
                disabled={loading || variants.length === 0}
              >
                <Printer size={16} aria-hidden="true" />
                {t("crm.sphere.variants.printLabels")}
              </button>
            </div>
          ) : null}
        </div>

        {!productId ? (
          <p className="market-product-form__hint">{t("crm.sphere.variants.saveFirst")}</p>
        ) : (
          <>
            {error ? (
              <p className="variants-section__error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? (
              <p className="market-product-form__hint">{t("crm.sphere.variants.loading")}</p>
            ) : variants.length === 0 ? (
              <p className="market-product-form__hint">{t("crm.sphere.variants.empty")}</p>
            ) : (
              <>
              {variants.length > 20 ? (
                <label className="variants-section__filter">
                  <span>{t("crm.sphere.variants.filter")}</span>
                  <input
                    className="market-product-form__input"
                    value={filter}
                    maxLength={100}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setLimit(VARIANTS_PAGE);
                    }}
                  />
                </label>
              ) : null}
              <div className="nur-table-wrap">
                <table className="nur-table nur-table--dense variants-section__table">
                  <thead>
                    <tr>
                      <th>{t("crm.sphere.variants.colSize")}</th>
                      <th>{t("crm.sphere.variants.colColor")}</th>
                      <th>{t("crm.sphere.variants.colBarcode")}</th>
                      <th>{t("crm.sphere.variants.colStock")}</th>
                      <th>{t("crm.sphere.variants.colPrice")}</th>
                      <th>{t("crm.sphere.variants.colActive")}</th>
                      <th>
                        <span className="nur-sr-only">{t("common.actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ variant: v, draft: d }) => {
                      const label = [v.size, v.color].filter(Boolean).join(", ");
                      const discount = variantDiscountPercent(
                        { price: parseNonNegative(d.price) },
                        productPrice,
                      );
                      const dirty = isDirty(v, d);
                      const busy = Boolean(busyRows[v.id]);
                      return (
                        <tr key={v.id} aria-label={label}>
                          <td>
                            <input
                              className="market-product-form__input"
                              aria-label={t("crm.sphere.variants.colSize")}
                              value={d.size}
                              maxLength={50}
                              onChange={(e) => setField(v.id, "size", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="market-product-form__input"
                              aria-label={t("crm.sphere.variants.colColor")}
                              value={d.color}
                              maxLength={50}
                              onChange={(e) => setField(v.id, "color", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="market-product-form__input"
                              aria-label={t("crm.sphere.variants.colBarcode")}
                              value={d.barcode}
                              maxLength={64}
                              onChange={(e) => setField(v.id, "barcode", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="market-product-form__input variants-section__num"
                              aria-label={t("crm.sphere.variants.colStock")}
                              inputMode="decimal"
                              value={d.quantity}
                              onChange={(e) => setField(v.id, "quantity", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="market-product-form__input variants-section__num"
                              aria-label={t("crm.sphere.variants.colPrice")}
                              inputMode="decimal"
                              placeholder={String(productPrice ?? "")}
                              value={d.price}
                              onChange={(e) => setField(v.id, "price", e.target.value)}
                            />
                            {discount > 0 ? (
                              <span className="variants-section__discount">
                                {t("crm.sphere.variants.discount", { percent: discount })}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={t("crm.sphere.variants.colActive")}
                              checked={d.is_active}
                              onChange={(e) => setField(v.id, "is_active", e.target.checked)}
                            />
                          </td>
                          <td className="variants-section__rowActions">
                            {dirty ? (
                              <button
                                type="button"
                                className="nur-btn nur-btn--primary nur-btn--sm"
                                onClick={() => saveRow(v, d)}
                                disabled={busy}
                              >
                                {t("common.save")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="nur-btn nur-btn--ghost nur-btn--sm"
                              onClick={() => removeRow(v)}
                              disabled={busy}
                              aria-label={t("crm.sphere.variants.delete", { label })}
                              title={t("crm.sphere.variants.delete", { label })}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                            {rowErrors[v.id] ? (
                              <div className="variants-section__error" role="alert">
                                {rowErrors[v.id]}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7}>
                        {t("crm.sphere.variants.summary", {
                          count: variants.length,
                          stock: totalStock,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm variants-section__more"
                  onClick={() => setLimit((n) => n + VARIANTS_PAGE)}
                >
                  {t("crm.sphere.variants.showMore", {
                    count: Math.min(VARIANTS_PAGE, hiddenCount),
                    left: hiddenCount,
                  })}
                </button>
              ) : null}
              </>
            )}
          </>
        )}

        {quickFillOpen && productId ? (
          <VariantsQuickFillModal
            existing={variants}
            productPrice={productPrice}
            onClose={() => setQuickFillOpen(false)}
            onCreate={handleQuickFillCreate}
          />
        ) : null}
      </section>
  );
}
