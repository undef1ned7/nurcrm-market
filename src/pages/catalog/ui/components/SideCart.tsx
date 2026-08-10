import { FaShoppingCart, FaTimes, FaTrash } from "react-icons/fa";
import { money, FALLBACK_IMG } from "../catalog.utils";
import { QtyStepper } from "./QtyStepper";

export function SideCart({
  open,
  onClose,
  lines,
  total,
  clientPhone,
  onChangeClientPhone,
  onInc,
  onDec,
  onRemove,
  onCheckout,
  canCheckout,
  checkoutHint,
}) {
  if (!open) return null;

  return (
    <div className="sfdrawer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="sfdrawer__backdrop"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="sfdrawer__panel">
        <div className="sfdrawer__head">
          <div className="sfdrawer__title">
            <FaShoppingCart />
            <span>Корзина</span>
            <span className="sfdrawer__badge">{lines.length}</span>
          </div>

          <button
            type="button"
            className="sfdrawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="sfdrawer__body">
          {lines.length === 0 ? (
            <div className="sfdrawer__empty">Корзина пустая.</div>
          ) : (
            <div className="sfdrawer__list">
              {lines.map((ln) => (
                <div key={ln.id} className="sfdrawer__item">
                  <img
                    className="sfdrawer__thumb"
                    src={ln.image_url || FALLBACK_IMG}
                    alt={ln.name}
                    loading="lazy"
                    onError={(e) => {
                      if (e?.currentTarget?.src !== FALLBACK_IMG)
                        e.currentTarget.src = FALLBACK_IMG;
                    }}
                  />

                  <div className="sfdrawer__info">
                    <div className="sfdrawer__name" title={ln.name}>
                      {ln.name}
                    </div>

                    <div className="sfdrawer__price">{money(ln.price)} сом</div>

                    <div className="sfdrawer__controls">
                      <QtyStepper
                        value={ln.qty}
                        onMinus={() => onDec(ln.id)}
                        onPlus={() => onInc(ln.id)}
                      />
                      <button
                        type="button"
                        className="sfdrawer__trash"
                        onClick={() => onRemove(ln.id)}
                        aria-label="Remove"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sfdrawer__foot">
          <div className="sfdrawer__field">
            <div className="sfdrawer__label">Номер клиента</div>
            <input
              className="sfdrawer__input"
              value={clientPhone}
              onChange={(e) => onChangeClientPhone(e.target.value)}
              placeholder="+996..."
              inputMode="tel"
            />
          </div>

          <div className="sfdrawer__total">
            <div className="sfdrawer__totalKey">Итого:</div>
            <div className="sfdrawer__totalVal">{money(total)} сом</div>
          </div>

          {checkoutHint ? (
            <div className="sfdrawer__hint">{checkoutHint}</div>
          ) : null}

          <button
            type="button"
            className="sfdrawer__btn"
            onClick={onCheckout}
            disabled={!canCheckout}
            title={
              !canCheckout
                ? "Заполни номер клиента и проверь номер витрины"
                : "Открыть WhatsApp"
            }
          >
            Оформить заказ
          </button>
        </div>
      </div>
    </div>
  );
};

