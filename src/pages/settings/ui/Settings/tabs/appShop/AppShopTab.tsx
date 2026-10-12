import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  buildAppShopPatch,
  fetchAppShopSettings,
  geocodeAddress,
  isPaymentRequired,
  parseAppShopSettings,
  parseFieldErrors,
  updateAppShopSettings,
  type AppShopState,
  type FieldErrors,
  type ShopEntity,
  type ShopFieldId,
  type ShopForm,
  type VisibilityReason,
} from "@shared/api/appShopSettings";
import { ShopLocationMap } from "./ShopLocationMap";
import "./AppShopTab.scss";

type LoadState = "loading" | "ready" | "error" | "payment";
type SaveError = { kind: "network" | "server"; message: string } | null;

const formsFrom = (s: AppShopState): Record<string, ShopForm> => {
  const out: Record<string, ShopForm> = { company: { ...s.company.form } };
  s.branches.forEach((b) => (out[b.key] = { ...b.form }));
  return out;
};

const coord = (s: string) => {
  const n = Number(String(s).trim().replace(",", "."));
  return String(s).trim() && Number.isFinite(n) ? n : null;
};

const percentInvalid = (f: ShopForm) => {
  if (!f.pointsPercent.trim()) return false;
  const n = coord(f.pointsPercent);
  return n === null || n < 0 || n > 100;
};

const coordsInvalid = (f: ShopForm) => {
  const lat = coord(f.lat);
  const lng = coord(f.lng);
  if (!f.lat.trim() && !f.lng.trim()) return false;
  return lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180;
};

