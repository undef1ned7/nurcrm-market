import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Segmented, Banner } from "@shared/ui/tools-kit";
import { calcBatchCost, type BatchDistribution } from "@shared/lib/pricing";
import { SPEC, isBad, readNum } from "./calcUtils";
import { Hero, NumField, Step } from "./calcUi";

type Line = { id: number; name: string; qty: string; price: string; weight: string };

let lineSeq = 1;
const newLine = (): Line => ({ id: lineSeq++, name: "", qty: "", price: "", weight: "" });

/** «Себестоимость партии»: разложить доставку и прочие расходы по товарам накладной. */
export function BatchTab() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const som = t("common.currencySom");
  const [lines, setLines] = useState<Line[]>(() => [newLine(), newLine()]);
  const [extra, setExtra] = useState("");
  const [rate, setRate] = useState("1");
  const [mode, setMode] = useState<BatchDistribution>("amount");
  const [markup, setMarkup] = useState("");

  const update = (id: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // Ошибочное поле не участвует в расчёте (как пустое) и подсвечено у самого поля.
  const result = useMemo(
    () =>
      calcBatchCost(
        lines.map((l) => ({
          name: l.name,
          qty: readNum(l.qty, SPEC.qty) ?? 0,
          price: readNum(l.price, SPEC.money) ?? 0,
          weight: readNum(l.weight, SPEC.qty) ?? undefined,
        })),
        readNum(extra, SPEC.money) ?? 0,
        readNum(rate, SPEC.rate) ?? 1,
        mode,
        readNum(markup, SPEC.markup) ?? undefined,
      ),
    [lines, extra, rate, mode, markup],
  );
  const hasErrors =
    isBad(extra, SPEC.money) ||
    isBad(rate, SPEC.rate) ||
    isBad(markup, SPEC.markup) ||
    lines.some((l) => isBad(l.qty, SPEC.qty) || isBad(l.price, SPEC.money) || isBad(l.weight, SPEC.qty));
  const extraNum = readNum(extra, SPEC.money) ?? 0;

  const fmt = (n: number) =>
    n.toLocaleString(lng, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const showMarkup = readNum(markup, SPEC.markup) !== null;

  return (
    <div className="tk-stack">
      <Step n={1} title={t("crm.tools.calc.batch.step1")} note={t("crm.tools.calc.batch.linesHint")}>
        <div className="calc__lines">
          {lines.map((l, i) => (
            <div key={l.id} className="calc__line">
              <label className="nur-field calc-field">
                <span className="nur-label">{t("crm.tools.calc.batch.product")} #{i + 1}</span>
                <input className="nur-input" value={l.name} onChange={(e) => update(l.id, { name: e.target.value })} />
              </label>
              <NumField label={t("crm.tools.calc.batch.qty")} value={l.qty} onChange={(v) => update(l.id, { qty: v })} spec={SPEC.qty} />
              <NumField label={t("crm.tools.calc.batch.price")} value={l.price} onChange={(v) => update(l.id, { price: v })} spec={SPEC.money} />
              <NumField label={t("crm.tools.calc.batch.weight")} value={l.weight} onChange={(v) => update(l.id, { weight: v })} suffix={t("crm.tools.calc.batch.kg")} spec={SPEC.qty} />
              <button
                type="button"
                className="nur-btn nur-btn--ghost nur-btn--sm"
                onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.id !== l.id) : p))}
                disabled={lines.length <= 1}
                aria-label={t("crm.tools.calc.batch.removeLine")}
                title={t("crm.tools.calc.batch.removeLine")}
              >
                <Trash2 size={14} />
                <span className="nur-btn__label">{t("crm.tools.calc.batch.removeLine")}</span>
              </button>
            </div>
          ))}
        </div>
        <div>
          <button type="button" className="nur-btn nur-btn--secondary nur-btn--sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus size={14} />
            <span className="nur-btn__label">{t("crm.tools.calc.batch.addLine")}</span>
          </button>
        </div>
      </Step>

      <Step n={2} title={t("crm.tools.calc.batch.step2")} note={t("crm.tools.calc.batch.step2Note")}>
        <div className="calc__row3">
          <NumField label={t("crm.tools.calc.batch.extra")} value={extra} onChange={setExtra} suffix={som} spec={SPEC.money} />
          <NumField label={t("crm.tools.calc.batch.rate")} value={rate} onChange={setRate} hint={t("crm.tools.calc.batch.rateHint")} spec={SPEC.rate} />
          <NumField label={t("crm.tools.calc.batch.markup")} value={markup} onChange={setMarkup} suffix="%" hint={t("crm.tools.calc.batch.markupHint")} spec={SPEC.markup} />
        </div>
        <div className="nur-field calc-field">
          <span className="nur-label">{t("crm.tools.calc.batch.distribute")}</span>
          <Segmented<BatchDistribution>
            options={[
              { value: "amount", label: t("crm.tools.calc.batch.byAmount") },
              { value: "qty", label: t("crm.tools.calc.batch.byQty") },
              { value: "weight", label: t("crm.tools.calc.batch.byWeight") },
            ]}
            value={mode}
            onChange={setMode}
          />
          <span className="calc-hint">{t(`crm.tools.calc.batch.hint.${mode}`)}</span>
        </div>
        {result.weightMissing && <Banner tone="warning">{t("crm.tools.calc.batch.weightMissing")}</Banner>}
        {result.extraUndistributed && <Banner tone="warning">{t("crm.tools.calc.batch.extraUndistributed")}</Banner>}
      </Step>

      <Step n={3} title={t("crm.tools.calc.batch.result")} note={t("crm.tools.calc.batch.resultNote")}>
        <Hero
          label={t("crm.tools.calc.batch.total")}
          value={`${fmt(result.total)} ${som}`}
          sub={
            extraNum > 0 && !result.weightMissing && !result.extraUndistributed
              ? t("crm.tools.calc.batch.totalSub", { extra: `${fmt(extraNum)} ${som}` })
              : undefined
          }
        />
        {hasErrors && <Banner tone="warning">{t("crm.tools.calc.fixErrors")}</Banner>}
        <div className="nur-table-wrap">
          <table className="nur-table nur-table--dense">
            <thead>
              <tr>
                <th>{t("crm.tools.calc.batch.product")}</th>
                <th className="tk-right">{t("crm.tools.calc.batch.lineSum", { cur: som })}</th>
                <th className="tk-right">{t("crm.tools.calc.batch.expenseShare")}</th>
                <th className="tk-right">{t("crm.tools.calc.batch.unitCost")}</th>
                {showMarkup && <th className="tk-right">{t("crm.tools.calc.batch.sellPrice")}</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id}>
                  <td>{l.name || `#${i + 1}`}</td>
                  <td className="tk-right">{fmt(result.lines[i].lineSum)}</td>
                  <td className="tk-right">{fmt(result.lines[i].expenseShare)}</td>
                  <td className="tk-right"><strong>{fmt(result.lines[i].unitCost)}</strong></td>
                  {showMarkup && (
                    <td className="tk-right">
                      {result.lines[i].suggestedPrice == null ? "—" : fmt(result.lines[i].suggestedPrice!)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Step>
    </div>
  );
}
