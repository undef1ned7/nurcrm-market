import "./MarketSummary.scss";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bar } from "react-chartjs-2";
import { RefreshCw } from "lucide-react";
import "@shared/lib/chartSetup";
import {
  PageShell,
  PageHeader,
  PagePanel,
  FilterBar,
  StatGrid,
  StatCard,
  StatusChip,
  EmptyState,
  LoadingState,
} from "@shared/ui/page-shell";
import { Segmented, PeriodSwitcher, Banner } from "@shared/ui/tools-kit";
import { formatInteger } from "@shared/lib/i18n/format";
import { useNetworkStatus } from "@shared/hooks/useNetworkStatus";
import type { DateRange, PeriodPreset } from "@shared/lib/period";
import { useToolsAccess } from "@entities/user";
import {
  ABC_SLICES,
  AbcSliceView,
  getAbcSlice,
  useAbcSlice,
  type AbcSliceId,
} from "@features/abc-analysis";
import { useMarketSummary } from "../model/useMarketSummary";
import { deltaPercent, type RecentSaleKind } from "../model/summaryData";

const PRESETS: PeriodPreset[] = ["today", "week", "month", "custom"];
/** Блок ABC в Сводке не пересчитывается чаще раза в минуту. */
const ABC_MIN_INTERVAL_MS = 60_000;

const DELTA_KEY: Record<PeriodPreset, string> = {
  today: "vsYesterday",
  week: "vsPrevWeek",
  month: "vsPrevMonth",
  quarter: "vsPrevPeriod",
  custom: "vsPrevPeriod",
};
const CHART_TITLE_KEY: Record<PeriodPreset, string> = {
  today: "byDays",
  week: "last7",
  month: "byMonthDays",
  quarter: "byDays",
  custom: "byPeriodDays",
};
const SALE_TONE: Record<RecentSaleKind, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  debt: "warning",
  return: "danger",
  new: "default",
};

function Delta({ cur, prev, label }: { cur: number; prev: number | undefined; label: string }) {
  const d = prev == null ? null : deltaPercent(cur, prev);
  if (d == null) return <span className="tk-delta tk-delta--flat">{label}: —</span>;
  const tone = d > 0.05 ? "up" : d < -0.05 ? "down" : "flat";
  const sign = d > 0 ? "+" : "";
  return (
    <span className={`tk-delta tk-delta--${tone}`}>
      {sign}
      {d.toFixed(1)}% {label}
    </span>
  );
}

