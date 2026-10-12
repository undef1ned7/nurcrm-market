import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@shared/ui/Modal/Modal";
import {
  groupVariantsBySize,
  variantEffectivePrice,
  type ProductVariant,
} from "@entities/product";
import "./VariantPickerModal.scss";

export type VariantPick = {
  variant: ProductVariant;
  quantity: number;
  price: number;
};

type Props = {
  product: any;
  variants: ProductVariant[];
  onClose: () => void;
  onPick: (pick: VariantPick) => void | Promise<void>;
  /** Подпись кнопки подтверждения: «Добавить в чек» / «Добавить в обмен». */
  confirmLabel?: string;
};

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });

/**
 * Окно выбора размера и цвета при продаже (режим «Одежда»):
 * размеры по порядку с остатком, цвета выбранного размера (нулевой остаток —
 * серым), цена варианта (если ниже — зачёркнутая обычная), количество.
 */
export default function VariantPickerModal({
  product,
  variants,
  onClose,
  onPick,
  confirmLabel,
}: Props) {
  const { t } = useTranslation();
  const groups = useMemo(() => groupVariantsBySize(variants), [variants]);
  // Единственный размер выбираем сразу, иначе кассир выбирает сам.
  const [size, setSize] = useState<string | null>(() =>
    groups.length === 1 ? groups[0].size : null,
  );
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const colorsOfSize = useMemo(
    () => groups.find((g) => g.size === size)?.variants ?? [],
    [groups, size],
  );

  // Один вариант у размера — выбираем сразу (часто цвет не задан вовсе)
  useEffect(() => {
    if (colorsOfSize.length === 1 && colorsOfSize[0].quantity > 0) {
      setVariantId(colorsOfSize[0].id);
    } else {
      setVariantId(null);
    }
  }, [colorsOfSize]);

  const selected = colorsOfSize.find((v) => v.id === variantId) ?? null;
  const basePrice = Number(product?.price) || 0;
  const price = selected ? variantEffectivePrice(selected, basePrice) : basePrice;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    if (!selected) {
      setError(t("crm.sphere.picker.errors.chooseVariant"));
      return;
    }
    const n = Number(String(qty).replace(",", "."));
    if (!Number.isInteger(n) || n <= 0) {
      setError(t("crm.sphere.picker.errors.quantity"));
      return;
    }
    if (selected.quantity > 0 && n > selected.quantity) {
      setError(t("crm.sphere.picker.errors.stock", { max: selected.quantity }));
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      await onPick({ variant: selected, quantity: n, price });
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product?.name || t("crm.sphere.picker.title")}
      className="variant-picker"
      wrapperId="variant-picker-modal"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="variant-picker__label" id="variant-picker-sizes">
          {t("crm.sphere.picker.size")}
        </div>
        <div className="variant-picker__grid" role="radiogroup" aria-labelledby="variant-picker-sizes">
          {groups.map((g) => (
            <button
              key={g.size || "—"}
              type="button"
              role="radio"
              aria-checked={size === g.size}
              className={`variant-picker__size${size === g.size ? " is-active" : ""}${g.quantity <= 0 ? " is-empty" : ""}`}
              onClick={() => {
                setSize(g.size);
                setError("");
              }}
            >
              <span className="variant-picker__sizeName">{g.size || t("crm.sphere.picker.noSize")}</span>
              <span className="variant-picker__stock">
                {t("crm.sphere.picker.stock", { qty: g.quantity })}
              </span>
            </button>
          ))}
        </div>

        {size !== null && (
          <>
            <div className="variant-picker__label" id="variant-picker-colors">
              {t("crm.sphere.picker.color")}
            </div>
            <div className="variant-picker__grid" role="radiogroup" aria-labelledby="variant-picker-colors">
              {colorsOfSize.map((v) => {
                const empty = v.quantity <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={variantId === v.id}
                    disabled={empty}
                    className={`variant-picker__color${variantId === v.id ? " is-active" : ""}${empty ? " is-empty" : ""}`}
                    onClick={() => {
                      setVariantId(v.id);
                      setError("");
                    }}
                  >
                    <span>{v.color || t("crm.sphere.picker.noColor")}</span>
                    <span className="variant-picker__stock">
                      {t("crm.sphere.picker.stock", { qty: v.quantity })}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="variant-picker__footer">
          <div className="variant-picker__price" aria-live="polite">
            {selected && price < basePrice ? (
              <s className="variant-picker__oldPrice">{fmt(basePrice)} сом</s>
            ) : null}
            <strong>{fmt(price)} сом</strong>
          </div>
          <label className="variant-picker__qty">
            <span>{t("crm.sphere.picker.quantity")}</span>
            <input
              className="nur-input"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p className="variant-picker__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="variant-picker__actions">
          <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="nur-btn nur-btn--primary"
            disabled={submitting || !selected}
          >
            {confirmLabel || t("crm.sphere.picker.addToCart")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
