/** Settings tab: Онлайн */
export function OnlineTab(props) {
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
              <span className="settings__emoji">🌐</span> Онлайн
            </h2>

            <div className="settings__onlineGrid">
              {/* Онлайн-запись для барбершопа */}
              {isBarberSector && (
                <div className="settings__onlineCard">
                  <div className="settings__onlineHead">
                    <div className="settings__onlineTitle">
                      📅 Онлайн-запись
                    </div>
                    <div className="settings__onlineHint">
                      Клиенты могут записаться онлайн по этой ссылке
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
                              {slugSaving ? "Сохранение…" : "Сохранить"}
                            </button>
                          </div>
                        </div>
                        {slugError ? (
                          <div className="settings__fieldError">{slugError}</div>
                        ) : slugChecking ? (
                          <div className="settings__fieldHint">Проверяем доступность…</div>
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
                          Копировать
                        </button>
                        <button
                          type="button"
                          className="nur-btn nur-btn--primary nur-btn--sm"
                          onClick={() => openUrl(onlineBookingUrl)}
                          disabled={!onlineBookingUrl}
                        >
                          Открыть
                        </button>
                      </div>
                    </div>
                  </div>

                  {!onlineBookingUrl && (
                    <div className="settings__warnBox">
                      Нет slug у компании — без него ссылку собрать нельзя.
                      Обычно slug приходит из <code>/users/company/</code>.
                    </div>
                  )}
                </div>
              )}

              {/* Онлайн-меню/каталог для кафе, магазинов и производства */}
              {(isCafeSector || isMarketSector || isProductionSector) && (
                <div className="settings__onlineCard">
                  <div className="settings__onlineHead">
                    <div className="settings__onlineTitle">
                      {isCafeSector
                        ? "🍽️ Онлайн-меню"
                        : isProductionSector
                          ? "🏭 Онлайн-витрина"
                          : "🛒 Онлайн-каталог"}
                    </div>
                    <div className="settings__onlineHint">
                      У каждой компании своя ссылка по slug
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
                          Копировать
                        </button>
                        <button
                          type="button"
                          className="nur-btn nur-btn--primary nur-btn--sm"
                          onClick={() => openUrl(onlineMenuUrl)}
                          disabled={!onlineMenuUrl}
                        >
                          Открыть
                        </button>
                      </div>
                    </div>
                  </div>

                  {!onlineMenuUrl && (
                    <div className="settings__warnBox">
                      Нет slug у компании — без него ссылку собрать нельзя.
                      Обычно slug приходит из <code>/users/company/</code>.
                    </div>
                  )}
                </div>
              )}

              {/* Fallback если не определён тип сектора */}
              {!isBarberSector &&
                !isCafeSector &&
                !isMarketSector &&
                !isProductionSector && (
                <div className="settings__onlineCard">
                  <div className="settings__onlineHead">
                    <div className="settings__onlineTitle">
                      Ссылка на онлайн
                    </div>
                    <div className="settings__onlineHint">
                      У каждой компании своя ссылка по slug
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
                      Нет slug у компании — без него ссылку собрать нельзя.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );

}
