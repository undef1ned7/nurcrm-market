import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@shared/ui/Modal/Modal";
import {
  SIZE_PRESETS,
  buildVariantCombos,
  compareSizes,
  parseListInput,
  type ProductVariant,
  type SizePresetId,
} from "@entities/product";

const COMMON_COLORS = ["Чёрный", "Белый", "Серый", "Красный", "Синий", "Бежевый"];

type Props = {
  existing: ProductVariant[];
  productPrice?: unknown;
  onClose: () => void;
  onCreate: (
    combos: { size: string; color: string }[],
    defaults: { quantity: string; price: string },
  ) => Promise<{ created: number; failed: string[] }>;
};

/**
 * «Быстро заполнить»: выбрать размеры (готовые наборы или свои) и цвета →
 * все сочетания строками; лишние снять галочкой до сохранения.
 */
export default function VariantsQuickFillModal({
  existing,
  productPrice,
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const [sizes, setSizes] = useState<string[]>([]);
  const [customSizes, setCustomSizes] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [price, setPrice] = useState("");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: string[] } | null>(null);
  const [formError, setFormError] = useState("");
  const inFlightRef = useRef(false);

  const allSizes = useMemo(() => {
    const merged = [...sizes];
    for (const s of parseListInput(customSizes)) {
      if (!merged.some((x) => x.toLowerCase() === s.toLowerCase())) merged.push(s);
    }
    return merged.sort(compareSizes);
  }, [sizes, customSizes]);

  const allColors = useMemo(() => {
    const merged = [...colors];
    for (const c of parseListInput(customColors)) {
      if (!merged.some((x) => x.toLowerCase() === c.toLowerCase())) merged.push(c);
    }
    return merged;
  }, [colors, customColors]);

  const combos = useMemo(
    () =>
      buildVariantCombos(allSizes, allColors, existing).map((c) => ({
        ...c,
        selected: !c.exists && !unchecked.has(c.key),
      })),
    [allSizes, allColors, existing, unchecked],
  );
  const selected = combos.filter((c) => c.selected);

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const applyPreset = (id: SizePresetId) => {
    const preset = SIZE_PRESETS[id] as readonly string[];
    const allOn = preset.every((s) => sizes.includes(s));
    setSizes((prev) =>
      allOn ? prev.filter((s) => !preset.includes(s)) : [...new Set([...prev, ...preset])],
    );
  };

  const presetSizes = useMemo(
    () => [...new Set(Object.values(SIZE_PRESETS).flat())].sort(compareSizes),
    [],
  );

  const toggleCombo = (key: string) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const validate = (): string => {
    if (selected.length === 0) return t("crm.sphere.variants.quick.errors.nothing");
    if (!/^\d+([.,]\d+)?$/.test(quantity.trim())) return t("crm.sphere.variants.errors.quantity");
    if (price.trim() !== "" && !/^\d+([.,]\d+)?$/.test(price.trim())) {
      return t("crm.sphere.variants.errors.price");
    }
    return "";
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    const msg = validate();
    if (msg) {
      setFormError(msg);
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      const res = await onCreate(
        selected.map((c) => ({ size: c.size, color: c.color })),
        { quantity: quantity.trim().replace(",", "."), price: price.trim().replace(",", ".") },
      );
      setResult(res);
      if (!res.failed.length) onClose();
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.variants.quick.title")}
      className="variants-quick"
      contentClassName="variants-quick__content"
      wrapperId="variants-quick-modal"
    >
      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="variants-quick__group">
          <legend className="nur-label">{t("crm.sphere.variants.quick.sizes")}</legend>
          <div className="variants-quick__chips">
            {(Object.keys(SIZE_PRESETS) as SizePresetId[]).map((id) => (
              <button
                key={id}
                type="button"
                className="nur-btn nur-btn--secondary nur-btn--sm"
                onClick={() => applyPreset(id)}
              >
                {t(`crm.sphere.variants.quick.preset.${id}`)}
              </button>
            ))}
          </div>
          <div className="variants-quick__chips" role="group" aria-label={t("crm.sphere.variants.quick.sizes")}>
            {presetSizes.map((s) => (
              <label key={s} className={`variants-quick__chip${sizes.includes(s) ? " is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={sizes.includes(s)}
                  onChange={() => setSizes((prev) => toggleIn(prev, s))}
                />
                {s}
              </label>
            ))}
          </div>
          <label className="variants-quick__field">
            <span>{t("crm.sphere.variants.quick.customSizes")}</span>
            <input
              className="market-product-form__input"
              value={customSizes}
              maxLength={500}
              placeholder="62, 64, One size"
              onChange={(e) => setCustomSizes(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset className="variants-quick__group">
          <legend className="nur-label">{t("crm.sphere.variants.quick.colors")}</legend>
          <div className="variants-quick__chips" role="group" aria-label={t("crm.sphere.variants.quick.colors")}>
            {COMMON_COLORS.map((c) => (
              <label key={c} className={`variants-quick__chip${colors.includes(c) ? " is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={colors.includes(c)}
                  onChange={() => setColors((prev) => toggleIn(prev, c))}
                />
                {c}
              </label>
            ))}
          </div>
          <label className="variants-quick__field">
            <span>{t("crm.sphere.variants.quick.customColors")}</span>
            <input
              className="market-product-form__input"
              value={customColors}
              maxLength={500}
              placeholder="Хаки, Пудровый"
              onChange={(e) => setCustomColors(e.target.value)}
            />
          </label>
        </fieldset>

        <div className="variants-quick__defaults">
          <label className="variants-quick__field">
            <span>{t("crm.sphere.variants.quick.quantity")}</span>
            <input
              className="market-product-form__input"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="variants-quick__field">
            <span>{t("crm.sphere.variants.quick.price")}</span>
            <input
              className="market-product-form__input"
              inputMode="decimal"
              value={price}
              placeholder={String(productPrice ?? "")}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>

        {combos.length > 0 ? (
          <div className="variants-quick__preview">
            <div className="nur-label">
              {t("crm.sphere.variants.quick.preview", {
                selected: selected.length,
                total: combos.length,
              })}
            </div>
            <ul className="variants-quick__list">
              {combos.map((c) => {
                const label = [c.size, c.color].filter(Boolean).join(", ");
                return (
                  <li key={c.key}>
                    <label className={c.exists ? "is-exists" : ""}>
                      <input
                        type="checkbox"
                        checked={c.selected}
                        disabled={c.exists}
                        onChange={() => toggleCombo(c.key)}
                      />
                      {label}
                      {c.exists ? ` — ${t("crm.sphere.variants.quick.exists")}` : ""}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {formError ? (
          <p className="variants-section__error" role="alert">
            {formError}
          </p>
        ) : null}
        {result?.failed.length ? (
          <div className="variants-section__error" role="alert">
            <p>
              {t("crm.sphere.variants.quick.partial", {
                created: result.created,
                failed: result.failed.length,
              })}
            </p>
            <ul>
              {result.failed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="variants-quick__footer">
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="nur-btn nur-btn--primary"
            disabled={saving || selected.length === 0}
          >
            {saving
              ? t("settings.saving")
              : t("crm.sphere.variants.quick.create", { count: selected.length })}
          </button>
        </div>
      </form>
    </Modal>
  );
}
