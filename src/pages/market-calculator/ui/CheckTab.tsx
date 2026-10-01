import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { PagePanel, EmptyState, LoadingState } from "@shared/ui/page-shell";
import { Banner } from "@shared/ui/tools-kit";
import {
  DEFAULT_LOW_MARGIN_THRESHOLD,
  checkCatalogPrices,
  filterPriceRows,
  type PriceCheckFilter,
  type PriceFlag,
} from "@shared/lib/pricing";
import { fetchCatalogSnapshot, type CatalogProduct } from "@entities/product";
import { parseNum } from "./calcUtils";
import { Tile } from "./calcUi";

/** Список обновляется сам: при входе, после синхронизации каталога (раз в 2 минуты) и по кнопке. */
const REFRESH_MS = 120_000;

const FLAG_BAD = new Set<PriceFlag>(["loss", "noMarkup", "negativeStock"]);
const FILTERS: PriceCheckFilter[] = ["all", "loss", "lowMargin", "noCost", "negativeStock"];
const FLAG_TONE: Record<PriceFlag, string> = {
  loss: "calc-pill--bad",
  noMarkup: "calc-pill--bad",
  lowMargin: "calc-pill--warn",
  noCost: "calc-pill--warn",
  negativeStock: "calc-pill--bad",
};

/** «Проверка цен»: найти на всём складе товары в убыток, с низкой маржой, без закупки, с минусом. */
export function CheckTab() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<PriceCheckFilter>("all");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(String(DEFAULT_LOW_MARGIN_THRESHOLD));

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setCatalog(await fetchCatalogSnapshot());
      setUpdatedAt(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const { rows, summary } = useMemo(
    () =>
      checkCatalogPrices(
        (catalog ?? []).filter((p) => !p.isService),
        parseNum(threshold),
      ),
    [catalog, threshold],
  );
  const visible = useMemo(() => filterPriceRows(rows, filter, query), [rows, filter, query]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f, filterPriceRows(rows, f, query).length]),
      ) as Record<PriceCheckFilter, number>,
    [rows, query],
  );

  const som = t("common.currencySom");
  const money = (n: number) => `${Math.round(n).toLocaleString(lng)} ${som}`;
  const pct = (n: number | null) =>
    n == null ? "—" : `${n.toLocaleString(lng, { maximumFractionDigits: 1 })} %`;
  const p2 = (n: number) => n.toLocaleString(lng, { maximumFractionDigits: 2 });

  return (
    <div className="tk-stack">
      {error && (
        <Banner tone="warning">
          <span>{t("crm.tools.calc.check.loadError")}</span>
        </Banner>
      )}

      <div className="calc__cards">
        <Tile label={t("crm.tools.calc.check.cards.stockCost")} value={money(summary.stockAtCost)} hint={t("crm.tools.calc.check.cards.stockCostHint")} />
        <Tile label={t("crm.tools.calc.check.cards.stockPrice")} value={money(summary.stockAtPrice)} hint={t("crm.tools.calc.check.cards.stockPriceHint")} />
        <Tile
          label={t("crm.tools.calc.check.cards.futureProfit")}
          value={money(summary.futureProfit)}
          tone={summary.futureProfit < 0 ? "bad" : "good"}
          hint={t("crm.tools.calc.check.cards.onlyCosted")}
        />
        <Tile
          label={t("crm.tools.calc.check.cards.avgMargin")}
          value={pct(summary.averageMargin)}
          hint={t("crm.tools.calc.check.cards.onlyCosted")}
        />
      </div>

      <PagePanel
        title={t("crm.tools.calc.check.tableTitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} />
            <span className="nur-btn__label">
              {t("crm.tools.calc.check.refresh", {
                time: updatedAt
                  ? updatedAt.toLocaleTimeString(lng, { hour: "2-digit", minute: "2-digit" })
                  : "—",
              })}
            </span>
          </button>
        }
      >
        <div className="tk-stack">
          <div className="calc-chips" role="group" aria-label={t("crm.tools.calc.check.filter")}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`calc-chip${filter === f ? " is-active" : ""}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(`crm.tools.calc.check.filters.${f}`)}
                <em>{counts[f]}</em>
              </button>
            ))}
          </div>
          <div className="calc__row">
            <label className="nur-field calc-field">
              <span className="nur-label">{t("crm.tools.calc.check.search")}</span>
              <input className="nur-input" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="nur-field calc-field">
              <span className="nur-label">{t("crm.tools.calc.check.threshold")}</span>
              <div className="calc-input">
                <input className="nur-input" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                <span className="calc-input__suffix">%</span>
              </div>
              <span className="calc-hint">{t("crm.tools.calc.check.thresholdHint")}</span>
            </label>
          </div>
          <p className="calc-hint">{t("crm.tools.calc.check.autoRefresh")}</p>

          {catalog == null ? (
            <LoadingState rows={4} />
          ) : visible.length === 0 ? (
            <EmptyState title={t("crm.tools.calc.check.empty")} />
          ) : (
            <div className="nur-table-wrap">
              <table className="nur-table nur-table--dense">
                <thead>
                  <tr>
                    <th>{t("crm.tools.calc.check.cols.name")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.cost")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.price")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.markup")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.margin")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.qty")}</th>
                    <th className="tk-right">{t("crm.tools.calc.check.cols.stockProfit")}</th>
                    <th>{t("crm.tools.calc.check.cols.attention")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className={r.flags.some((f) => FLAG_BAD.has(f)) ? "calc-row--bad" : undefined}>
                      <td>{r.name}</td>
                      <td className="tk-right">{r.cost > 0 ? p2(r.cost) : "—"}</td>
                      <td className="tk-right">{p2(r.price)}</td>
                      <td className="tk-right">{pct(r.markup)}</td>
                      <td className="tk-right">{pct(r.margin)}</td>
                      <td className="tk-right">{p2(r.qty)}</td>
                      <td className="tk-right">{r.stockProfit == null ? "—" : p2(r.stockProfit)}</td>
                      <td>
                        <div className="calc__flags">
                          {r.flags.map((f) => (
                            <span key={f} className={`calc-pill ${FLAG_TONE[f]}`}>{t(`crm.tools.calc.check.flags.${f}`)}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PagePanel>
    </div>
  );
}
