import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Banner } from "@shared/ui/tools-kit";
import {
  PRICE_ROUND_STEPS,
  TAX_PRESETS,
  analyzePrice,
  priceFromMargin,
  priceFromMarkup,
  roundPriceUp,
} from "@shared/lib/pricing";
import { searchCatalogProducts, type CatalogProduct } from "@entities/product";
import { SPEC, isBad, readNum } from "./calcUtils";
import { ChoiceCard, Hero, NumField, PartsBar, Step, Tile } from "./calcUi";

type Mode = "markup" | "margin" | "check";

/** «Цена и наценка»: рассчитать цену продажи одного товара. */
export function PriceTab() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const som = t("common.currencySom");
  const fmt2 = (n: number) =>
    n.toLocaleString(lng, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n: number) => `${fmt2(n)} ${som}`;

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CatalogProduct | null>(null);

  const [cost, setCost] = useState("");
  const [mode, setMode] = useState<Mode>("markup");
  const [markup, setMarkup] = useState("30");
  const [margin, setMargin] = useState("25");
  const [ownPrice, setOwnPrice] = useState("");
  const [taxPreset, setTaxPreset] = useState<string>("0");
  const [taxCustom, setTaxCustom] = useState("");
  const [roundStep, setRoundStep] = useState("0");
  const [active, setActive] = useState(-1);
  const searchSeq = useRef(0);
  /** Enter нажат (сканер), а ответа поиска ещё нет — выбрать, как только придёт. */
  const enterPending = useRef(false);

  const pick = useCallback(
    (p: CatalogProduct) => {
      enterPending.current = false;
      setPicked(p);
      setQuery(p.name);
      setOpen(false);
      setActive(-1);
      setCost(p.cost > 0 ? String(p.cost) : "");
      setOwnPrice((prev) => (mode === "check" || !prev ? (p.price > 0 ? String(p.price) : "") : prev));
    },
    [mode],
  );

  /** Что выбрать по Enter: точное совпадение штрихкода или единственный товар. */
  const autoPick = (list: CatalogProduct[], q: string) =>
    list.find((p) => p.barcode && p.barcode === q) || (list.length === 1 ? list[0] : null);

  const runSearch = useCallback(
    async (q: string) => {
      const seq = ++searchSeq.current;
      try {
        const list = (await searchCatalogProducts(q)).filter((p) => !p.isService);
        if (seq !== searchSeq.current) return;
        setOptions(list);
        setActive(-1);
        if (enterPending.current) {
          enterPending.current = false;
          const hit = autoPick(list, q);
          if (hit) pick(hit);
        }
      } catch {
        if (seq === searchSeq.current) setOptions([]);
      }
    },
    [pick],
  );

  // Поиск товара по названию или штрихкоду (с задержкой)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (picked && picked.name === query)) {
      searchSeq.current += 1; // ответ на старый запрос больше не нужен
      setOptions([]);
      return undefined;
    }
    const timer = window.setTimeout(() => void runSearch(q), 350);
    return () => window.clearTimeout(timer);
  }, [query, picked, runSearch]);

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return (next + options.length) % options.length;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = query.trim();
      if (active >= 0 && options[active]) {
        pick(options[active]);
        return;
      }
      if (q.length < 2 || (picked && picked.name === query)) return;
      // Сканер: штрихкод и Enter приходят быстрее задержки поиска — ищем сразу.
      enterPending.current = true;
      void runSearch(q);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const taxSpec = SPEC.tax;
  const taxPercent = taxPreset === "custom" ? readNum(taxCustom, taxSpec) : readNum(taxPreset, taxSpec);
  const costNum = readNum(cost, SPEC.money);
  const markupNum = readNum(markup, SPEC.markup);
  const marginNum = readNum(margin, SPEC.margin);
  const ownPriceNum = readNum(ownPrice, SPEC.money);

  // Есть ли ошибка в полях, которые участвуют в текущем расчёте
  const hasErrors =
    isBad(cost, SPEC.money) ||
    (taxPreset === "custom" && isBad(taxCustom, taxSpec)) ||
    (mode === "markup" && isBad(markup, SPEC.markup)) ||
    (mode === "margin" && isBad(margin, SPEC.margin)) ||
    (mode === "check" && isBad(ownPrice, SPEC.money));

  let rawPrice: number | null = null;
  let marginInvalid = false;
  if (costNum !== null && taxPercent !== null) {
    if (mode === "markup") rawPrice = markupNum === null ? null : priceFromMarkup(costNum, markupNum);
    else if (mode === "margin") {
      rawPrice = marginNum === null ? null : priceFromMargin(costNum, marginNum, taxPercent);
      marginInvalid = marginNum !== null && rawPrice == null && marginNum + taxPercent >= 100;
    } else rawPrice = ownPriceNum;
  }

  const step = readNum(roundStep) ?? 0;
  const price = rawPrice == null ? null : mode === "check" ? rawPrice : roundPriceUp(rawPrice, step);
  const analysis =
    !hasErrors && price != null && price > 0 && costNum !== null && costNum > 0
      ? analyzePrice(costNum, price, taxPercent ?? 0)
      : null;
  const current =
    picked && picked.price > 0 && costNum !== null && costNum > 0
      ? analyzePrice(costNum, picked.price, taxPercent ?? 0)
      : null;
  const taxApplied = (taxPercent ?? 0) > 0;
  const showRaw = mode !== "check" && step > 0 && rawPrice != null && price !== rawPrice;
  const pct1 = (n: number) => n.toLocaleString(lng, { maximumFractionDigits: 1 });

  return (
    <div className="calc__layout">
      <div className="calc__form">
        <Step n={1} title={t("crm.tools.calc.price.step1")} note={t("crm.tools.calc.price.step1Note")}>
          <div className="nur-field calc__search calc-field">
            <label className="nur-label" htmlFor="calc-product">
              {t("crm.tools.calc.price.product")}
            </label>
            <input
              id="calc-product"
              className="nur-input"
              value={query}
              placeholder={t("crm.tools.calc.price.productPlaceholder")}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls="calc-product-list"
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `calc-product-opt-${active}` : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setOpen(true);
                setActive(-1);
                enterPending.current = false;
              }}
              onKeyDown={onSearchKey}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            />
            {open && options.length > 0 && (
              <ul className="calc__dropdown" role="listbox" id="calc-product-list">
                {options.map((p, i) => (
                  <li key={p.id} id={`calc-product-opt-${i}`} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={`calc__option${i === active ? " is-active" : ""}`}
                      onMouseDown={() => pick(p)}
                    >
                      <span>{p.name}</span>
                      <span className="tk-muted">
                        {p.cost > 0 ? `${p.cost} → ` : ""}
                        {p.price} {som}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {picked ? (
              <span className="calc-hint">
                {t("crm.tools.calc.price.pickedPrice", { price: money(picked.price) })}
                {picked.cost <= 0 && ` ${t("crm.tools.calc.price.pickedNoCost")}`}
              </span>
            ) : (
              <span className="calc-hint">{t("crm.tools.calc.price.productHint")}</span>
            )}
          </div>
        </Step>

        <Step n={2} title={t("crm.tools.calc.price.step2")} note={t("crm.tools.calc.price.step2Note")}>
          <NumField
            id="calc-cost"
            label={t("crm.tools.calc.price.cost")}
            value={cost}
            onChange={setCost}
            suffix={som}
            placeholder="0"
            spec={SPEC.money}
          />
        </Step>

        <Step n={3} title={t("crm.tools.calc.price.step3")} note={t("crm.tools.calc.price.step3Note")}>
          <div className="calc-choices" role="radiogroup" aria-label={t("crm.tools.calc.price.howTitle")}>
            <ChoiceCard
              active={mode === "markup"}
              title={t("crm.tools.calc.price.modeMarkup")}
              text={t("crm.tools.calc.price.modeMarkupHint")}
              onClick={() => setMode("markup")}
            />
            <ChoiceCard
              active={mode === "margin"}
              title={t("crm.tools.calc.price.modeMargin")}
              text={t("crm.tools.calc.price.modeMarginHint")}
              onClick={() => setMode("margin")}
            />
            <ChoiceCard
              active={mode === "check"}
              title={t("crm.tools.calc.price.modeCheck")}
              text={t("crm.tools.calc.price.modeCheckHint")}
              onClick={() => setMode("check")}
            />
          </div>
          {mode === "markup" && (
            <NumField label={t("crm.tools.calc.price.markup")} value={markup} onChange={setMarkup} suffix="%" hint={t("crm.tools.calc.price.markupHint")} spec={SPEC.markup} />
          )}
          {mode === "margin" && (
            <NumField label={t("crm.tools.calc.price.margin")} value={margin} onChange={setMargin} suffix="%" hint={t("crm.tools.calc.price.marginHint")} spec={SPEC.margin} />
          )}
          {mode === "check" && (
            <NumField label={t("crm.tools.calc.price.ownPrice")} value={ownPrice} onChange={setOwnPrice} suffix={som} spec={SPEC.money} />
          )}
        </Step>

        <Step n={4} title={t("crm.tools.calc.price.step4")} note={t("crm.tools.calc.price.step4Note")}>
          <div className="calc__row">
            <div className="nur-field calc-field">
              <label className="nur-label" htmlFor="calc-tax">{t("crm.tools.calc.price.tax")}</label>
              <select id="calc-tax" className="nur-select" value={taxPreset} onChange={(e) => setTaxPreset(e.target.value)}>
                {TAX_PRESETS.map((p) => (
                  <option key={p} value={String(p)}>{String(p).replace(".", ",")} %</option>
                ))}
                <option value="custom">{t("crm.tools.calc.price.taxCustom")}</option>
              </select>
              {taxPreset === "custom" && (
                <NumField label={t("crm.tools.calc.price.taxCustom")} value={taxCustom} onChange={setTaxCustom} suffix="%" spec={SPEC.tax} />
              )}
            </div>
            {mode !== "check" && (
              <div className="nur-field calc-field">
                <label className="nur-label" htmlFor="calc-round">{t("crm.tools.calc.price.round")}</label>
                <select id="calc-round" className="nur-select" value={roundStep} onChange={(e) => setRoundStep(e.target.value)}>
                  {PRICE_ROUND_STEPS.map((s) => (
                    <option key={s} value={String(s)}>
                      {s === 0 ? t("crm.tools.calc.price.roundNone") : `${s} ${som}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="calc-hint">{t("crm.tools.calc.price.taxReference")}</p>
        </Step>
      </div>

      <aside className="calc__aside" aria-label={t("crm.tools.calc.price.result")}>
        {marginInvalid && <Banner tone="danger">{t("crm.tools.calc.price.warnMargin100")}</Banner>}
        {analysis?.isLoss && <Banner tone="danger">{t("crm.tools.calc.price.warnLoss")}</Banner>}

        {analysis ? (
          <>
            <Hero
              label={t("crm.tools.calc.price.sellPrice")}
              value={money(analysis.price)}
              tone={analysis.isLoss ? "bad" : "default"}
              sub={showRaw ? t("crm.tools.calc.price.beforeRoundSub", { value: money(rawPrice!) }) : undefined}
            />
            <p className={`calc__plain${analysis.isLoss ? " calc__plain--bad" : ""}`}>
              {analysis.isLoss
                ? t("crm.tools.calc.price.plainLoss", { loss: money(Math.abs(analysis.profit)) })
                : t("crm.tools.calc.price.plain", {
                    profit: money(analysis.profit),
                    per100: pct1(analysis.price > 0 ? (analysis.profit / analysis.price) * 100 : 0),
                  })}
            </p>
            <div className="nur-page__panel" style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{t("crm.tools.calc.price.breakdown")}</h3>
              <PartsBar
                format={money}
                parts={[
                  { key: "cost", label: t("crm.tools.calc.price.partCost"), value: analysis.cost, className: "is-cost" },
                  { key: "tax", label: t("crm.tools.calc.price.partTax"), value: analysis.tax, className: "is-tax" },
                  {
                    key: "profit",
                    label: analysis.isLoss ? t("crm.tools.calc.price.partLoss") : t("crm.tools.calc.price.partProfit"),
                    value: Math.abs(analysis.profit),
                    className: analysis.isLoss ? "is-loss" : "is-profit",
                  },
                ]}
              />
            </div>
            <div className="calc__tiles">
              <Tile
                label={t("crm.tools.calc.price.profitUnit")}
                value={money(analysis.profit)}
                tone={analysis.isLoss ? "bad" : "good"}
              />
              <Tile label={t("crm.tools.calc.price.taxUnit")} value={money(analysis.tax)} />
              <Tile
                label={t("crm.tools.calc.price.markupResult")}
                value={analysis.markup == null ? "—" : `${pct1(analysis.markup)} %`}
                hint={t("crm.tools.calc.price.markupExplain")}
              />
              <Tile
                label={t("crm.tools.calc.price.marginResult")}
                value={analysis.netMargin == null ? "—" : `${pct1(analysis.netMargin)} %`}
                hint={
                  taxApplied
                    ? t("crm.tools.calc.price.marginExplainNet")
                    : t("crm.tools.calc.price.marginExplain")
                }
              />
            </div>
            {picked && current && (
              <p className="calc-hint">
                {t("crm.tools.calc.price.currentPrice", {
                  price: fmt2(picked.price),
                  markup: current.markup == null ? "—" : fmt2(current.markup),
                  margin: current.netMargin == null ? "—" : fmt2(current.netMargin),
                })}
              </p>
            )}
          </>
        ) : (
          <div className="calc__plain">
            {hasErrors
              ? t("crm.tools.calc.fixErrors")
              : costNum === null || costNum <= 0
                ? t("crm.tools.calc.price.fillIn")
                : t("crm.tools.calc.price.fillMode")}
          </div>
        )}
        <p className="calc__formula">{t("crm.tools.calc.price.formula")}</p>
        <p className="calc-hint">{t("crm.tools.calc.readOnly")}</p>
      </aside>
    </div>
  );
}
