import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaShoppingCart, FaTimes, FaTrash } from "react-icons/fa";
import { money, FALLBACK_IMG } from "../catalog.utils";
import type { FieldMode } from "../../model/showcaseDesign";
import { QtyStepper } from "./QtyStepper";

export type CheckoutForm = {
  phone: string;
  name: string;
  address: string;
  comment: string;
  method: "pickup" | "delivery";
};

/** Настройки корзины из оформления с уже выбранными текстами. null — прежний вид. */
export type CartView = {
  page: boolean;
  fields: { phone: FieldMode; name: FieldMode; address: FieldMode; comment: FieldMode };
  phoneCountry: string;
  pickup: boolean;
  delivery: boolean;
  zonesText: string;
  paymentText: string;
  checkoutText: string;
  successText: string;
  freeFrom: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  lines: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  form: CheckoutForm;
  onFormChange: (patch: Partial<CheckoutForm>) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  canCheckout: boolean;
  checkoutHint: string;
  view: CartView | null;
  sent: boolean;
  placeholder?: string;
};

export function SideCart({
  open,
  onClose,
  lines,
  subtotal,
  deliveryFee,
  total,
  form,
  onFormChange,
  onInc,
  onDec,
  onRemove,
  onCheckout,
  canCheckout,
  checkoutHint,
  view,
  sent,
  placeholder = FALLBACK_IMG,
}: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  const fields = view?.fields || { phone: "required", name: "hidden", address: "hidden", comment: "hidden" };
  const label = (text: string, mode: FieldMode) =>
    mode === "optional" ? `${text} (${t("catalog.cartForm.optional")})` : text;
  const showMethods = !!view && view.pickup && view.delivery;
  const isDelivery = !!view && view.delivery && (form.method === "delivery" || !view.pickup);
  const showAddress = fields.address !== "hidden" && (!view || !view.pickup || !view.delivery || isDelivery);

  return (
    <div
      className={`sfdrawer ${view?.page ? "sfdrawer--page" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sf-cart-title"
    >
      <button type="button" className="sfdrawer__backdrop" onClick={onClose} aria-label={t("common.close")} />

      <div className="sfdrawer__panel">
        <div className="sfdrawer__head">
          <div className="sfdrawer__title">
            <FaShoppingCart />
            <span id="sf-cart-title">{t("catalog.cart")}</span>
            <span className="sfdrawer__badge">{lines.length}</span>
          </div>

          <button type="button" className="sfdrawer__close" onClick={onClose} aria-label={t("common.close")}>
            <FaTimes />
          </button>
        </div>

        {sent ? (
          <div className="sfdrawer__body">
            <div className="sfdrawer__success">
              <FaCheckCircle className="sfdrawer__successIcon" aria-hidden="true" />
              <div className="sfdrawer__successTitle">{t("catalog.orderSentTitle")}</div>
              <div className="sfdrawer__successText">
                {view?.successText || t("catalog.orderSentDefault")}
              </div>
              <button type="button" className="sfdrawer__btn" onClick={onClose}>
                {t("catalog.continueShopping")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="sfdrawer__body">
              {lines.length === 0 ? (
                <div className="sfdrawer__empty">{t("catalog.cartEmpty")}</div>
              ) : (
                <div className="sfdrawer__list">
                  {lines.map((ln) => (
                    <div key={ln.id} className="sfdrawer__item">
                      <img
                        className="sfdrawer__thumb"
                        src={ln.image_url || placeholder}
                        alt={ln.name}
                        loading="lazy"
                        onError={(e) => {
                          if (e?.currentTarget?.src !== placeholder) e.currentTarget.src = placeholder;
                        }}
                      />

                      <div className="sfdrawer__info">
                        <div className="sfdrawer__name" title={ln.name}>
                          {ln.name}
                        </div>

                        <div className="sfdrawer__price">{money(ln.price)} сом</div>

                        <div className="sfdrawer__controls">
                          <QtyStepper value={ln.qty} onMinus={() => onDec(ln.id)} onPlus={() => onInc(ln.id)} />
                          <button
                            type="button"
                            className="sfdrawer__trash"
                            onClick={() => onRemove(ln.id)}
                            aria-label={t("catalog.removeItem", { name: ln.name })}
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
              {showMethods && (
                <div className="sfdrawer__choice" role="radiogroup">
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={form.method === m}
                      className={`sfdrawer__choiceBtn ${form.method === m ? "sfdrawer__choiceBtn--active" : ""}`}
                      onClick={() => onFormChange({ method: m })}
                    >
                      {m === "pickup" ? t("catalog.cartForm.pickup") : t("catalog.cartForm.delivery")}
                    </button>
                  ))}
                </div>
              )}

              {isDelivery && (view?.zonesText || view?.freeFrom) && (
                <div className="sfdrawer__note">
                  {view?.zonesText && <div>{view.zonesText}</div>}
                  {view?.freeFrom ? (
                    <div>{t("catalog.cartForm.freeFrom", { amount: money(view.freeFrom) })}</div>
                  ) : null}
                </div>
              )}

              {fields.phone !== "hidden" && (
                <div className="sfdrawer__field">
                  <label className="sfdrawer__label" htmlFor="sf-cart-phone">
                    {label(t("catalog.cartForm.phone"), fields.phone)}
                  </label>
                  <input
                    id="sf-cart-phone"
                    className="sfdrawer__input"
                    value={form.phone}
                    onChange={(e) => onFormChange({ phone: e.target.value })}
                    placeholder={`${view?.phoneCountry || "+996"}...`}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              )}

              {fields.name !== "hidden" && (
                <div className="sfdrawer__field">
                  <label className="sfdrawer__label" htmlFor="sf-cart-name">
                    {label(t("catalog.cartForm.name"), fields.name)}
                  </label>
                  <input
                    id="sf-cart-name"
                    className="sfdrawer__input"
                    value={form.name}
                    onChange={(e) => onFormChange({ name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
              )}

              {showAddress && (
                <div className="sfdrawer__field">
                  <label className="sfdrawer__label" htmlFor="sf-cart-address">
                    {label(t("catalog.cartForm.address"), fields.address)}
                  </label>
                  <input
                    id="sf-cart-address"
                    className="sfdrawer__input"
                    value={form.address}
                    onChange={(e) => onFormChange({ address: e.target.value })}
                    autoComplete="street-address"
                  />
                </div>
              )}

              {fields.comment !== "hidden" && (
                <div className="sfdrawer__field">
                  <label className="sfdrawer__label" htmlFor="sf-cart-comment">
                    {label(t("catalog.cartForm.comment"), fields.comment)}
                  </label>
                  <textarea
                    id="sf-cart-comment"
                    className="sfdrawer__input sfdrawer__textarea"
                    value={form.comment}
                    onChange={(e) => onFormChange({ comment: e.target.value })}
                    rows={2}
                  />
                </div>
              )}

              {view?.paymentText && <div className="sfdrawer__note">{view.paymentText}</div>}

              {isDelivery && lines.length > 0 && (
                <div className="sfdrawer__subrows">
                  <div className="sfdrawer__subrow">
                    <span>{t("catalog.cartForm.subtotal")}</span>
                    <span>{money(subtotal)} сом</span>
                  </div>
                  <div className="sfdrawer__subrow">
                    <span>{t("catalog.cartForm.delivery")}</span>
                    <span>
                      {deliveryFee > 0
                        ? `${money(deliveryFee)} сом`
                        : t("catalog.cartForm.deliveryFree")}
                    </span>
                  </div>
                </div>
              )}

              <div className="sfdrawer__total">
                <div className="sfdrawer__totalKey">{t("catalog.cartForm.totalLabel")}</div>
                <div className="sfdrawer__totalVal">{money(total)} сом</div>
              </div>

              {checkoutHint ? <div className="sfdrawer__hint">{checkoutHint}</div> : null}

              <button
                type="button"
                className="sfdrawer__btn"
                onClick={onCheckout}
                disabled={!canCheckout}
                title={!canCheckout ? checkoutHint : t("catalog.openWhatsapp")}
              >
                {view?.checkoutText || t("catalog.checkout")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
