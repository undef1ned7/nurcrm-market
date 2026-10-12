import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@shared/ui/Modal/Modal";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import { fetchProductsApi } from "@entities/product";
import {
  createAppointment,
  daySlots,
  overlapsExisting,
  validateAppointmentDraft,
  type Appointment,
  type AppointmentDraft,
} from "../api/appointments";

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/** Новая запись клиента: клиент, мастер, услуга, время, длительность. */
export default function AppointmentFormModal({
  date,
  initialPerformerId = "",
  initialTime = "",
  masters,
  existing,
  onClose,
  onSaved,
}: {
  date: string;
  initialPerformerId?: string;
  initialTime?: string;
  masters: { id: string; name: string }[];
  existing: Appointment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AppointmentDraft>({
    clientId: "",
    performerId: initialPerformerId,
    serviceId: "",
    date,
    time: initialTime || "10:00",
    durationMin: "60",
    note: "",
  });
  const [clientName, setClientName] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClient = useDebouncedValue(clientQuery, 350, undefined);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  const set = <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  useEffect(() => {
    let cancelled = false;
    fetchProductsApi({ kind: "service", page_size: 200 })
      .then((data: any) => !cancelled && setServices(asList(data)))
      .catch(() => !cancelled && setServices([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = String(debouncedClient || "").trim();
    if (!q || draft.clientId) {
      setClients([]);
      return undefined;
    }
    let cancelled = false;
    api
      .get("/main/clients/", { params: { search: q, page_size: 10 } })
      .then(({ data }) => !cancelled && setClients(asList(data)))
      .catch(() => !cancelled && setClients([]));
    return () => {
      cancelled = true;
    };
  }, [debouncedClient, draft.clientId]);

  const submit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    const v = validateAppointmentDraft(draft);
    if (v) {
      setError(t(`crm.sphere.appointments.errors.${v}`));
      return;
    }
    if (
      overlapsExisting(existing, draft.performerId, draft.date, draft.time, Number(draft.durationMin))
    ) {
      setError(t("crm.sphere.appointments.errors.overlap"));
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    try {
      await createAppointment(draft);
      onSaved();
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.appointments.saveFailed")));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.appointments.new")}
      wrapperId="appointment-form-modal"
      className="sphere-modal"
    >
      <form onSubmit={submit} noValidate className="sphere-form">
        <label className="sphere-form__field">
          <span>{t("crm.sphere.appointments.client")}</span>
          {draft.clientId ? (
            <div className="sphere-form__chosen">
              <b>{clientName}</b>
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() => {
                  set("clientId", "");
                  setClientName("");
                }}
              >
                {t("crm.sphere.rentals.change")}
              </button>
            </div>
          ) : (
            <input
              className="nur-input"
              value={clientQuery}
              maxLength={100}
              placeholder={t("crm.sphere.rentals.clientPlaceholder")}
              onChange={(e) => setClientQuery(e.target.value)}
            />
          )}
        </label>
        {!draft.clientId && clients.length > 0 && (
          <ul className="sphere-form__results" aria-label={t("crm.sphere.appointments.client")}>
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    set("clientId", String(c.id));
                    setClientName(c.full_name || c.name || c.phone || "—");
                    setClientQuery("");
                  }}
                >
                  {c.full_name || c.name || "—"} {c.phone ? `· ${c.phone}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="sphere-form__grid">
          <label className="sphere-form__field">
            <span>{t("crm.sphere.appointments.master")}</span>
            <select
              className="nur-select"
              value={draft.performerId}
              onChange={(e) => set("performerId", e.target.value)}
            >
              <option value="">{t("crm.sphere.appointments.choose")}</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.appointments.service")}</span>
            <select
              className="nur-select"
              value={draft.serviceId}
              onChange={(e) => set("serviceId", e.target.value)}
            >
              <option value="">{t("crm.sphere.appointments.choose")}</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="sphere-form__grid">
          <label className="sphere-form__field">
            <span>{t("crm.sphere.appointments.date")}</span>
            <input
              type="date"
              className="nur-input"
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.appointments.time")}</span>
            <select className="nur-select" value={draft.time} onChange={(e) => set("time", e.target.value)}>
              {daySlots().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.appointments.durationMin")}</span>
            <input
              className="nur-input"
              inputMode="numeric"
              value={draft.durationMin}
              onChange={(e) => set("durationMin", e.target.value)}
            />
          </label>
        </div>

        <label className="sphere-form__field">
          <span>{t("crm.sphere.appointments.note")}</span>
          <textarea
            className="nur-input"
            rows={2}
            maxLength={500}
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
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
            {saving ? t("settings.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
