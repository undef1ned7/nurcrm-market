import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@shared/ui/Modal/Modal";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { isRentalOverdue, returnRental, type Rental } from "../api/rentals";

/** Приём вещи из проката: состояние и штраф (за просрочку или повреждение). */
export default function ReturnRentalModal({
  rental,
  onClose,
  onReturned,
}: {
  rental: Rental;
  onClose: () => void;
  onReturned: () => void;
}) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [penalty, setPenalty] = useState("0");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);
  const overdue = isRentalOverdue(rental);

  const submit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    const s = penalty.trim().replace(",", ".") || "0";
    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
      setError(t("crm.sphere.rentals.errors.penalty"));
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      await returnRental(rental.id, { condition, penalty: Number(s).toFixed(2) });
      onReturned();
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.rentals.returnFailed")));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.rentals.acceptTitle", { client: rental.clientName })}
      wrapperId="rental-return-modal"
      className="sphere-modal"
    >
      <form onSubmit={submit} noValidate className="sphere-form">
        {overdue ? (
          <p className="sphere-form__warn" role="alert">
            {t("crm.sphere.rentals.acceptOverdue")}
          </p>
        ) : null}
        <fieldset className="sphere-form__row">
          <legend className="nur-label">{t("crm.sphere.rentals.condition")}</legend>
          <label>
            <input type="radio" checked={condition === "ok"} onChange={() => setCondition("ok")} />
            {t("crm.sphere.rentals.conditionOk")}
          </label>
          <label>
            <input
              type="radio"
              checked={condition === "damaged"}
              onChange={() => setCondition("damaged")}
            />
            {t("crm.sphere.rentals.conditionDamaged")}
          </label>
        </fieldset>
        <label className="sphere-form__field">
          <span>{t("crm.sphere.rentals.penalty")}</span>
          <input
            className="nur-input"
            inputMode="decimal"
            value={penalty}
            onChange={(e) => setPenalty(e.target.value)}
          />
        </label>
        {error ? (
          <p className="sphere-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sphere-form__actions">
          <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="nur-btn nur-btn--primary" disabled={saving}>
            {saving ? t("settings.saving") : t("crm.sphere.rentals.acceptSubmit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
