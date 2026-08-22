import { Plus, ShoppingCart, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./CashierCartsBar.scss";

const CashierCartsBar = ({
  carts = [],
  activeSaleId,
  switching = false,
  onSelect,
  onNewCart,
  onDelete,
  layout = "compact",
  alwaysShow = false,
}: any) => {
  const { t } = useTranslation();

  if (!alwaysShow && !carts.length) return null;

  return (
    <div
      className={`cashier-carts-bar cashier-carts-bar--${layout}`}
    >
      <div className="cashier-carts-bar__label">{t("crm.cashier.carts")}</div>
      <div className="cashier-carts-bar__tabs" role="tablist" aria-label={t("crm.cashier.carts")}>
        {!carts.length && (
          <span className="cashier-carts-bar__empty">{t("crm.cashier.noOpenCarts")}</span>
        )}
        {carts.map((cart) => {
          const isActive = String(cart.saleId) === String(activeSaleId);
          const count = Number(cart.itemCount) || 0;
          return (
            <div
              key={cart.saleId}
              className={`cashier-carts-bar__tab-wrap ${
                isActive ? "cashier-carts-bar__tab-wrap--active" : ""
              } ${onDelete ? "cashier-carts-bar__tab-wrap--deletable" : ""}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={switching}
                className={`cashier-carts-bar__tab ${
                  isActive ? "cashier-carts-bar__tab--active" : ""
                } ${cart.isMain ? "cashier-carts-bar__tab--main" : ""}`}
                onClick={() => onSelect(cart.saleId)}
                title={cart.isMain ? t("crm.cashier.mainCart") : cart.label}
              >
                <ShoppingCart size={14} aria-hidden />
                <span className="cashier-carts-bar__tab-label">{cart.label}</span>
                {count > 0 && (
                  <span className="cashier-carts-bar__tab-badge">{count}</span>
                )}
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="cashier-carts-bar__delete-btn"
                  disabled={switching}
                  onClick={() => onDelete(cart.saleId)}
                  title={t("crm.cashier.deleteCart", { label: cart.label })}
                  aria-label={t("crm.cashier.deleteCart", { label: cart.label })}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="cashier-carts-bar__new-btn"
        disabled={switching}
        onClick={onNewCart}
        title={t("crm.cashier.parkCartHint")}
      >
        <Plus size={16} />
        <span>{t("crm.cashier.newCartLabel")}</span>
      </button>
    </div>
  );
};

export default CashierCartsBar;
