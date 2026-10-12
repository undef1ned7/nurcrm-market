import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import {
  MARKET_SPHERES,
  canEditMarketSphere,
  updateMarketSphere,
  useMarketSphere,
  type MarketSphere,
} from "@entities/user";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";

/**
 * Settings tab: Вид магазина (Продукты / Одежда и похожие / Услуги).
 * Смена вида меняет только набор экранов и кнопок, данные остаются.
 */
export function MarketSphereTab({ profile, showAlert }: any) {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { sphere } = useMarketSphere();
  const canEdit = canEditMarketSphere(profile);
  const [value, setValue] = useState<MarketSphere>(sphere);
  const [saving, setSaving] = useState(false);
  // Синхронный флаг: state saving виден только после рендера, а тройной клик
  // успевает вызвать submit несколько раз.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!inFlightRef.current) setValue(sphere);
  }, [sphere]);

  const changed = value !== sphere;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!canEdit || !changed || inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    try {
      await dispatch(updateMarketSphere(value)).unwrap();
      showAlert?.("success", t("settings.marketSphere.saved"));
    } catch (err: any) {
      setValue(sphere);
      showAlert?.(
        "error",
        validateResErrors(err, t("settings.marketSphere.saveFailed")),
      );
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="settings__tab-form">
      <div className="settings__section">
        <h2 className="settings__section-title">
          {t("settings.marketSphere.title")}
        </h2>
        <p className="settings__mutedText">{t("settings.marketSphere.hint")}</p>

        <fieldset
          className="settings-sphere"
          disabled={!canEdit || saving}
          aria-describedby={!canEdit ? "market-sphere-readonly" : undefined}
        >
          <legend className="nur-label">{t("settings.marketSphere.legend")}</legend>
          {MARKET_SPHERES.map((option) => (
            <label
              key={option}
              className={`settings-sphere__option${value === option ? " settings-sphere__option--active" : ""}`}
            >
              <input
                type="radio"
                name="market_sphere"
                value={option}
                checked={value === option}
                onChange={() => setValue(option)}
              />
              <span className="settings-sphere__body">
                <span className="settings-sphere__title">
                  {t(`settings.marketSphere.options.${option}.title`)}
                </span>
                <span className="settings-sphere__text">
                  {t(`settings.marketSphere.options.${option}.text`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {!canEdit && (
          <p id="market-sphere-readonly" className="settings__mutedText" role="note">
            {t("settings.marketSphere.readOnly")}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="settings__actions">
          <button
            className="nur-btn nur-btn--primary"
            type="submit"
            disabled={saving || !changed}
          >
            {saving ? t("settings.saving") : t("settings.saveChanges")}
          </button>
          <button
            className="nur-btn nur-btn--secondary"
            type="button"
            onClick={() => setValue(sphere)}
            disabled={saving || !changed}
          >
            {t("settings.cancel")}
          </button>
        </div>
      )}
    </form>
  );
}