/** Settings tab: Магазин в приложении (приложение покупателей NurCRM) */
export function AppShopTab({ companyName }: { companyName: string }) {
  const { t } = useTranslation();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<AppShopState | null>(null);
  const [forms, setForms] = useState<Record<string, ShopForm>>({});
  const [selected, setSelected] = useState("company");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveError>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [geoState, setGeoState] = useState<"" | "busy" | "notFound" | "error">("");

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const raw = await fetchAppShopSettings();
      const parsed = parseAppShopSettings(raw, companyName || t("settings.appShop.mainShop"));
      setData(parsed);
      setForms(formsFrom(parsed));
      setLoadState("ready");
    } catch (err: any) {
      console.error(err);
      setLoadState(isPaymentRequired(err) ? "payment" : "error");
    }
  }, [companyName, t]);

  useEffect(() => {
    load();
  }, [load]);

  const entities: ShopEntity[] = useMemo(
    () => (data ? [data.company, ...data.branches] : []),
    [data],
  );
  const entity = entities.find((e) => e.key === selected) || data?.company || null;
  const form = entity ? forms[entity.key] : null;
  const errors = (entity && fieldErrors[entity.key]) || {};

  const patch = useMemo(() => (data ? buildAppShopPatch(data, forms) : null), [data, forms]);
  const invalid = useMemo(
    () => Object.values(forms).some((f) => percentInvalid(f) || coordsInvalid(f)),
    [forms],
  );
  const canSave = !!patch && !invalid && !saving;

  const update = (key: string, p: Partial<ShopForm>) => {
    setSaved(false);
    setForms((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!data || !patch || invalid) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await updateAppShopSettings(patch);
      let next: AppShopState;
      try {
        next = parseAppShopSettings(res, companyName || t("settings.appShop.mainShop"));
      } catch {
        next = parseAppShopSettings(await fetchAppShopSettings(), companyName || t("settings.appShop.mainShop"));
      }
      setData(next);
      setForms(formsFrom(next));
      setFieldErrors({});
      setSaved(true);
    } catch (err: any) {
      console.error(err);
      if (isPaymentRequired(err)) {
        setLoadState("payment");
      } else if (!err?.response) {
        // Нет связи — форма остаётся как есть, можно повторить.
        setSaveError({ kind: "network", message: t("settings.appShop.saveNetworkError") });
      } else {
        const fe = parseFieldErrors(data, err.response.data);
        setFieldErrors(fe);
        const general =
          fe.company?._ ||
          (typeof err.response.data?.detail === "string" ? err.response.data.detail : "") ||
          t("settings.appShop.saveError");
        setSaveError({ kind: "server", message: general });
      }
    } finally {
      setSaving(false);
    }
  };

  const findOnMap = async () => {
    if (!entity || !form?.address.trim()) return;
    setGeoState("busy");
    try {
      const hit = await geocodeAddress(form.address);
      if (!hit) {
        setGeoState("notFound");
        return;
      }
      update(entity.key, { lat: String(hit.lat), lng: String(hit.lng) });
      setGeoState("");
    } catch (err) {
      console.error(err);
      setGeoState("error");
    }
  };

  const statusText = (en: ShopEntity) => {
    const map: Record<VisibilityReason, string> = {
      visible: t("settings.appShop.status.visible"),
      disabled: t("settings.appShop.status.disabled"),
      no_address: t("settings.appShop.status.noAddress"),
      no_coordinates: t("settings.appShop.status.noCoordinates"),
      hidden_by_admin: t("settings.appShop.status.hiddenByAdmin"),
      payment_required: t("settings.appShop.status.paymentRequired"),
      unknown: t("settings.appShop.status.unknown"),
    };
    return map[en.reason];
  };

  const fieldError = (f: ShopFieldId) =>
    errors[f] ? <div className="settings__fieldError">{errors[f]}</div> : null;

  /* ---------- состояния без формы ---------- */

  const header = (
    <>
      <h2 className="settings__section-title">
        <span className="settings__emoji">📱</span> {t("settings.appShop.title")}
      </h2>
      <p className="settings__mutedText">{t("settings.appShop.intro")}</p>
    </>
  );

  if (loadState === "payment") {
    return (
      <div className="settings__tab-content">
        <div className="settings__section">
          {header}
          <div className="settings__warnBox appshop__payment">
            <strong>{t("settings.appShop.paymentTitle")}</strong>
            <span>{t("settings.appShop.status.paymentRequired")}</span>
            <Link className="nur-btn nur-btn--primary nur-btn--sm" to="/crm/additional-services">
              {t("settings.appShop.paymentLink")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadState !== "ready" || !data || !entity || !form) {
    return (
      <div className="settings__tab-content">
        <div className="settings__section">
          {header}
          {loadState === "error" ? (
            <div className="settings__warnBox appshop__loadError">
              <span>{t("settings.appShop.loadError")}</span>
              <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={load}>
                {t("settings.appShop.retry")}
              </button>
            </div>
          ) : (
            <p className="settings__mutedText">{t("common.loading")}</p>
          )}
        </div>
      </div>
    );
  }

  const keys = entity.keys;
  const latNum = coord(form.lat);
  const lngNum = coord(form.lng);
  const preview = entity.preview;
  const previewPercent =
    preview?.pointsPercent ?? (form.pointsEnabled ? coord(form.pointsPercent) : null);
  const statusStale = !!patch;

  return (
    <form className="settings__tab-form appshop" onSubmit={save} noValidate>
      <div className="settings__section">
        {header}

        {/* Филиалы */}
        {data.branches.length > 0 && (
          <div className="appshop__shops" role="tablist" aria-label={t("settings.appShop.shopsList")}>
            {entities.map((en) => {
              const f = forms[en.key];
              return (
                <div
                  key={en.key}
                  role="tab"
                  aria-selected={en.key === entity.key}
                  tabIndex={0}
                  className={`appshop__shop ${en.key === entity.key ? "appshop__shop--active" : ""}`}
                  onClick={() => setSelected(en.key)}
                  onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSelected(en.key)}
                >
                  <div className="appshop__shopText">
                    <span className="appshop__shopName">
                      {en.key === "company" ? `${en.title} · ${t("settings.appShop.mainShop")}` : en.title}
                    </span>
                    <span className={`appshop__status appshop__status--${en.visible ? "ok" : "off"}`}>
                      {statusText(en)}
                    </span>
                  </div>
                  {en.keys.enabled && (
                    <label className="settings__switch" onClick={(ev) => ev.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="settings__switch-input"
                        checked={!!f?.enabled}
                        onChange={(ev) => update(en.key, { enabled: ev.target.checked })}
                        aria-label={t("settings.appShop.showInApp")}
                      />
                      <span className="settings__switch-track" aria-hidden="true">
                        <span className="settings__switch-thumb" />
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Переключатель и статус */}
        {keys.enabled && (
          <div className="settings__prefRow">
            <div className="settings__prefText">
              <span className="settings__prefLabel">{t("settings.appShop.showInApp")}</span>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                className="settings__switch-input"
                checked={form.enabled}
                onChange={(ev) => update(entity.key, { enabled: ev.target.checked })}
              />
              <span className="settings__switch-track" aria-hidden="true">
                <span className="settings__switch-thumb" />
              </span>
            </label>
          </div>
        )}
        {fieldError("enabled")}

        <div className={`appshop__statusBox appshop__statusBox--${entity.visible ? "ok" : "off"}`} role="status">
          <span className="appshop__statusDot" aria-hidden="true" />
          <div>
            <div>{statusText(entity)}</div>
            {entity.reason === "hidden_by_admin" && entity.adminReason && (
              <div className="appshop__statusSub">{entity.adminReason}</div>
            )}
            {statusStale && <div className="appshop__statusSub">{t("settings.appShop.statusAfterSave")}</div>}
          </div>
        </div>
      </div>

      {/* Данные магазина */}
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">🏪</span> {t("settings.appShop.dataTitle")}
        </h2>

        {keys.name && (
          <div className="settings__form-group">
            <label className="nur-label" htmlFor="appshop-name">{t("settings.appShop.name")}</label>
            <input
              id="appshop-name"
              className="nur-input"
              value={form.name}
              placeholder={entity.title}
              onChange={(ev) => update(entity.key, { name: ev.target.value })}
            />
            <div className="settings__fieldHint">{t("settings.appShop.nameHint")}</div>
            {fieldError("name")}
          </div>
        )}

        {keys.address && (
          <div className="settings__form-group">
            <label className="nur-label" htmlFor="appshop-address">
              {t("settings.appShop.address")}
              {form.enabled && <span className="nur-required"> *</span>}
            </label>
            <input
              id="appshop-address"
              className="nur-input"
              value={form.address}
              onChange={(ev) => {
                setGeoState("");
                update(entity.key, { address: ev.target.value });
              }}
            />
            {form.enabled && !form.address.trim() && !errors.address && (
              <div className="settings__fieldHint">{t("settings.appShop.status.noAddress")}</div>
            )}
            {fieldError("address")}
          </div>
        )}

        {keys.phone && (
          <div className="settings__form-group">
            <label className="nur-label" htmlFor="appshop-phone">{t("settings.appShop.phone")}</label>
            <input
              id="appshop-phone"
              className="nur-input"
              inputMode="tel"
              value={form.phone}
              placeholder="+996"
              onChange={(ev) => update(entity.key, { phone: ev.target.value })}
            />
            {fieldError("phone")}
          </div>
        )}

        {keys.schedule && (
          <div className="settings__form-group">
            <label className="nur-label" htmlFor="appshop-schedule">{t("settings.appShop.schedule")}</label>
            <input
              id="appshop-schedule"
              className="nur-input"
              value={form.schedule}
              placeholder={t("settings.appShop.schedulePlaceholder")}
              onChange={(ev) => update(entity.key, { schedule: ev.target.value })}
            />
            {fieldError("schedule")}
          </div>
        )}
      </div>

      {/* Место на карте */}
      {keys.lat && keys.lng && (
        <div className="settings__section">
          <h2 className="settings__section-title">
            <span className="settings__emoji">📍</span> {t("settings.appShop.mapTitle")}
          </h2>
          <p className="settings__mutedText">{t("settings.appShop.mapHint")}</p>

          <ShopLocationMap
            key={entity.key}
            lat={latNum}
            lng={lngNum}
            onChange={(la, ln) => update(entity.key, { lat: String(la), lng: String(ln) })}
          />

          <div className="appshop__coords">
            <button
              type="button"
              className="nur-btn nur-btn--secondary nur-btn--sm"
              onClick={findOnMap}
              disabled={!form.address.trim() || geoState === "busy"}
            >
              {geoState === "busy" ? t("common.loading") : t("settings.appShop.findByAddress")}
            </button>
            <label className="appshop__coord">
              <span>{t("settings.appShop.lat")}</span>
              <input
                className="nur-input"
                inputMode="decimal"
                value={form.lat}
                onChange={(ev) => update(entity.key, { lat: ev.target.value })}
              />
            </label>
            <label className="appshop__coord">
              <span>{t("settings.appShop.lng")}</span>
              <input
                className="nur-input"
                inputMode="decimal"
                value={form.lng}
                onChange={(ev) => update(entity.key, { lng: ev.target.value })}
              />
            </label>
          </div>
          {geoState === "notFound" && <div className="settings__fieldError">{t("settings.appShop.status.noCoordinates")}</div>}
          {geoState === "error" && <div className="settings__fieldError">{t("settings.appShop.geocodeError")}</div>}
          {coordsInvalid(form) && <div className="settings__fieldError">{t("settings.appShop.coordsInvalid")}</div>}
          {fieldError("lat") || fieldError("lng")}
        </div>
      )}

      {/* Баллы */}
      {(keys.pointsEnabled || keys.pointsPercent) && (
        <div className="settings__section">
          <h2 className="settings__section-title">
            <span className="settings__emoji">⭐</span> {t("settings.appShop.pointsTitle")}
          </h2>
          {keys.pointsEnabled && (
            <div className="settings__prefRow">
              <div className="settings__prefText">
                <span className="settings__prefLabel">{t("settings.appShop.pointsEnable")}</span>
              </div>
              <label className="settings__switch">
                <input
                  type="checkbox"
                  className="settings__switch-input"
                  checked={form.pointsEnabled}
                  onChange={(ev) => update(entity.key, { pointsEnabled: ev.target.checked })}
                />
                <span className="settings__switch-track" aria-hidden="true">
                  <span className="settings__switch-thumb" />
                </span>
              </label>
            </div>
          )}
          {fieldError("pointsEnabled")}
          {keys.pointsPercent && (!keys.pointsEnabled || form.pointsEnabled) && (
            <div className="settings__form-group">
              <label className="nur-label" htmlFor="appshop-percent">{t("settings.appShop.pointsPercent")}</label>
              <div className="appshop__percent">
                <input
                  id="appshop-percent"
                  className="nur-input"
                  inputMode="decimal"
                  value={form.pointsPercent}
                  onChange={(ev) => update(entity.key, { pointsPercent: ev.target.value })}
                />
                <span>%</span>
              </div>
              <div className="settings__fieldHint">{t("settings.appShop.pointsHint")}</div>
              {percentInvalid(form) && (
                <div className="settings__fieldError">{t("settings.appShop.percentInvalid")}</div>
              )}
              {fieldError("pointsPercent")}
            </div>
          )}
        </div>
      )}

      {/* Превью */}
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">👀</span> {t("settings.appShop.previewTitle")}
        </h2>
        <div className="appshop__preview" aria-label={t("settings.appShop.previewTitle")}>
          {preview?.image && <img className="appshop__previewLogo" src={preview.image} alt="" />}
          <div className="appshop__previewName">{preview?.name || form.name.trim() || entity.title}</div>
          <div className="appshop__previewAddress">
            {preview?.address || form.address.trim() || t("settings.appShop.previewNoAddress")}
          </div>
          {previewPercent !== null && previewPercent > 0 && (
            <div className="appshop__previewBadge">
              {t("settings.appShop.previewPoints", { percent: previewPercent })}
            </div>
          )}
          <div className="appshop__previewBtns" aria-hidden="true">
            <span>{t("settings.appShop.previewPrices")}</span>
            <span>{t("settings.appShop.previewCall")}</span>
            <span>{t("settings.appShop.previewMap")}</span>
          </div>
        </div>
        {statusStale && <p className="settings__fieldHint">{t("settings.appShop.previewAfterSave")}</p>}
      </div>

      <div className="settings__actions appshop__actions">
        {saved && <div className="appshop__saved" role="status">{t("settings.appShop.saved")}</div>}
        {saveError && (
          <div className="settings__warnBox appshop__saveError" role="alert">
            <span>{saveError.message}</span>
            {saveError.kind === "network" && (
              <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={() => save()}>
                {t("settings.appShop.retry")}
              </button>
            )}
          </div>
        )}
        <button className="nur-btn nur-btn--primary" type="submit" disabled={!canSave}>
          {saving ? t("settings.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
