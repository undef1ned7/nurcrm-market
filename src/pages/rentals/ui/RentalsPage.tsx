import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  PagePanel,
  PageShell,
  SectionTabs,
  StatCard,
  StatGrid,
} from "@shared/ui/page-shell";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useMarketSphere } from "@entities/user";
import {
  fetchRentals,
  isRentalOverdue,
  rentalTiles,
  type Rental,
  type RentalStatus,
} from "../api/rentals";
import IssueRentalModal from "./IssueRentalModal";
import ReturnRentalModal from "./ReturnRentalModal";
import "@shared/styles/sphere-form.scss";
import "./Rentals.scss";

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });

/** Сколько строк рисовать сразу (тысячи записей тормозят рендер). */
const PAGE = 200;

const fmtDate = (key: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "—";
};

/** Раздел «Прокат» (виды магазина «Одежда» и «Услуги»). */
export default function RentalsPage() {
  const { t } = useTranslation();
  const { features } = useMarketSphere();
  const [tab, setTab] = useState<RentalStatus>("active");
  const [lists, setLists] = useState<Record<RentalStatus, Rental[]>>({
    active: [],
    overdue: [],
    returned: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [returning, setReturning] = useState<Rental | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Плитки считают «на руках» и «просрочено» — грузим обе вкладки сразу;
      // «Возвращены» — только когда открыта эта вкладка.
      const [active, overdue, returned] = await Promise.all([
        fetchRentals("active"),
        fetchRentals("overdue"),
        tab === "returned" ? fetchRentals("returned") : Promise.resolve(null),
      ]);
      setLists((prev) => ({ active, overdue, returned: returned ?? prev.returned }));
    } catch (err: any) {
      setError(validateResErrors(err, t("crm.sphere.rentals.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [tab, t]);

  useEffect(() => {
    if (features.rentals) load();
  }, [features.rentals, load]);

  const tiles = useMemo(() => rentalTiles(lists.active, lists.overdue), [lists]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lists[tab];
    if (!q) return list;
    return list.filter((r) =>
      [r.clientName, r.number, ...r.items.map((i) => i.name)].join(" ").toLowerCase().includes(q),
    );
  }, [lists, tab, query]);
  const rows = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hiddenCount = filtered.length - rows.length;

  if (!features.rentals) {
    return (
      <PageShell className="rentals">
        <PageHeader title={t("crm.sphere.rentals.title")} />
        <EmptyState
          title={t("crm.sphere.unavailable.title")}
          text={t("crm.sphere.unavailable.rentals")}
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
    <PageShell className="rentals">
      <PageHeader
        title={t("crm.sphere.rentals.title")}
        subtitle={t("crm.sphere.rentals.subtitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--primary" onClick={() => setIssueOpen(true)}>
            {t("crm.sphere.rentals.issue")}
          </button>
        }
      />

      <StatGrid>
        <StatCard label={t("crm.sphere.rentals.tileOnHands")} value={tiles.onHands} />
        <StatCard
          label={t("crm.sphere.rentals.tileOverdue")}
          value={tiles.overdue}
          className={tiles.overdue > 0 ? "rentals__tile--danger" : ""}
        />
        <StatCard label={t("crm.sphere.rentals.tileDeposits")} value={`${fmt(tiles.moneyDeposits)} сом`} />
      </StatGrid>

      <SectionTabs
        value={tab}
        onChange={(v: RentalStatus) => {
          setTab(v);
          setLimit(PAGE);
        }}
        items={[
          { value: "active", label: t("crm.sphere.rentals.tabActive") },
          { value: "overdue", label: t("crm.sphere.rentals.tabOverdue") },
          { value: "returned", label: t("crm.sphere.rentals.tabReturned") },
        ]}
      />

      <FilterBar>
        <label className="nur-field">
          <span className="nur-label">{t("crm.sphere.rentals.search")}</span>
          <input
            className="nur-input"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
      </FilterBar>

      <PagePanel flush>
        {loading && rows.length === 0 ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState
            title={t("crm.sphere.rentals.loadFailed")}
            text={error}
            action={
              <button type="button" className="nur-btn nur-btn--secondary" onClick={load}>
                {t("common.retry")}
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState title={t("crm.sphere.rentals.empty")} />
        ) : (
          <div className="nur-table-wrap">
            <table className="nur-table">
              <thead>
                <tr>
                  <th>{t("crm.sphere.rentals.colClient")}</th>
                  <th>{t("crm.sphere.rentals.colItems")}</th>
                  <th>{t("crm.sphere.rentals.colPeriod")}</th>
                  <th>{t("crm.sphere.rentals.colDeposit")}</th>
                  <th>
                    <span className="nur-sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const overdue = isRentalOverdue(r);
                  return (
                    <tr key={r.id} className={overdue ? "rentals__row--overdue" : ""}>
                      <td>{r.clientName}</td>
                      <td>
                        {r.items.map((it, i) => (
                          <div key={`${it.product}-${i}`}>
                            {it.name}
                            {it.variantLabel ? ` — ${it.variantLabel}` : ""} × {it.qty}
                          </div>
                        ))}
                      </td>
                      <td>
                        {fmtDate(r.dateFrom)} — {fmtDate(r.dateTo)}
                        {overdue ? (
                          <div className="rentals__overdue">{t("crm.sphere.rentals.overdueBadge")}</div>
                        ) : null}
                      </td>
                      <td>
                        {r.depositType === "money"
                          ? `${fmt(r.depositAmount)} сом`
                          : r.depositDocument || t("crm.sphere.rentals.depositDocument")}
                      </td>
                      <td>
                        {r.status !== "returned" ? (
                          <button
                            type="button"
                            className="nur-btn nur-btn--secondary nur-btn--sm"
                            onClick={() => setReturning(r)}
                          >
                            {t("crm.sphere.rentals.accept")}
                          </button>
                        ) : (
                          <span className="rentals__muted">
                            {r.penalty > 0
                              ? t("crm.sphere.rentals.penaltyTaken", { amount: fmt(r.penalty) })
                              : t("crm.sphere.rentals.returnedOk")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hiddenCount > 0 ? (
              <div className="rentals__more">
                <button
                  type="button"
                  className="nur-btn nur-btn--secondary nur-btn--sm"
                  onClick={() => setLimit((n) => n + PAGE)}
                >
                  {t("crm.sphere.variants.showMore", {
                    count: Math.min(PAGE, hiddenCount),
                    left: hiddenCount,
                  })}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </PagePanel>

      {issueOpen && (
        <IssueRentalModal
          onClose={() => setIssueOpen(false)}
          onCreated={() => {
            setIssueOpen(false);
            load();
          }}
          withVariants={features.variants}
        />
      )}
      {returning && (
        <ReturnRentalModal
          rental={returning}
          onClose={() => setReturning(null)}
          onReturned={() => {
            setReturning(null);
            load();
          }}
        />
      )}
    </PageShell>
  );
}
