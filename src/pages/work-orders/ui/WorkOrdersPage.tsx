import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PagePanel,
  PageShell,
  SectionTabs,
  StatusChip,
} from "@shared/ui/page-shell";
import Modal from "@shared/ui/Modal/Modal";
import api from "@shared/api";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useDebouncedValue } from "@shared/hooks/useDebounce";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import { findOwnOpenShiftInList, resolveCashierId } from "@shared/lib/tools/cashierOpenShift";
import { useMarketSphere, useUser } from "@entities/user";
import { fetchShiftsAsync, useShifts } from "@entities/shift";
import { useDispatch } from "react-redux";
import {
  buildWorkOrderPayload,
  createWorkOrder,
  fetchWorkOrders,
  isWorkOrderIssued,
  issueWorkOrder,
  validateWorkOrderDraft,
  workOrderDue,
  type WorkOrder,
  type WorkOrderDraft,
} from "../api/workOrders";
import "@shared/styles/sphere-form.scss";

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });

const asList = (data: any): any[] =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/** Маршрутизация кассы текущей смены — предоплата и доплата попадают в неё. */
function useShiftRouting() {
  const { profile, company, currentUser, userId } = useUser() as any;
  const { shifts } = useShifts();
  const dispatch = useDispatch() as any;
  useEffect(() => {
    dispatch(fetchShiftsAsync(undefined as any));
  }, [dispatch]);
  return useMemo(() => {
    const cashierId = resolveCashierId({ currentUser, userId, profile });
    const shift = findOwnOpenShiftInList(shifts, cashierId);
    return buildPosRoutingFromUser(profile, company, shift?.id);
  }, [profile, company, currentUser, userId, shifts]);
}

