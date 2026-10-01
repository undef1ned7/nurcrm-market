import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Banner } from "@shared/ui/tools-kit";
import { calcDiscountEffect } from "@shared/lib/pricing";
import { hasValue, parseNum } from "./calcUtils";
import { Hero, NumField, Step, Tile } from "./calcUi";

/** «Скидка и акция»: во сколько раз больше нужно продать, чтобы скидка не уменьшила прибыль. */
export function DiscountTab() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const [margin, setMargin] = useState("30");
  const [discount, setDiscount] = useState("10");

  const ready = hasValue(margin) && hasValue(discount);
  const m = parseNum(margin);
  const d = parseNum(discount);
  const r = ready ? calcDiscountEffect(m, d) : null;
  const fmt = (n: number) =>
    n.toLocaleString(lng, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const left = Math.max(m - d, 0);

  return (
    <div className="calc__layout">
      <div className="calc__form">
        <Step n={1} title={t("crm.tools.calc.discount.step1")} note={t("crm.tools.calc.discount.step1Note")}>
          <NumField label={t("crm.tools.calc.discount.margin")} value={margin} onChange={setMargin} suffix="%" hint={t("crm.tools.calc.discount.marginHint")} />
        </Step>
        <Step n={2} title={t("crm.tools.calc.discount.step2")} note={t("crm.tools.calc.discount.step2Note")}>
          <NumField label={t("crm.tools.calc.discount.discount")} value={discount} onChange={setDiscount} suffix="%" />
        </Step>
        <p className="calc__formula">{t("crm.tools.calc.discount.formula")}</p>
        <p className="calc-hint">{t("crm.tools.calc.discount.example")}</p>
      </div>

      <aside className="calc__aside" aria-label={t("crm.tools.calc.discount.result")}>
        {r?.isLoss && <Banner tone="danger">{t("crm.tools.calc.discount.warnLoss")}</Banner>}
        {r ? (
          <>
            <Hero
              label={t("crm.tools.calc.discount.multiplierLabel")}
              value={r.multiplier == null ? "—" : t("crm.tools.calc.discount.multiplier", { value: fmt(r.multiplier) })}
              tone={r.isLoss ? "bad" : "default"}
            />
            <p className={`calc__plain${r.isLoss ? " calc__plain--bad" : ""}`}>
              {r.isLoss
                ? t("crm.tools.calc.discount.plainLoss", { discount: fmt(d), margin: fmt(m) })
                : t("crm.tools.calc.discount.plain", { before: fmt(m), after: fmt(left), discount: fmt(d) })}
            </p>
            <div className="calc__tiles">
              <Tile label={t("crm.tools.calc.discount.profitBefore")} value={`${fmt(m)} %`} hint={t("crm.tools.calc.discount.profitHint")} />
              <Tile
                label={t("crm.tools.calc.discount.profitAfter")}
                value={`${fmt(left)} %`}
                tone={r.isLoss ? "bad" : "warn"}
                hint={t("crm.tools.calc.discount.profitHint")}
              />
              <Tile
                label={t("crm.tools.calc.discount.marginAfter")}
                value={Number.isFinite(r.marginAfter) ? `${fmt(r.marginAfter)} %` : "—"}
                tone={r.marginAfter <= 0 ? "bad" : "default"}
                hint={t("crm.tools.calc.discount.marginAfterHint")}
              />
            </div>
          </>
        ) : (
          <div className="calc__plain">{t("crm.tools.calc.price.fillIn")}</div>
        )}
      </aside>
    </div>
  );
}
