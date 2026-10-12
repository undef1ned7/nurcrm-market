import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { PagePanel, EmptyState, LoadingState } from "@shared/ui/page-shell";
import { Banner } from "@shared/ui/tools-kit";
import {
  DEFAULT_LOW_MARGIN_THRESHOLD,
  type PriceCheckFilter,
  type PriceFlag,
} from "@shared/lib/pricing";
import { PRICE_CHECK_FILTERS, PRICE_CHECK_PAGE_SIZE } from "@entities/product";
import { SPEC, readNum } from "./calcUtils";
import { NumField, Tile } from "./calcUi";
import { usePriceCheck } from "./usePriceCheck";

/** Поиск и порог уходят на сервер после паузы в наборе. */
const INPUT_DEBOUNCE_MS = 300;

const FLAG_BAD = new Set<PriceFlag>(["loss", "noMarkup", "negativeStock"]);
const FLAG_TONE: Record<PriceFlag, string> = {
  loss: "calc-pill--bad",
  noMarkup: "calc-pill--bad",
  lowMargin: "calc-pill--warn",
  noCost: "calc-pill--warn",
  negativeStock: "calc-pill--bad",
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * «Проверка цен»: найти на всём складе товары в убыток, с низкой маржой, без закупки, с минусом.
 * Считает сервер (`/main/products/price-check/`): итоги по всему складу, счётчики
 * фильтров и страница строк. `active` — вкладка на экране: автообновление идёт только тогда.
 */
export function CheckTab({ active = true }: { active?: boolean }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [filter, setFilter] = useState<PriceCheckFilter>("all");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(String(DEFAULT_LOW_MARGIN_THRESHOLD));

  const thresholdNum = readNum(threshold, SPEC.percent) ?? DEFAULT_LOW_MARGIN_THRESHOLD;
  const search = useDebounced(query.trim(), INPUT_DEBOUNCE_MS);
  const thresholdDebounced = useDebounced(thresholdNum, INPUT_DEBOUNCE_MS);

  const { data, loading, loadingMore, error, checkedAt, mode, truncated, refresh, loadMore } =
    usePriceCheck({ filter, search, threshold: thresholdDebounced }, active);

  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  // Пока новый ответ в пути, таблица приглушена, а не пропадает
  const stale = loading || search !== query.trim() || thresholdDebounced !== thresholdNum;

  const som = t("common.currencySom");
  const money = (n: number) => `${Math.round(n).toLocaleString(lng)} ${som}`;
  const pct = (n: number | null) =>
    n == null ? "—" : `${n.toLocaleString(lng, { maximumFractionDigits: 1 })} %`;
  const p2 = (n: number) => n.toLocaleString(lng, { maximumFractionDigits: 2 });

  return (
    <div className="tk-stack">
      {error && data && (
        <Banner tone="warning">
          <span>{t("crm.tools.calc.check.loadError")}</span>
        </Banner>
      )}
      {mode === "local" && truncated && (
        <Banner tone="warning">
          <span>
            {t("crm.tools.calc.check.truncated", {
              loaded: truncated.loaded.toLocaleString(lng),
              total: truncated.total != null ? truncated.total.toLocaleString(lng) : "—",
            })}
          </span>
        </Banner>
      )}

      <div className="calc__cards">
        <Tile label={t("crm.tools.calc.check.cards.stockCost")} value={summary ? money(summary.stockAtCost) : "—"} hint={t("crm.tools.calc.check.cards.stockCostHint")} />
        <Tile label={t("crm.tools.calc.check.cards.stockPrice")} value={summary ? money(summary.stockAtPrice) : "—"} hint={t("crm.tools.calc.check.cards.stockPriceHint")} />
        <Tile
          label={t("crm.tools.calc.check.cards.futureProfit")}
          value={summary ? money(summary.futureProfit) : "—"}
          tone={summary && summary.futureProfit < 0 ? "bad" : "good"}
          hint={t("crm.tools.calc.check.cards.onlyCosted")}
        />
        <Tile
          label={t("crm.tools.calc.check.cards.avgMargin")}
          value={pct(summary?.averageMargin ?? null)}
          hint={t("crm.tools.calc.check.cards.onlyCosted")}
        />
      </div>

      <PagePanel
        title={t("crm.tools.calc.check.tableTitle")}
        actions={
          <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} />
            <span className="nur-btn__label">
              {t("crm.tools.calc.check.refresh", {
                time: checkedAt
                  ? checkedAt.toLocaleTimeString(lng, { hour: "2-digit", minute: "2-digit" })
                  : "—",
              })}
            </span>
          </button>
        }
      >
        <div className="tk-stack">
          <div className="calc-chips" role="group" aria-label={t("crm.tools.calc.check.filter")}>
            {PRICE_CHECK_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`calc-chip${filter === f ? " is-active" : ""}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(`crm.tools.calc.check.filters.${f}`)}
                <em>{data ? data.counts[f].toLocaleString(lng) : "…"}</em>
              </button>
            ))}
          </div>
          <div className="calc__row">
            <label className="nur-field calc-field">
              <span className="nur-label">{t("crm.tools.calc.check.search")}</span>
              <input className="nur-input" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <NumField
              label={t("crm.tools.calc.check.threshold")}
              value={threshold}
              onChange={setThreshold}
              suffix="%"
              hint={t("crm.tools.calc.check.thresholdHint")}
              spec={SPEC.percent}
            />
          </div>
          <p className="calc-hint">{t("crm.tools.calc.check.autoRefresh")}</p>

          {data == null ? (
            error ? <EmptyState title={t("crm.tools.calc.check.loadFailed")} /> : <LoadingState rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState title={t("crm.tools.calc.check.empty")} />
          ) : (
            <>
              <div className={`nur-table-wrap${stale ? " calc-stale" : ""}`}>
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
                    {rows.map((r) => (
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
              <div className="calc__more">
                <span className="calc-hint">
                  {t("crm.tools.calc.check.shown", {
                    shown: rows.length.toLocaleString(lng),
                    total: total.toLocaleString(lng),
                  })}
                </span>
                {data.hasNext && (
                  <button
                    type="button"
                    className="nur-btn nur-btn--secondary nur-btn--sm"
                    onClick={() => void loadMore()}
                    disabled={loading || loadingMore}
                    aria-busy={loadingMore}
                  >
                    {t("crm.tools.calc.check.showMore", {
                      count: Math.min(PRICE_CHECK_PAGE_SIZE, Math.max(total - rows.length, 0)),
                    })}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </PagePanel>
    </div>
  );
}