/** Заказ-наряды (ремонт): приём с предоплатой и выдача с доплатой. */
export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const { features } = useMarketSphere();
  const routing = useShiftRouting();
  const [tab, setTab] = useState<"open" | "issued">("open");
  const [list, setList] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [issuing, setIssuing] = useState<WorkOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setList(await fetchWorkOrders());
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.workOrders.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (features.workOrders) load();
  }, [features.workOrders, load]);

  const rows = useMemo(
    () => list.filter((o) => (tab === "issued" ? isWorkOrderIssued(o) : !isWorkOrderIssued(o))),
    [list, tab],
  );

  if (!features.workOrders) {
    return (
      <PageShell>
        <PageHeader title={t("crm.sphere.workOrders.title")} />
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
    <PageShell>
      <PageHeader
        title={t("crm.sphere.workOrders.title")}
        subtitle={t("crm.sphere.workOrders.subtitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--primary" onClick={() => setCreateOpen(true)}>
            {t("crm.sphere.workOrders.new")}
          </button>
        }
      />
      <SectionTabs
        value={tab}
        onChange={(v: "open" | "issued") => setTab(v)}
        items={[
          { value: "open", label: t("crm.sphere.workOrders.tabOpen") },
          { value: "issued", label: t("crm.sphere.workOrders.tabIssued") },
        ]}
      />
      <PagePanel flush>
        {loading && list.length === 0 ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState
            title={t("crm.sphere.workOrders.loadFailed")}
            text={error}
            action={
              <button type="button" className="nur-btn nur-btn--secondary" onClick={load}>
                {t("common.retry")}
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState title={t("crm.sphere.workOrders.empty")} />
        ) : (
          <div className="nur-table-wrap">
            <table className="nur-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>{t("crm.sphere.workOrders.client")}</th>
                  <th>{t("crm.sphere.workOrders.item")}</th>
                  <th>{t("crm.sphere.workOrders.price")}</th>
                  <th>{t("crm.sphere.workOrders.prepayment")}</th>
                  <th>{t("crm.sphere.workOrders.due")}</th>
                  <th>
                    <span className="nur-sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>{o.number || o.id.slice(0, 8)}</td>
                    <td>{o.clientName}</td>
                    <td>
                      {o.title}
                      {o.description ? <div className="sphere-form__hint">{o.description}</div> : null}
                    </td>
                    <td>{fmt(o.total)} сом</td>
                    <td>{fmt(o.prepayment)} сом</td>
                    <td>{fmt(workOrderDue(o))} сом</td>
                    <td>
                      {isWorkOrderIssued(o) ? (
                        <StatusChip tone="success">{t("crm.sphere.workOrders.issued")}</StatusChip>
                      ) : (
                        <button
                          type="button"
                          className="nur-btn nur-btn--secondary nur-btn--sm"
                          onClick={() => setIssuing(o)}
                        >
                          {t("crm.sphere.workOrders.issue")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PagePanel>

      {createOpen && (
        <CreateWorkOrderModal
          routing={routing}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
      {issuing && (
        <IssueWorkOrderModal
          order={issuing}
          routing={routing}
          onClose={() => setIssuing(null)}
          onIssued={() => {
            setIssuing(null);
            load();
          }}
        />
      )}
    </PageShell>
  );
}

function CreateWorkOrderModal({
  routing,
  onClose,
  onCreated,
}: {
  routing: Record<string, string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<WorkOrderDraft>({
    clientId: "",
    title: "",
    description: "",
    price: "",
    prepayment: "0",
    prepaymentMethod: "cash",
  });
  const [clientName, setClientName] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClient = useDebouncedValue(clientQuery, 350, undefined);
  const [clients, setClients] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  const set = <K extends keyof WorkOrderDraft>(k: K, v: WorkOrderDraft[K]) => {
    setDraft((p) => ({ ...p, [k]: v }));
    setError("");
  };

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
    const v = validateWorkOrderDraft(draft);
    if (v) {
      setError(t(`crm.sphere.workOrders.errors.${v}`));
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    try {
      await createWorkOrder(buildWorkOrderPayload(draft, routing));
      onCreated();
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.workOrders.saveFailed")));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.workOrders.new")}
      wrapperId="work-order-create-modal"
      className="sphere-modal"
    >
      <form onSubmit={submit} noValidate className="sphere-form">
        <label className="sphere-form__field">
          <span>{t("crm.sphere.workOrders.client")}</span>
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
          <ul className="sphere-form__results" aria-label={t("crm.sphere.workOrders.client")}>
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
        <label className="sphere-form__field">
          <span>{t("crm.sphere.workOrders.item")}</span>
          <input
            className="nur-input"
            value={draft.title}
            maxLength={200}
            placeholder={t("crm.sphere.workOrders.itemPlaceholder")}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="sphere-form__field">
          <span>{t("crm.sphere.workOrders.problem")}</span>
          <textarea
            className="nur-input"
            rows={2}
            maxLength={1000}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className="sphere-form__grid">
          <label className="sphere-form__field">
            <span>{t("crm.sphere.workOrders.price")}</span>
            <input
              className="nur-input"
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.workOrders.prepayment")}</span>
            <input
              className="nur-input"
              inputMode="decimal"
              value={draft.prepayment}
              onChange={(e) => set("prepayment", e.target.value)}
            />
          </label>
          <label className="sphere-form__field">
            <span>{t("crm.sphere.rentals.depositMethod")}</span>
            <select
              className="nur-select"
              value={draft.prepaymentMethod}
              onChange={(e) => set("prepaymentMethod", e.target.value as "cash" | "transfer")}
            >
              <option value="cash">{t("crm.sphere.exchange.cash")}</option>
              <option value="transfer">{t("crm.sphere.exchange.transfer")}</option>
            </select>
          </label>
        </div>
        <p className="sphere-form__hint">{t("crm.sphere.workOrders.shiftHint")}</p>
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
            {saving ? t("settings.saving") : t("crm.sphere.workOrders.accept")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function IssueWorkOrderModal({
  order,
  routing,
  onClose,
  onIssued,
}: {
  order: WorkOrder;
  routing: Record<string, string>;
  onClose: () => void;
  onIssued: () => void;
}) {
  const { t } = useTranslation();
  const due = workOrderDue(order);
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [received, setReceived] = useState(due.toFixed(2));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  const submit = async (e: any) => {
    e.preventDefault();
    if (inFlightRef.current) return;
    const s = received.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
      setError(t("crm.sphere.workOrders.errors.received"));
      return;
    }
    if (method === "cash" && Number(s) < due) {
      setError(t("crm.sphere.workOrders.errors.receivedLess", { amount: fmt(due) }));
      return;
    }
    inFlightRef.current = true;
    setSaving(true);
    try {
      await issueWorkOrder(order.id, { method, received: Number(s).toFixed(2) }, routing);
      onIssued();
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.workOrders.issueFailed")));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  const change = Math.max(0, Number(received.replace(",", ".")) - due);

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={t("crm.sphere.workOrders.issueTitle", { title: order.title })}
      wrapperId="work-order-issue-modal"
      className="sphere-modal"
    >
      <form onSubmit={submit} noValidate className="sphere-form">
        <p>
          {t("crm.sphere.workOrders.issueSummary", {
            total: fmt(order.total),
            prepayment: fmt(order.prepayment),
            due: fmt(due),
          })}
        </p>
        <fieldset className="sphere-form__row">
          <legend className="nur-label">{t("crm.sphere.exchange.method")}</legend>
          <label>
            <input type="radio" checked={method === "cash"} onChange={() => setMethod("cash")} />
            {t("crm.sphere.exchange.cash")}
          </label>
          <label>
            <input type="radio" checked={method === "transfer"} onChange={() => setMethod("transfer")} />
            {t("crm.sphere.exchange.transfer")}
          </label>
        </fieldset>
        <label className="sphere-form__field">
          <span>{t("crm.sphere.workOrders.received")}</span>
          <input
            className="nur-input"
            inputMode="decimal"
            value={received}
            onChange={(e) => {
              setReceived(e.target.value);
              setError("");
            }}
          />
        </label>
        {method === "cash" && change > 0 ? (
          <p className="sphere-form__hint">{t("crm.sphere.workOrders.change", { amount: fmt(change) })}</p>
        ) : null}
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
            {saving ? t("settings.saving") : t("crm.sphere.workOrders.issueSubmit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