export default function MarketSummary() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isOffline } = useNetworkStatus();
  const { canViewAbc, isStartTariff } = useToolsAccess();
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [custom, setCustom] = useState<Partial<DateRange> | null>(null);
  const [sliceId, setSliceId] = useState<AbcSliceId>("productRevenue");

  const s = useMarketSummary(preset, custom);
  const slice = getAbcSlice(sliceId);
  const abc = useAbcSlice(slice, s.period, {
    minIntervalMs: ABC_MIN_INTERVAL_MS,
    enabled: canViewAbc,
  });

  const som = t("common.currencySom");
  const fmt = (n: number) => formatInteger(n, i18n.language);
  const money = (n: number) => `${fmt(n)} ${som}`;
  const cur = s.current;
  const prev = s.previous;
  const deltaLabel = t(`crm.tools.summary.delta.${DELTA_KEY[preset]}`);
  const time = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
      : "—";
  const chartTotal = cur ? cur.days.reduce((sum, d) => sum + d.revenue, 0) : 0;
  const lowStockEmpty = s.lowStock != null && s.lowStock.length === 0;

  const paymentRows = ["cash", "card", "debt", "mixed"].map((kind) => ({
    kind,
    value: cur
      ? cur.payments.filter((p) => p.kind === kind).reduce((sum, p) => sum + p.value, 0)
      : 0,
  }));
  const otherPayments = cur
    ? cur.payments.filter((p) => p.kind === "other").reduce((sum, p) => sum + p.value, 0)
    : 0;

  return (
    <PageShell className="msum">
      <PageHeader
        title={t("crm.tools.summary.pageTitle")}
        subtitle={t("crm.tools.summary.pageSubtitle")}
        actions={
          <>
            <span className="msum__updated">
              {t("crm.tools.summary.updatedAt", {
                time: s.updatedAt
                  ? s.updatedAt.toLocaleTimeString(i18n.language, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "—",
              })}
            </span>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={s.refreshNow}
              title={t("common.refresh")}
              aria-label={t("common.refresh")}
            >
              <RefreshCw size={16} />
            </button>
          </>
        }
      />

      {(isOffline || s.errorKind === "network") && (
        <Banner tone="warning">{t("crm.tools.summary.messages.offline")}</Banner>
      )}
      {s.errorKind === "subscription" && (
        <Banner tone="danger">{t("crm.tools.summary.messages.subscription")}</Banner>
      )}
      {s.errorKind === "forbidden" && (
        <Banner tone="danger">{t("crm.tools.summary.messages.forbidden")}</Banner>
      )}
      {s.errorKind === "other" && (
        <Banner tone="danger">{t("crm.tools.summary.messages.loadFailed")}</Banner>
      )}

      <FilterBar>
        <PeriodSwitcher
          presets={PRESETS}
          preset={preset}
          custom={custom ?? s.period}
          onPresetChange={(p) => {
            if (p === "custom" && !custom) setCustom(s.period);
            setPreset(p);
          }}
          onCustomChange={setCustom}
        />
      </FilterBar>

      {s.loading && !cur ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <StatGrid className="msum__kpis">
            <StatCard
              label={t("crm.tools.summary.kpi.revenue")}
              value={money(cur?.totals.revenue ?? 0)}
              hint={<Delta cur={cur?.totals.revenue ?? 0} prev={prev?.totals.revenue} label={deltaLabel} />}
            />
            <StatCard
              label={t("crm.tools.summary.kpi.checks")}
              value={fmt(cur?.totals.checks ?? 0)}
              hint={<Delta cur={cur?.totals.checks ?? 0} prev={prev?.totals.checks} label={deltaLabel} />}
            />
            <StatCard
              label={t("crm.tools.summary.kpi.avgCheck")}
              value={money(cur?.totals.avgCheck ?? 0)}
              hint={<Delta cur={cur?.totals.avgCheck ?? 0} prev={prev?.totals.avgCheck} label={deltaLabel} />}
            />
            {!isStartTariff && (
              <StatCard
                label={t("crm.tools.summary.kpi.grossProfit")}
                value={cur?.totals.grossProfit == null ? "—" : money(cur.totals.grossProfit)}
                hint={
                  cur?.totals.grossProfit == null ? undefined : (
                    <Delta
                      cur={cur.totals.grossProfit}
                      prev={prev?.totals.grossProfit ?? undefined}
                      label={deltaLabel}
                    />
                  )
                }
              />
            )}
          </StatGrid>

          <div className="tk-grid-2">
            <PagePanel title={t(`crm.tools.summary.chart.${CHART_TITLE_KEY[preset]}`)}>
              <p className="msum__total">
                {t("crm.tools.summary.chart.total", { sum: money(chartTotal) })}
              </p>
              {cur && cur.days.length > 0 ? (
                <div className="tk-chart">
                  <Bar
                    data={{
                      labels: cur.days.map((d) => {
                        const dt = new Date(d.date);
                        return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
                      }),
                      datasets: [
                        {
                          label: t("crm.tools.summary.kpi.revenue"),
                          data: cur.days.map((d) => d.revenue),
                          backgroundColor: "#f7d74f",
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true } },
                    }}
                  />
                </div>
              ) : (
                <EmptyState title={t("crm.tools.summary.chart.empty")} />
              )}
            </PagePanel>

            <PagePanel title={t("crm.tools.summary.payments.title")}>
              {paymentRows.map((row) => (
                <div key={row.kind} className="msum__pay-row">
                  <span>{t(`crm.tools.summary.payments.${row.kind}`)}</span>
                  <strong>{money(row.value)}</strong>
                </div>
              ))}
              {otherPayments > 0 && (
                <div className="msum__pay-row">
                  <span>{t("crm.tools.summary.payments.other")}</span>
                  <strong>{money(otherPayments)}</strong>
                </div>
              )}
              <div className="msum__pay-row msum__pay-row--returns">
                <span>
                  {t("crm.tools.summary.payments.returns")}
                  {cur && cur.totals.returnsCount > 0 ? ` (${fmt(cur.totals.returnsCount)})` : ""}
                </span>
                <strong>{money(cur?.totals.returnsTotal ?? 0)}</strong>
              </div>
            </PagePanel>
          </div>

          <div className="tk-grid-2">
            <PagePanel
              title={t("crm.tools.summary.recent.title")}
              actions={
                <Link className="nur-btn nur-btn--secondary nur-btn--sm" to="/crm/market/history">
                  {t("crm.tools.summary.recent.all")}
                </Link>
              }
              flush
            >
              {s.recent.length === 0 ? (
                <EmptyState title={t("crm.tools.summary.recent.empty")} />
              ) : (
                <div className="nur-table-wrap">
                  <table className="nur-table nur-table--dense">
                    <thead>
                      <tr>
                        <th>{t("crm.tools.summary.recent.time")}</th>
                        <th>{t("crm.tools.summary.recent.item")}</th>
                        <th>{t("crm.tools.summary.recent.cashier")}</th>
                        <th>{t("crm.tools.summary.recent.status")}</th>
                        <th className="tk-right">{t("crm.tools.summary.recent.sum")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.recent.map((r) => (
                        <tr key={r.id}>
                          <td>{time(r.at)}</td>
                          <td>{r.title || "—"}</td>
                          <td>{r.who}</td>
                          <td>
                            <StatusChip tone={SALE_TONE[r.kind]}>
                              {t(`crm.tools.summary.recent.kind.${r.kind}`)}
                            </StatusChip>
                          </td>
                          <td className="tk-right">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PagePanel>

            <PagePanel title={t("crm.tools.summary.top.title")}>
              {cur && cur.topProducts.length > 0 ? (
                <ol className="msum__list">
                  {cur.topProducts.slice(0, 6).map((p, i) => (
                    <li key={`${p.name}-${i}`} className="msum__list-row">
                      <span className="msum__list-name" title={p.name}>
                        {i + 1}. {p.name}
                      </span>
                      <span className="tk-muted">
                        {t("crm.tools.summary.top.sold", { count: p.qty })}
                      </span>
                      <strong>{money(p.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title={t("crm.tools.summary.top.empty")} />
              )}
            </PagePanel>
          </div>

          <PagePanel
            title={t("crm.tools.summary.lowStock.title")}
            description={t("crm.tools.summary.lowStock.hint")}
            actions={
              !isStartTariff ? (
                <Link
                  className="nur-btn nur-btn--secondary nur-btn--sm"
                  to="/crm/market/procurement/recommendations"
                >
                  {t("crm.tools.summary.lowStock.restock")}
                </Link>
              ) : undefined
            }
          >
            {s.lowStock == null ? (
              <LoadingState rows={2} />
            ) : lowStockEmpty ? (
              <p className="tk-muted">{t("crm.tools.summary.messages.stockOk")}</p>
            ) : (
              <ul className="msum__list">
                {s.lowStock.map((p) => (
                  <li key={p.id} className="msum__list-row">
                    <Link className="msum__list-name" to={`/crm/sklad/${p.id}`} title={p.name}>
                      {p.name}
                    </Link>
                    <strong>{t("crm.tools.summary.lowStock.left", { count: p.qty })}</strong>
                  </li>
                ))}
              </ul>
            )}
          </PagePanel>

          {canViewAbc && (
            <PagePanel
              title={t("crm.tools.summary.abc.title")}
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Segmented
                    label={t("crm.tools.abc.sliceLabel")}
                    options={ABC_SLICES.map((sl) => ({
                      value: sl.id,
                      label: t(`crm.tools.abc.slices.${sl.id}.tab`),
                    }))}
                    value={sliceId}
                    onChange={setSliceId}
                  />
                  <button
                    type="button"
                    className="nur-btn nur-btn--secondary nur-btn--sm"
                    onClick={() => void abc.refresh(false)}
                  >
                    {t("common.refresh")}
                  </button>
                  <Link className="nur-btn nur-btn--primary nur-btn--sm" to="/crm/market/abc">
                    {t("crm.tools.summary.abc.open")}
                  </Link>
                </div>
              }
            >
              <AbcSliceView
                slice={slice}
                result={abc.result}
                loading={abc.loading}
                error={abc.error}
                compact
                onRetry={() => void abc.refresh(true)}
                onOpenProduct={(id) => navigate(`/crm/sklad/${id}`)}
              />
            </PagePanel>
          )}
        </>
      )}
    </PageShell>
  );
}
