import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UniversalModal from "@shared/ui/legacy-production/ProductionAgents/UniversalModal/UniversalModal";

const CustomServiceModal = ({
  show,
  onClose,
  customService,
  setCustomService,
  onAdd,
}: any) => {
  const { t } = useTranslation();
  const tc = (k: string): string =>
    t(`crm.sell.modals.customService.${k}`) as string;
  const handleClose = useCallback(() => {
    onClose();
    setCustomService({ name: "", price: "", quantity: "1" });
  }, [onClose, setCustomService]);

  const handleAdd = useCallback(() => {
    onAdd();
  }, [onAdd]);

  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: any) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, handleClose, handleAdd]);

  if (!show) return null;

  return (
    <UniversalModal
      onClose={handleClose}
      title={tc("title")}
    >
      <div className="start__custom-service">
        <div>
          <label>{t("common.name")}</label>
          <input
            className="sell__header-input"
            value={customService.name}
            onChange={(e) =>
              setCustomService((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            type="text"
            placeholder={tc("namePlaceholder")}
          />
        </div>
        <div>
          <label>{t("common.amount")}</label>
          <input
            className="sell__header-input"
            value={customService.price}
            onChange={(e) =>
              setCustomService((prev) => ({
                ...prev,
                price: e.target.value,
              }))
            }
            type="text"
            placeholder={tc("pricePlaceholder")}
          />
        </div>
        <div>
          <label>{t("common.quantity")}</label>
          <input
            className="sell__header-input"
            value={customService.quantity}
            onChange={(e) =>
              setCustomService((prev) => ({
                ...prev,
                quantity: e.target.value,
              }))
            }
            type="number"
            onWheel={(e) => (e.target as HTMLElement).blur()}
            min="0"
            placeholder={tc("quantityPlaceholder")}
          />
        </div>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            columnGap: "10px",
            justifyContent: "end",
          }}
        >
          <button
            className="sell__reset"
            type="button"
            onClick={handleClose}
          >
            {t("common.cancel")}
          </button>
          <button
            className="start__total-pay"
            style={{ width: "auto" }}
            type="button"
            onClick={handleAdd}
          >
            {t("common.add")}
          </button>
        </div>
      </div>
    </UniversalModal>
  );
};

export default CustomServiceModal;
