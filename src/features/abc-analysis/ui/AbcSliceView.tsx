import "./abc.scss";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Doughnut } from "react-chartjs-2";
import "@shared/lib/chartSetup";
import { ABC_CLASSES, type AbcClass } from "@shared/lib/abc";
import { formatInteger } from "@shared/lib/i18n/format";
import { Banner } from "@shared/ui/tools-kit";
import { EmptyState, LoadingState } from "@shared/ui/page-shell";
import type { AbcSliceResult } from "../api/loadAbcSlice";
import type { AbcSliceDef } from "../model/slices";

export const ABC_CLASS_COLORS: Record<AbcClass, string> = {
  A: "#10b981",
  B: "#f59e0b",
  C: "#94a3b8",
};

const PAGE = 20;

type Props = {
  slice: AbcSliceDef;
  result: AbcSliceResult | null;
  loading: boolean;
  error: string | null;
  /** Компактный вид для «Сводки»: без полосы и поиска, ограниченный список. */
  compact?: boolean;
  compactLimit?: number;
  onRetry?: () => void;
  onOpenProduct?: (id: string | number) => void;
};

export function AbcSliceView({
  slice,
  result,
  loading,
  error,
  compact = false,
  compactLimit = 8,
  onRetry,
  onOpenProduct,
}: Props) {
  const { t, i18n } = useTranslation();
  const som = t("common.currencySom");
  const pcs = t("crm.tools.abc.pcs");
  const fmt = (n: number) => formatInteger(n, i18n.language);
  const fmtQty = (n: number) => n.toLocaleString(i18n.language, { maximumFractionDigits: 3 });
  const fmtShare = (v: number) =>
    `${v.toLocaleString(i18n.language, { maximumFractionDigits: v > 0 && v < 0.1 ? 3 : 1 })} %`;
  const fmtValue = (v: number) =>
    slice.unit === "qty" ? `${fmtQty(v)} ${pcs}` : `${fmt(v)} ${som}`;

  const [filter, setFilter] = useState<"all" | AbcClass>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  // При смене среза или фильтра начинаем список сначала
  useEffect(() => {
    setLimit(PAGE);
  }, [slice.id, filter, query]);
  useEffect(() => {
    setFilter("all");
    setQuery("");
  }, [slice.id]);

  const rows = result?.rows ?? [];
  const filtered = useMemo(() => {
    if (compact) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => (filter === "all" || r.abcClass === filter) && (!q || r.name.toLowerCase().includes(q)),
    );
  }, [rows, compact, filter, query]);
  const maxShare = useMemo(() => rows.reduce((m, r) => Math.max(m, r.share), 0), [rows]);
  const visibleRows = compact ? filtered.slice(0, compactLimit) : filtered.slice(0, limit);

  if (error && !result) {
    return (
      <Banner tone="danger">
        <span>
          {error === "forbidden" ? t("crm.tools.abc.errorForbidden") : t("crm.tools.abc.errorLoad")}
        </span>
        {onRetry && (
          <button type="button" className="nur-btn nur-btn--sm nur-btn--secondary" onClick={onRetry}>
            {t("common.retry")}
          </button>
        )}
      </Banner>
    );
  }
  if (!result) return loading ? <LoadingState rows={4} /> : null;

  const summary = result.summary;
  const total = rows.length;
  const nameHeader = t(`crm.tools.abc.nameHeader.${slice.by ?? "product"}`);
  const insight =
    summary.A.count > 0
      ? t("crm.tools.abc.insight", {
          countA: fmt(summary.A.count),
          total: fmt(total),
          pctItems: Math.round((summary.A.count / total) * 100),
          shareA: Math.round(summary.A.share),
        })
      : null;

  return (
    <div className="abc tk-stack">
      {slice.needsCost && (
        <p className="tk-muted">
          {result.excludedNoCost > 0
            ? t("crm.tools.abc.noCostExcluded", { count: result.excludedNoCost })
            : t("crm.tools.abc.noCostNote")}
        </p>
      )}
      {error && <Banner tone="warning">{t("crm.tools.abc.staleNote")}</Banner>}

      {rows.length === 0 ? (
        <EmptyState
          title={t("crm.tools.abc.emptyTitle")}
          text={t(slice.snapshot || slice.needsCost ? "crm.tools.abc.emptyTextCost" : "crm.tools.abc.emptyText")}
        />
      ) : (
        <>
          {!compact && (
            <div className="abc__overview">
              <div className="abc__chart">
                <Doughnut
                  data={{
                    labels: ABC_CLASSES.map((c) => t(`crm.tools.abc.class${c}`)),
                    datasets: [
                      {
                        data: ABC_CLASSES.map((c) => Number(summary[c].share.toFixed(2))),
                        backgroundColor: ABC_CLASSES.map((c) => ABC_CLASS_COLORS[c]),
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "62%",
                    plugins: {
                      legend: { display: true, position: "bottom" },
                      tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.parsed} %` } },
                    },
                  }}
                />
              </div>
              <div className="tk-stack">
                {insight && <p className="abc__insight">{insight}</p>}
                <div className="abc__split">
                  <span className="abc__split-title">{t("crm.tools.abc.splitTitle")}</span>
                  <div
                    className="abc__split-bar"
                    role="img"
                    aria-label={ABC_CLASSES.map((c) => `${c}: ${fmtShare(summary[c].share)}`).join(", ")}
                  >
                    {ABC_CLASSES.map((c) => (
                      <span
                        key={c}
                        className={`abc__split-seg abc__split-seg--${c.toLowerCase()}`}
                        style={{ width: `${summary[c].share}%` }}
                        title={`${c}: ${fmtShare(summary[c].share)}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="abc__cards">
            {ABC_CLASSES.map((c) => (
              <div key={c} className={`abc__card abc__card--${c.toLowerCase()}`}>
                <div className="abc__card-head">
                  <span className={`abc__badge abc__badge--${c.toLowerCase()}`}>{c}</span>
                  {t(`crm.tools.abc.class${c}`)}
                </div>
                <div className="abc__card-value">
                  {fmt(summary[c].count)}
                  <small>{t("crm.tools.abc.positions")}</small>
                </div>
                <div className="abc__card-sub">
                  {t("crm.tools.abc.cardSub", { share: fmtShare(summary[c].share), value: fmtValue(summary[c].value) })}
                </div>
                {!compact && <p className="abc__card-action">{t(`crm.tools.abc.action.${c}`)}</p>}
              </div>
            ))}
          </div>

          {!compact && (
            <div className="abc__toolbar">
              <div className="abc__chips" role="group" aria-label={t("crm.tools.abc.class")}>
                {(["all", ...ABC_CLASSES] as Array<"all" | AbcClass>).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`abc__chip${filter === c ? " is-active" : ""}`}
                    aria-pressed={filter === c}
                    onClick={() => setFilter(c)}
                  >
                    {c === "all" ? t("common.all") : c}
                    <em>{c === "all" ? total : summary[c].count}</em>
                  </button>
                ))}
              </div>
              <input
                type="search"
                className="nur-input abc__search"
                value={query}
                placeholder={t("crm.tools.abc.searchPlaceholder")}
                aria-label={t("crm.tools.abc.searchPlaceholder")}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState title={t("common.nothingFound")} />
          ) : (
            <div className="nur-table-wrap">
              <table className="nur-table nur-table--dense">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("crm.tools.abc.class")}</th>
                    <th>{nameHeader}</th>
                    <th className="tk-right">{t(`crm.tools.abc.slices.${slice.id}.measure`)}</th>
                    <th className="tk-right">{t("crm.tools.abc.share")}</th>
                    {!compact && <th className="tk-right">{t("crm.tools.abc.cumShare")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const clickable = !!(slice.linksToProduct && r.id != null && onOpenProduct);
                    const rank = rows.indexOf(r) + 1;
                    return (
                      <tr
                        key={r.key}
                        className={clickable ? "abc__row-link" : undefined}
                        onClick={clickable ? () => onOpenProduct!(r.id as string | number) : undefined}
                        title={clickable ? t("crm.tools.abc.openProduct") : undefined}
                      >
                        <td className="abc__rank">{rank}</td>
                        <td>
                          <span className={`abc__badge abc__badge--${r.abcClass.toLowerCase()}`}>{r.abcClass}</span>
                        </td>
                        <td className="abc__name" title={r.name}>{r.name}</td>
                        <td className="tk-right">{fmtValue(r.value)}</td>
                        <td className="tk-right">
                          <div className="abc__share">
                            <span>{fmtShare(r.share)}</span>
                            <div className="abc__share-bar" aria-hidden>
                              <span
                                className={`is-${r.abcClass.toLowerCase()}`}
                                style={{ width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {!compact && <td className="tk-right">{fmtShare(r.cumShare)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {compact && rows.length > compactLimit && (
            <p className="tk-muted">{t("crm.tools.abc.moreRows", { count: rows.length - compactLimit })}</p>
          )}
          {!compact && filtered.length > 0 && (
            <div className="abc__more">
              <span className="tk-muted">
                {t("crm.tools.abc.shown", { shown: Math.min(limit, filtered.length), total: filtered.length })}
              </span>
              {limit < filtered.length && (
                <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={() => setLimit((l) => l + PAGE)}>
                  {t("crm.tools.abc.showMore", { count: Math.min(PAGE, filtered.length - limit) })}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
