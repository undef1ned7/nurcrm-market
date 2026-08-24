import { useTranslation } from "react-i18next";

/** Settings tab: Печать */
export function PrintTab(props) {
  const { t } = useTranslation();
  const {
    CafeKitchenPrintersSettings,
    CafeReceiptPrinterSettings,
    DataContainer,
    isCafeSector,
    showAlert,
  } = props;

      return (
        <div className="settings__tab-content settings__tab-content--print">
          {isCafeSector ? (
            <DataContainer>
              <CafeReceiptPrinterSettings showAlert={showAlert} />
              <CafeKitchenPrintersSettings showAlert={showAlert} />
            </DataContainer>
          ) : (
            <div className="settings__section">
              <h2 className="settings__section-title">
                <span className="settings__emoji">🖨️</span> {t("settings.print.sectionTitle")}
              </h2>
              <p className="settings__mutedText">
                {t("settings.print.cafeOnlyHint")}
              </p>
            </div>
          )}
        </div>
      );

}
