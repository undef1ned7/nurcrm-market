import type { CSSProperties, ReactNode } from "react";

type Props = {
  id: string;
  /** Крупный заголовок слева, меняется вместе с ползунком. */
  title: ReactNode;
  /** Контрастный бейдж-итог справа. */
  badge: ReactNode;
  badgeHint?: ReactNode;
  value: number | "";
  /** Допустимые значения по порядку — ползунок ходит по их индексам. */
  steps: readonly number[];
  ticks: readonly number[];
  onChange: (value: number) => void;
  ariaLabel: string;
  formatValueText: (value: number) => string;
};

/** Ближайший шаг к значению: вне шкалы (старое состояние, ввод) — не ломаемся. */
function nearestStepIndex(steps: readonly number[], value: number) {
  let best = 0;
  steps.forEach((step, index) => {
    if (Math.abs(step - value) < Math.abs(steps[best] - value)) best = index;
  });
  return best;
}

export function PaymentPageTermSlider({
  id,
  title,
  badge,
  badgeHint,
  value,
  steps,
  ticks,
  onChange,
  ariaLabel,
  formatValueText,
}: Props) {
  const current = typeof value === "number" ? value : steps[0];
  const index = nearestStepIndex(steps, current);
  const lastIndex = Math.max(1, steps.length - 1);
  const fill = (index / lastIndex) * 100;

  return (
    <div className="payment-page__term">
      <div className="payment-page__term-head">
        <label className="payment-page__term-title" htmlFor={id}>
          {title}
        </label>
        <div className="payment-page__term-badge" aria-live="polite">
          <span className="payment-page__term-badge-main">{badge}</span>
          {badgeHint ? (
            <span className="payment-page__term-badge-hint">{badgeHint}</span>
          ) : null}
        </div>
      </div>

      <div
        className="payment-page__term-track"
        style={{ "--term-fill": `${fill}%` } as CSSProperties}
      >
        <input
          id={id}
          type="range"
          className="payment-page__term-range"
          min={0}
          max={lastIndex}
          step={1}
          value={index}
          onChange={(e) => onChange(steps[Number(e.target.value)] ?? steps[0])}
          aria-label={ariaLabel}
          aria-valuetext={formatValueText(steps[index])}
        />
        <div className="payment-page__term-ticks">
          {ticks.map((tick) => {
            const tickIndex = steps.indexOf(tick);
            if (tickIndex < 0) return null;
            const isActive = steps[index] === tick;
            return (
              <button
                key={tick}
                type="button"
                className={`payment-page__term-tick${
                  isActive ? " payment-page__term-tick--active" : ""
                }`}
                style={
                  {
                    "--term-tick": tickIndex / lastIndex,
                  } as CSSProperties
                }
                onClick={() => onChange(tick)}
                aria-label={formatValueText(tick)}
                aria-pressed={isActive}
              >
                {tick}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
