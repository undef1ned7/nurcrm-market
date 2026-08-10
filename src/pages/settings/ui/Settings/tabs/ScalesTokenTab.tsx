/** Settings tab: Токен для весов */
export function ScalesTokenTab(props) {
  const {
    handleCreateScalesToken,
  } = props;

      return (
        <div className="settings__tab-content">
          <div className="settings__section">
            <h2 className="settings__section-title">
              <span className="settings__emoji">⚙️</span> Токен для доступа к
              весам
            </h2>

            <div className="settings__form-group">
              <p className="settings__mutedText">
                Создайте токен для интеграции с весами. Токен будет показан
                один раз — сохраните его в безопасном месте.
              </p>

              <button
                type="button"
                className="nur-btn nur-btn--primary"
                onClick={handleCreateScalesToken}
              >
                Создать токен
              </button>
            </div>
          </div>
        </div>
      );

}
