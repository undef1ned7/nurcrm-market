import { useEffect } from "react";
import { X, DollarSign, Receipt, History, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./MenuModal.scss";

const MenuModal = ({ onClose, onAction }) => {
  const { t } = useTranslation();

  // Escape закрывает меню, как остальные окна кассы
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const menuItems = [
    {
      id: "debt",
      icon: DollarSign,
      labelKey: "crm.cashier.payDebt",
    },
    {
      id: "receipts",
      icon: Receipt,
      labelKey: "crm.cashier.receiptsLog",
    },
    {
      id: "deletions",
      icon: History,
      labelKey: "crm.cashier.deletionsLog",
    },
    {
      id: "quick-slots",
      icon: Keyboard,
      labelKey: "crm.cashier.quickSlots",
    },
  ];

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div
        className="menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cashier-menu-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-modal__header">
          <h2 id="cashier-menu-modal-title" className="menu-modal__title">
            {t("crm.cashier.menu")}
          </h2>
          <button
            type="button"
            className="menu-modal__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={24} />
          </button>
        </div>
        <div className="menu-modal__items">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className="menu-modal__item"
                onClick={() => {
                  onAction(item.id);
                  onClose();
                }}
              >
                <Icon size={24} />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MenuModal;
