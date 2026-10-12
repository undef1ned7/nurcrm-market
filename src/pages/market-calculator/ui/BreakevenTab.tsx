import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banner } from "@shared/ui/tools-kit";
import { calcRevenueForProfit } from "@shared/lib/pricing";
import { formatPeriodForApi, resolvePeriod, startOfDay } from "@shared/lib/period";
import { fetchMarketAnalytics } from "@entities/analytics";
import { SPEC, isBad, readNum } from "./calcUtils";
import { Hero, NumField, Progress, Step, Tile } from "./calcUi";

const STORAGE_KEY = "market_calc_breakeven";

const FIELDS = ["rent", "salary", "utilities", "other", "margin", "avgCheck", "tax", "days", "target"] as const;

/** Сохранённые поля: только строки (старые версии или чужой код могли записать числа/объекты). */
const load = (): Partial<Record<(typeof FIELDS)[number], string>> => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Partial<Record<(typeof FIELDS)[number], string>> = {};
    FIELDS.forEach((k) => {
      const v = raw[k];
      if (typeof v === "string") out[k] = v;
      else if (typeof v === "number" && Number.isFinite(v)) out[k] = String(v);
    });
    return out;
  } catch {
    return {};
  }
};

/** «Безубыточность и цель»: сколько продавать в месяц и в день. */
export function BreakevenTab() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const som = t("common.currencySom");
  const saved = useMemo(load, []);

  const [rent, setRent] = useState<string>(saved.rent ?? "");
  const [salary, setSalary] = useState<string>(saved.salary ?? "");
  const [utilities, setUtilities] = useState<string>(saved.utilities ?? "");
  const [other, setOther] = useState<string>(saved.other ?? "");
  const [margin, setMargin] = useState<string>(saved.margin ?? "");
  const [avgCheck, setAvgCheck] = useState<string>(saved.avgCheck ?? "");
  const [tax, setTax] = useState<string>(saved.tax ?? "0");
  const [days, setDays] = useState<string>(saved.days ?? "26");
  const [target, setTarget] = useState<string>(saved.target ?? "");
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<"offline" | "empty" | null>(null);
  /** Маржа за 30 дней оказалась отрицательной (продажи в убыток) — показываем, а не прячем. */
  const [negativeMargin, setNegativeMargin] = useState<number | null>(null);
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthError, setMonthError] = useState(false);

  const persist = (patch: Record<string, string>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rent, salary, utilities, other, margin, avgCheck, tax, days, target, ...patch }),
      );
    } catch {
      /* ignore */
    }
  };
  const money = (v: string) => readNum(v, SPEC.money) ?? 0;
  const fixed = money(rent) + money(salary) + money(utilities) + money(other);
  const hasErrors =
    [rent, salary, utilities, other, avgCheck, target].some((v) => isBad(v, SPEC.money)) ||
    isBad(margin, SPEC.percent) ||
    isBad(tax, SPEC.tax) ||
    isBad(days, SPEC.days);
  const marginNum = readNum(margin, SPEC.percent);
  const taxNum = readNum(tax, SPEC.tax) ?? 0;
  const daysNum = readNum(days, SPEC.days);
  const avgNum = readNum(avgCheck, SPEC.money) ?? 0;
  const targetNum = readNum(target, SPEC.money);
  // Без рабочих дней «в день» не посчитать — не показываем «0 сом в день».
  const canCalc = !hasErrors && marginNum !== null && daysNum !== null;
  const breakeven = canCalc ? calcRevenueForProfit(fixed, marginNum, taxNum, daysNum, avgNum) : null;
  const goal =
    canCalc && targetNum !== null
      ? calcRevenueForProfit(fixed, marginNum, taxNum, daysNum, avgNum, targetNum)
      : null;
  const marginInvalid = canCalc && breakeven == null;

  const fmt = (n: number) => Math.round(n).toLocaleString(lng);
  const fmt1 = (n: number) => n.toLocaleString(lng, { maximumFractionDigits: 1 });

  // Реальные продажи за 30 дней: маржа и средний чек
  const pullFromSales = useCallback(async () => {
    setPulling(true);
    setPullError(null);
    setNegativeMargin(null);
    try {
      const now = new Date();
      const from = startOfDay(new Date(now.getTime() - 29 * 86400000));
      const data = await fetchMarketAnalytics({
        tab: "sales",
        period_start: formatPeriodForApi(from),
        period_end: formatPeriodForApi(resolvePeriod("today").to),
      });
      const cards = data?.cards ?? {};
      const revenue = Number(cards.revenue) || 0;
      const gross = Number(cards.gross_profit_total ?? cards.gross_profit);
      const marginPct =
        cards.margin_percent_total != null
          ? Number(cards.margin_percent_total)
          : revenue > 0 && Number.isFinite(gross)
            ? (gross / revenue) * 100
            : NaN;
      const avg = Number(cards.avg_check);
      // Берём только правдоподобные значения: маржа 0–100 %, средний чек > 0.
      // Бэк подтвердил (08.10.2026): маржа бывает отрицательной при продажах в убыток —
      // её не подставляем (безубыточность при ней невозможна), но сообщаем.
      const marginOk = Number.isFinite(marginPct) && marginPct >= 0 && marginPct <= 100;
      const marginNegative = Number.isFinite(marginPct) && marginPct < 0 && marginPct >= -1000;
      const avgOk = Number.isFinite(avg) && avg > 0;
      if (marginNegative) setNegativeMargin(Math.round(marginPct * 10) / 10);
      if (!marginOk && !avgOk && !marginNegative) {
        setPullError("empty");
        return;
      }
      const patch: Record<string, string> = {};
      if (marginOk) patch.margin = String(Math.round(marginPct * 10) / 10).replace(".", ",");
      if (avgOk) patch.avgCheck = String(Math.round(avg));
      if (patch.margin) setMargin(patch.margin);
      if (patch.avgCheck) setAvgCheck(patch.avgCheck);
      persist(patch);
    } catch {
      setPullError("offline");
    } finally {
      setPulling(false);
    }
  }, [rent, salary, utilities, other, margin, avgCheck, tax, days, target]);

  // «Этот месяц по факту»: выручка с 1-го числа
  const loadMonth = useCallback(async () => {
    setMonthError(false);
    try {
      const p = resolvePeriod("month");
      const data = await fetchMarketAnalytics({
        tab: "sales",
        period_start: formatPeriodForApi(p.from),
        period_end: formatPeriodForApi(p.to),
      });
      setMonthRevenue(Number(data?.cards?.revenue) || 0);
    } catch {
      setMonthError(true);
    }
  }, []);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const progress = (value: number | undefined) =>
    monthRevenue != null && value && value > 0 ? Math.min((monthRevenue / value) * 100, 999) : null;

  const ready = breakeven != null;

  return (
    <div className="calc__layout">
      <div className="calc__form">
        <Step n={1} title={t("crm.tools.calc.breakeven.step1")} note={t("crm.tools.calc.breakeven.step1Note")}>
          <div className="calc__row">
            <NumField label={t("crm.tools.calc.breakeven.rent")} value={rent} onChange={(v) => { setRent(v); persist({ rent: v }); }} suffix={som} spec={SPEC.money} />
            <NumField label={t("crm.tools.calc.breakeven.salary")} value={salary} onChange={(v) => { setSalary(v); persist({ salary: v }); }} suffix={som} spec={SPEC.money} />
            <NumField label={t("crm.tools.calc.breakeven.utilities")} value={utilities} onChange={(v) => { setUtilities(v); persist({ utilities: v }); }} suffix={som} spec={SPEC.money} />
            <NumField label={t("crm.tools.calc.breakeven.other")} value={other} onChange={(v) => { setOther(v); persist({ other: v }); }} suffix={som} spec={SPEC.money} hint={t("crm.tools.calc.breakeven.otherHint")} />
          </div>
          <p className="calc__plain">{t("crm.tools.calc.breakeven.fixedTotal", { sum: `${fmt(fixed)} ${som}` })}</p>
        </Step>

        <Step n={2} title={t("crm.tools.calc.breakeven.step2")} note={t("crm.tools.calc.breakeven.step2Note")}>
          <button type="button" className="nur-btn nur-btn--secondary" onClick={() => void pullFromSales()} disabled={pulling}>
            {pulling ? t("common.loading") : t("crm.tools.calc.breakeven.pull")}
          </button>
          {pullError === "offline" && <Banner tone="warning">{t("crm.tools.calc.breakeven.offline")}</Banner>}
          {pullError === "empty" && <Banner tone="warning">{t("crm.tools.calc.breakeven.noSales")}</Banner>}
          {negativeMargin != null && (
            <Banner tone="danger">{t("crm.tools.calc.breakeven.negativeMargin", { margin: fmt1(negativeMargin) })}</Banner>
          )}
          <div className="calc__row">
            <NumField label={t("crm.tools.calc.breakeven.margin")} value={margin} onChange={(v) => { setMargin(v); persist({ margin: v }); }} suffix="%" hint={t("crm.tools.calc.breakeven.marginHint")} spec={SPEC.percent} />
            <NumField label={t("crm.tools.calc.breakeven.avgCheck")} value={avgCheck} onChange={(v) => { setAvgCheck(v); persist({ avgCheck: v }); }} suffix={som} spec={SPEC.money} />
            <NumField label={t("crm.tools.calc.breakeven.tax")} value={tax} onChange={(v) => { setTax(v); persist({ tax: v }); }} suffix="%" spec={SPEC.tax} />
            <NumField label={t("crm.tools.calc.breakeven.days")} value={days} onChange={(v) => { setDays(v); persist({ days: v }); }} spec={SPEC.days} />
          </div>
        </Step>

        <Step n={3} title={t("crm.tools.calc.breakeven.step3")} note={t("crm.tools.calc.breakeven.step3Note")}>
          <NumField label={t("crm.tools.calc.breakeven.target")} value={target} onChange={(v) => { setTarget(v); persist({ target: v }); }} suffix={som} spec={SPEC.money} />
        </Step>

        <p className="calc__formula">{t("crm.tools.calc.breakeven.formula")}</p>
        <p className="calc-hint">{t("crm.tools.calc.breakeven.saved")}</p>
      </div>

      <aside className="calc__aside" aria-label={t("crm.tools.calc.breakeven.resultTitle")}>
        {marginInvalid && <Banner tone="danger">{t("crm.tools.calc.breakeven.warnMarginTax")}</Banner>}
        {ready ? (
          <>
            <Hero
              label={t("crm.tools.calc.breakeven.heroLabel")}
              value={t("crm.tools.calc.breakeven.heroPerDay", { sum: `${fmt(breakeven!.perDay)} ${som}` })}
              sub={
                breakeven!.checksPerDay != null
                  ? t("crm.tools.calc.breakeven.heroChecks", { value: fmt1(breakeven!.checksPerDay) })
                  : undefined
              }
            />
            <div className="calc__tiles">
              <Tile label={t("crm.tools.calc.breakeven.monthly")} value={`${fmt(breakeven!.monthly)} ${som}`} />
              <Tile label={t("crm.tools.calc.breakeven.fixedLabel")} value={`${fmt(fixed)} ${som}`} />
            </div>
          </>
        ) : (
          <div className="calc__plain">
            {hasErrors ? t("crm.tools.calc.fixErrors") : t("crm.tools.calc.breakeven.fillIn")}
          </div>
        )}

        {goal && (
          <div className="calc__tiles">
            <Tile label={t("crm.tools.calc.breakeven.goalRevenue")} value={`${fmt(goal.monthly)} ${som}`} tone="good" />
            <Tile label={t("crm.tools.calc.breakeven.goalPerDay")} value={`${fmt(goal.perDay)} ${som}`} tone="good" />
          </div>
        )}

        <section className="calc-step">
          <header className="calc-step__head">
            <div>
              <h3 className="calc-step__title">{t("crm.tools.calc.breakeven.factTitle")}</h3>
              <p className="calc-step__note">{t("crm.tools.calc.breakeven.factHint")}</p>
            </div>
          </header>
          {monthError ? (
            <Banner tone="warning">{t("crm.tools.calc.breakeven.offline")}</Banner>
          ) : monthRevenue == null ? (
            <p className="calc-hint">{t("crm.tools.calc.breakeven.factLoad")}</p>
          ) : (
            <div className="calc-step__body">
              <Tile label={t("crm.tools.calc.breakeven.factRevenue")} value={`${fmt(monthRevenue)} ${som}`} />
              <Progress label={t("crm.tools.calc.breakeven.factVsBreakeven")} percent={progress(breakeven?.monthly)} />
              {goal && <Progress label={t("crm.tools.calc.breakeven.factVsGoal")} percent={progress(goal.monthly)} />}
            </div>
          )}
          <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={() => void loadMonth()}>
            {t("common.refresh")}
          </button>
        </section>
      </aside>
    </div>
  );
}
