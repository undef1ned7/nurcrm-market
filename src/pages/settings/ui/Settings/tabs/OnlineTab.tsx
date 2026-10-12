import { useTranslation } from "react-i18next";

/** Settings tab: Онлайн */
export function OnlineTab(props) {
  const { t } = useTranslation();
  const {
    canEditSlug,
    canSaveSlug,
    company,
    copyText,
    handleSaveSlug,
    handleSlugChange,
    isBarberSector,
    isCafeSector,
    isMarketSector,
    isProductionSector,
    onlineBookingUrl,
    onlineMenuUrl,
    openUrl,
    slugAvailable,
    slugChanged,
    slugChecking,
    slugError,
    slugInput,
    slugSaving,
  } = props;

  return (
    <div className="settings__tab-content">
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">🌐</span>{" "}
          {t("settings.online.sectionTitle")}
        </h2>

        <div className="settings__onlineGrid">
          {isBarberSector && (
            <div className="settings__onlineCard">
              <div className="settings__onlineHead">
                <div className="settings__onlineTitle">
                  📅 {t("settings.online.bookingTitle")}
                </div>
                <div className="settings__onlineHint">
                  {t("settings.online.bookingHint")}
                </div>
              </div>

              <div className="settings__onlineRow">
                <div className="settings__onlineLabel">Slug</div>
                {canEditSlug ? (
                  <div className="settings__onlineValue">
                    <div className="settings__onlineLinkBox">
                      <input
                        className="nur-input"
                        value={slugInput}
                        onChange={handleSlugChange}
                        placeholder="my-company"
                        maxLength={50}
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                      <div className="settings__onlineBtns">
                        <button
                          type="button"
                          className="nur-btn nur-btn--primary nur-btn--sm"
                          onClick={handleSaveSlug}
                          disabled={!canSaveSlug}
                        >
                          {slugSaving ? t("settings.saving") : t("common.save")}
                        </button>
                      </div>
                    </div>
                    {slugError ? (
                      <div className="settings__fieldError">{slugError}</div>
                    ) : slugChecking ? (
                      <div className="settings__fieldHint">
                        {t("common.loading")}
                      </div>
                    ) : slugChanged && slugAvailable === true ? (
                      <div className="settings__fieldOk">Slug доступен</div>
                    ) : (
                      <div className="settings__fieldHint">
                        Латинские буквы, цифры и дефис. Напр.: my-company
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="settings__onlineValue">
                    {company?.slug || "—"}
                  </div>
                )}
              </div>

              <div className="settings__onlineRow">
                <div className="settings__onlineLabel">URL</div>
                <div className="settings__onlineLinkBox">
                  <input
                    className="nur-input"
                    value={onlineBookingUrl || ""}
                    readOnly
                  />
                  <div className="settings__onlineBtns">
                    <button
                      type="button"
                      className="nur-btn nur-btn--secondary nur-btn--sm"
                      onClick={() => copyText(onlineBookingUrl)}
                      disabled={!onlineBookingUrl}
                    >
                      {t("settings.copy")}
                    </button>
                    <button
                      type="button"
                      className="nur-btn nur-btn--primary nur-btn--sm"
                      onClick={() => openUrl(onlineBookingUrl)}
                      disabled={!onlineBookingUrl}
                    >
                      {t("settings.open")}
                    </button>
                  </div>
                </div>
              </div>

              {!onlineBookingUrl && (
                <div className="settings__warnBox">
                  {t("settings.online.noSlug")}
                </div>
              )}
            </div>
          )}

          {(isCafeSector || isMarketSector || isProductionSector) && (
            <div className="settings__onlineCard">
              <div className="settings__onlineHead">
                <div className="settings__onlineTitle">
                  {isCafeSector
                    ? `🍽️ ${t("settings.online.menuTitle")}`
                    : isProductionSector
                      ? `🏭 ${t("settings.online.showcaseTitle")}`
                      : `🛒 ${t("settings.online.catalogTitle")}`}
                </div>
                <div className="settings__onlineHint">
                  {t("settings.online.slugHint")}
                </div>
              </div>

              <div className="settings__onlineRow">
                <div className="settings__onlineLabel">Slug</div>
                <div className="settings__onlineValue">
                  {company?.slug || "—"}
                </div>
              </div>

              <div className="settings__onlineRow">
                <div className="settings__onlineLabel">URL</div>
                <div className="settings__onlineLinkBox">
                  <input
                    className="nur-input"
                    value={onlineMenuUrl || ""}
                    readOnly
                  />
                  <div className="settings__onlineBtns">
                    <button
                      type="button"
                      className="nur-btn nur-btn--secondary nur-btn--sm"
                      onClick={() => copyText(onlineMenuUrl)}
                      disabled={!onlineMenuUrl}
                    >
                      {t("settings.copy")}
                    </button>
                    <button
                      type="button"
                      className="nur-btn nur-btn--primary nur-btn--sm"
                      onClick={() => openUrl(onlineMenuUrl)}
                      disabled={!onlineMenuUrl}
                    >
                      {t("settings.open")}
                    </button>
                  </div>
                </div>
              </div>

              {!onlineMenuUrl && (
                <div className="settings__warnBox">
                  {t("settings.online.noSlug")}
                </div>
              )}
            </div>
          )}

          {!isBarberSector &&
            !isCafeSector &&
            !isMarketSector &&
            !isProductionSector && (
              <div className="settings__onlineCard">
                <div className="settings__onlineHead">
                  <div className="settings__onlineTitle">
                    {t("settings.online.linkTitle")}
                  </div>
                  <div className="settings__onlineHint">
                    {t("settings.online.slugHint")}
                  </div>
                </div>

                <div className="settings__onlineRow">
                  <div className="settings__onlineLabel">Slug</div>
                  <div className="settings__onlineValue">
                    {company?.slug || "—"}
                  </div>
                </div>

                {!company?.slug && (
                  <div className="settings__warnBox">
                    {t("settings.online.noSlug")}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
