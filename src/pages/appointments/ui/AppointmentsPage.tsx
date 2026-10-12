import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  PagePanel,
  PageShell,
} from "@shared/ui/page-shell";
import Modal from "@shared/ui/Modal/Modal";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useConfirm } from "@shared/hooks/useDialog";
import { useMarketSphere } from "@entities/user";
import { fetchSaleConsultants, type SaleConsultant } from "@entities/sale";
import { MARKET_CASHIER_SALE_ID_PARAM } from "@features/create-sale";
import {
  DAY_START_MIN,
  SLOT_MIN,
  appointmentToSale,
  daySlots,
  deleteAppointment,
  fetchAppointments,
  timeToMin,
  type Appointment,
} from "../api/appointments";
import AppointmentFormModal from "./AppointmentFormModal";
import "@shared/styles/sphere-form.scss";
import "./Appointments.scss";

const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bishkek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** Запись клиентов: сетка дня по мастерам (режим «Услуги»). */
export default function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { features } = useMarketSphere();
  const [date, setDate] = useState(todayKey);
  const [masters, setMasters] = useState<SaleConsultant[]>([]);
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ performerId?: string; time?: string } | null>(null);
  const [opened, setOpened] = useState<Appointment | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!features.appointments) return;
    fetchSaleConsultants()
      .then((l) => setMasters(Array.isArray(l) ? l : []))
      .catch(() => setMasters([]));
  }, [features.appointments]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setList(await fetchAppointments({ date }));
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.appointments.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [date, t]);

  useEffect(() => {
    if (features.appointments) load();
  }, [features.appointments, load]);

  // Колонки: мастера + те, кто есть в записях, но не в списке сотрудников
  const columns = useMemo(() => {
    const cols = masters.map((m) => ({ id: String(m.id), name: m.full_name }));
    for (const a of list) {
      if (a.performerId && !cols.some((c) => c.id === a.performerId)) {
        cols.push({ id: a.performerId, name: a.performerName || "—" });
      }
    }
    return cols;
  }, [masters, list]);

  const slots = useMemo(() => daySlots(), []);

  const runAction = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError("");
    try {
      await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const toSale = (a: Appointment) =>
    runAction(async () => {
      try {
        const saleId = await appointmentToSale(a.id);
        setOpened(null);
        navigate(
          saleId
            ? `/crm/market/cashier?${MARKET_CASHIER_SALE_ID_PARAM}=${encodeURIComponent(saleId)}`
            : "/crm/market/cashier",
        );
      } catch (err: any) {
        setActionError(validateResErrors(err, t("crm.sphere.appointments.toSaleFailed")));
      }
    });

  const remove = async (a: Appointment) => {
    const ok = await new Promise<boolean>((resolve) =>
      confirm(t("crm.sphere.appointments.deleteConfirm", { client: a.clientName }), resolve),
    );
    if (!ok) return;
    await runAction(async () => {
      try {
        await deleteAppointment(a.id);
        setOpened(null);
        await load();
      } catch (err: any) {
        setActionError(validateResErrors(err, t("crm.sphere.appointments.deleteFailed")));
      }
    });
  };

  if (!features.appointments) {
    return (
      <PageShell className="appointments">
        <PageHeader title={t("crm.sphere.appointments.title")} />
        <EmptyState
          title={t("crm.sphere.unavailable.title")}
          text={t("crm.sphere.unavailable.services")}
          action={
            <Link className="nur-btn nur-btn--secondary" to="/crm/set?tab=marketSphere">
              {t("crm.sphere.unavailable.toSettings")}
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="appointments">
      <PageHeader
        title={t("crm.sphere.appointments.title")}
        subtitle={t("crm.sphere.appointments.subtitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--primary" onClick={() => setForm({})}>
            {t("crm.sphere.appointments.new")}
          </button>
        }
      />

      <FilterBar>
        <label className="nur-field">
          <span className="nur-label">{t("crm.sphere.appointments.date")}</span>
          <input
            type="date"
            className="nur-input"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
        <button type="button" className="nur-btn nur-btn--secondary" onClick={() => setDate(todayKey())}>
          {t("crm.sphere.appointments.today")}
        </button>
      </FilterBar>

      <PagePanel flush>
        {loading && list.length === 0 ? (
          <LoadingState rows={6} />
        ) : error ? (
          <ErrorState
            title={t("crm.sphere.appointments.loadFailed")}
            text={error}
            action={
              <button type="button" className="nur-btn nur-btn--secondary" onClick={load}>
                {t("common.retry")}
              </button>
            }
          />
        ) : columns.length === 0 ? (
          <EmptyState title={t("crm.sphere.appointments.noMasters")} />
        ) : (
          <div className="appointments__scroll">
            <div
              className="appointments__grid"
              style={{
                gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))`,
                gridTemplateRows: `auto repeat(${slots.length}, 32px)`,
              }}
              role="grid"
              aria-label={t("crm.sphere.appointments.gridLabel", { date })}
            >
              <div className="appointments__corner" />
              {columns.map((c, ci) => (
                <div
                  key={c.id}
                  className="appointments__head"
                  role="columnheader"
                  style={{ gridColumn: ci + 2, gridRow: 1 }}
                >
                  {c.name}
                </div>
              ))}
              {slots.map((time, si) => (
                <div key={time} className="appointments__time" style={{ gridColumn: 1, gridRow: si + 2 }}>
                  {time}
                </div>
              ))}
              {columns.map((c, ci) =>
                slots.map((time, si) => (
                  <button
                    key={`${c.id}-${time}`}
                    type="button"
                    className="appointments__slot"
                    style={{ gridColumn: ci + 2, gridRow: si + 2 }}
                    aria-label={t("crm.sphere.appointments.slotLabel", { master: c.name, time })}
                    onClick={() => setForm({ performerId: c.id, time })}
                  />
                )),
              )}
              {list.map((a) => {
                const ci = columns.findIndex((c) => c.id === a.performerId);
                const start = timeToMin(a.time);
                if (ci < 0 || start < 0) return null;
                const row = Math.max(0, Math.floor((start - DAY_START_MIN) / SLOT_MIN));
                if (row >= slots.length) return null;
                const span = Math.max(1, Math.ceil(a.durationMin / SLOT_MIN));
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`appointments__item appointments__item--${a.status}`}
                    style={{
                      gridColumn: ci + 2,
                      gridRow: `${row + 2} / span ${Math.min(span, slots.length - row)}`,
                    }}
                    onClick={() => {
                      setActionError("");
                      setOpened(a);
                    }}
                  >
                    <b>{a.time}</b> {a.clientName}
                    <span>{a.serviceName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PagePanel>

      {form && (
        <AppointmentFormModal
          date={date}
          initialPerformerId={form.performerId}
          initialTime={form.time}
          masters={columns}
          existing={list}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}

      {opened && (
        <Modal
          open
          onClose={busy ? undefined : () => setOpened(null)}
          title={t("crm.sphere.appointments.detailTitle", { time: opened.time })}
          wrapperId="appointment-detail-modal"
          className="sphere-modal"
        >
          <dl className="appointments__detail">
            <dt>{t("crm.sphere.appointments.client")}</dt>
            <dd>{opened.clientName}</dd>
            <dt>{t("crm.sphere.appointments.service")}</dt>
            <dd>{opened.serviceName}</dd>
            <dt>{t("crm.sphere.appointments.master")}</dt>
            <dd>{columns.find((c) => c.id === opened.performerId)?.name || opened.performerName || "—"}</dd>
            <dt>{t("crm.sphere.appointments.duration")}</dt>
            <dd>{t("crm.sphere.appointments.minutes", { count: opened.durationMin })}</dd>
            {opened.note ? (
              <>
                <dt>{t("crm.sphere.appointments.note")}</dt>
                <dd>{opened.note}</dd>
              </>
            ) : null}
          </dl>
          {actionError ? (
            <p className="sphere-form__error" role="alert">
              {actionError}
            </p>
          ) : null}
          <div className="sphere-form__actions">
            <button
              type="button"
              className="nur-btn nur-btn--ghost"
              onClick={() => remove(opened)}
              disabled={busy}
            >
              {t("common.delete")}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={() => toSale(opened)}
              disabled={busy || opened.status === "canceled"}
            >
              {t("crm.sphere.appointments.toSale")}
            </button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
