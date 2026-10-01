import { useEffect, useRef, useState } from "react";
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
import { parseNum } from "./calcUtils";
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
  const searchSeq = useRef(0);

  // Поиск товара по названию или штрихкоду (с задержкой)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (picked && picked.name === query)) {
      setOptions([]);
      return undefined;
    }
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const list = await searchCatalogProducts(q);
        if (seq === searchSeq.current) setOptions(list.filter((p) => !p.isService));
      } catch {
        if (seq === searchSeq.current) setOptions([]);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, picked]);

  const pick = (p: CatalogProduct) => {
    setPicked(p);
    setQuery(p.name);
    setOpen(false);
    setCost(p.cost > 0 ? String(p.cost) : "");
    if (mode === "check" || !ownPrice) setOwnPrice(p.price > 0 ? String(p.price) : "");
  };

  const taxPercent = taxPreset === "custom" ? parseNum(taxCustom) : parseNum(taxPreset);
  const costNum = parseNum(cost);

  let rawPrice: number | null = null;
  let marginInvalid = false;
  if (mode === "markup") rawPrice = priceFromMarkup(costNum, parseNum(markup));
  else if (mode === "margin") {
    rawPrice = priceFromMargin(costNum, parseNum(margin), taxPercent);
    marginInvalid = rawPrice == null && parseNum(margin) + taxPercent >= 100;
  } else rawPrice = parseNum(ownPrice);

  const step = parseNum(roundStep);
  const price = rawPrice == null ? null : mode === "check" ? rawPrice : roundPriceUp(rawPrice, step);
  const analysis = price != null && price > 0 && costNum > 0 ? analyzePrice(costNum, price, taxPercent) : null;
  const current = picked && picked.price > 0 && costNum > 0 ? analyzePrice(costNum, picked.price, taxPercent) : null;
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            />
            {open && options.length > 0 && (
              <ul className="calc__dropdown" role="listbox">
                {options.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="calc__option" onMouseDown={() => pick(p)}>
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
            <span className="calc-hint">{t("crm.tools.calc.price.productHint")}</span>
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
            <NumField label={t("crm.tools.calc.price.markup")} value={markup} onChange={setMarkup} suffix="%" hint={t("crm.tools.calc.price.markupHint")} />
          )}
          {mode === "margin" && (
            <NumField label={t("crm.tools.calc.price.margin")} value={margin} onChange={setMargin} suffix="%" hint={t("crm.tools.calc.price.marginHint")} />
          )}
          {mode === "check" && (
            <NumField label={t("crm.tools.calc.price.ownPrice")} value={ownPrice} onChange={setOwnPrice} suffix={som} />
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
                <NumField label={t("crm.tools.calc.price.taxCustom")} value={taxCustom} onChange={setTaxCustom} suffix="%" />
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
                value={analysis.margin == null ? "—" : `${pct1(analysis.margin)} %`}
                hint={t("crm.tools.calc.price.marginExplain")}
              />
            </div>
            {picked && current && (
              <p className="calc-hint">
                {t("crm.tools.calc.price.currentPrice", {
                  price: fmt2(picked.price),
                  markup: current.markup == null ? "—" : fmt2(current.markup),
                  margin: current.margin == null ? "—" : fmt2(current.margin),
                })}
              </p>
            )}
          </>
        ) : (
          <div className="calc__plain">{t("crm.tools.calc.price.fillIn")}</div>
        )}
        <p className="calc__formula">{t("crm.tools.calc.price.formula")}</p>
        <p className="calc-hint">{t("crm.tools.calc.readOnly")}</p>
      </aside>
    </div>
  );
}
