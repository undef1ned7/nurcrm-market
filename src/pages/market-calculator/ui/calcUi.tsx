import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { checkNum, type NumSpec } from "./calcUtils";

/**
 * Числовое поле с единицей справа («сом», «%») и подсказкой под ним.
 * С `spec` проверяет ввод и показывает ошибку у поля — вместо молчаливого нуля.
 */
export function NumField({
  id,
  label,
  value,
  onChange,
  suffix,
  hint,
  placeholder,
  spec,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  spec?: NumSpec;
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id || `calc-num-${autoId}`;
  const errorId = `${inputId}-error`;
  const { error } = checkNum(value, spec);
  const fmt = (n: number) => String(n).replace(".", ",");
  const errorText =
    error === "format"
      ? t("crm.tools.calc.errors.format")
      : error === "min"
        ? spec?.minExclusive
          ? t("crm.tools.calc.errors.gt", { value: fmt(spec.min as number) })
          : t("crm.tools.calc.errors.min", { value: fmt(spec?.min as number) })
        : error === "max"
          ? spec?.maxExclusive
            ? t("crm.tools.calc.errors.lt", { value: fmt(spec.max as number) })
            : t("crm.tools.calc.errors.max", { value: fmt(spec?.max as number) })
          : "";

  return (
    <div className="nur-field calc-field">
      <label className="nur-label" htmlFor={inputId}>
        {label}
      </label>
      <div className={`calc-input${error ? " is-invalid" : ""}`}>
        <input
          id={inputId}
          className="nur-input"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? <span className="calc-input__suffix">{suffix}</span> : null}
      </div>
      {error ? (
        <span id={errorId} className="calc-error" role="alert">
          {errorText}
        </span>
      ) : hint ? (
        <span className="calc-hint">{hint}</span>
      ) : null}
    </div>
  );
}

/** Нумерованный шаг формы: понятный порядок «что вводить дальше». */
export function Step({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="calc-step">
      <header className="calc-step__head">
        <span className="calc-step__num" aria-hidden>
          {n}
        </span>
        <div>
          <h3 className="calc-step__title">{title}</h3>
          {note ? <p className="calc-step__note">{note}</p> : null}
        </div>
      </header>
      <div className="calc-step__body">{children}</div>
    </section>
  );
}

/** Главный результат расчёта крупно. */
export function Hero({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className={`calc-hero calc-hero--${tone}`} aria-live="polite">
      <span className="calc-hero__label">{label}</span>
      <strong className="calc-hero__value">{value}</strong>
      {sub ? <span className="calc-hero__sub">{sub}</span> : null}
    </div>
  );
}

/** Маленькая плитка с числом (прибыль, наценка, маржа…). */
export function Tile({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
  hint?: string;
}) {
  return (
    <div className={`calc-tile calc-tile--${tone}`}>
      <span className="calc-tile__label">{label}</span>
      <strong className="calc-tile__value">{value}</strong>
      {hint ? <span className="calc-tile__hint">{hint}</span> : null}
    </div>
  );
}

export type BarPart = {
  key: string;
  label: string;
  value: number;
  className: string;
};

/** Полоса «из чего состоит цена»: закупка / налог / прибыль. */
export function PartsBar({
  parts,
  format,
}: {
  parts: BarPart[];
  format: (n: number) => string;
}) {
  const shown = parts.filter((p) => p.value > 0);
  const total = shown.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return null;
  return (
    <div className="calc-parts">
      <div className="calc-parts__bar" role="img" aria-label={shown.map((p) => `${p.label}: ${format(p.value)}`).join(", ")}>
        {shown.map((p) => (
          <span
            key={p.key}
            className={`calc-parts__seg ${p.className}`}
            style={{ width: `${(p.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="calc-parts__legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i className={`calc-parts__dot ${p.className}`} />
            <span>{p.label}</span>
            <strong>{format(p.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Полоса прогресса (выполнение плана месяца). */
export function Progress({
  label,
  percent,
  note,
}: {
  label: string;
  percent: number | null;
  note?: string;
}) {
  const value = percent == null ? 0 : Math.min(percent, 100);
  return (
    <div className="calc-progress">
      <div className="calc-progress__head">
        <span>{label}</span>
        <strong>{percent == null ? "—" : `${Math.round(percent)} %`}</strong>
      </div>
      <div className="calc-progress__track">
        <div
          className={`calc-progress__fill${percent != null && percent >= 100 ? " is-done" : ""}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {note ? <span className="calc-hint">{note}</span> : null}
    </div>
  );
}

/** Карточка-вариант (выбор способа расчёта). */
export function ChoiceCard({
  active,
  title,
  text,
  onClick,
}: {
  active: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`calc-choice${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}
