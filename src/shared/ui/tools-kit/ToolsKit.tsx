import "./tools-kit.scss";
import { useTranslation } from "react-i18next";
import {
  fromDateInputValue,
  toDateInputValue,
  type DateRange,
  type PeriodPreset,
} from "@shared/lib/period";

type SegmentedProps<T extends string> = {
  label?: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div
      className={`tk-segmented ${className}`.trim()}
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`tk-segmented__btn${
            o.value === value ? " tk-segmented__btn--active" : ""
          }`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type PeriodSwitcherProps = {
  presets: PeriodPreset[];
  preset: PeriodPreset;
  custom: Partial<DateRange> | null;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomChange: (range: { from: Date; to: Date }) => void;
};

/** «Сегодня / Неделя / Месяц / (Квартал) / Спец. дата» + календарь для своих дат. */
export function PeriodSwitcher({
  presets,
  preset,
  custom,
  onPresetChange,
  onCustomChange,
}: PeriodSwitcherProps) {
  const { t } = useTranslation();
  const labels: Record<PeriodPreset, string> = {
    today: t("crm.tools.period.today"),
    week: t("crm.tools.period.week"),
    month: t("crm.tools.period.month"),
    quarter: t("crm.tools.period.quarter"),
    custom: t("crm.tools.period.custom"),
  };
  const today = new Date();
  const from = custom?.from ?? today;
  const to = custom?.to ?? today;

  return (
    <div className="tk-period">
      <Segmented
        label={t("crm.tools.period.label")}
        options={presets.map((p) => ({ value: p, label: labels[p] }))}
        value={preset}
        // Повторное нажатие на «Спец. дата» оставляет календарь открытым
        onChange={onPresetChange}
      />
      {preset === "custom" && (
        <div className="tk-period__dates">
          <label className="nur-field">
            <span className="nur-label">{t("crm.tools.period.from")}</span>
            <input
              type="date"
              className="nur-input"
              value={toDateInputValue(from)}
              max={toDateInputValue(to)}
              onChange={(e) => {
                const d = fromDateInputValue(e.target.value);
                if (d) onCustomChange({ from: d, to });
              }}
            />
          </label>
          <label className="nur-field">
            <span className="nur-label">{t("crm.tools.period.to")}</span>
            <input
              type="date"
              className="nur-input"
              value={toDateInputValue(to)}
              min={toDateInputValue(from)}
              onChange={(e) => {
                const d = fromDateInputValue(e.target.value);
                if (d) onCustomChange({ from, to: d });
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function Banner({
  tone = "default",
  children,
}: {
  tone?: "default" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`tk-banner${tone !== "default" ? ` tk-banner--${tone}` : ""}`}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

/** Заглушка раздела, закрытого правами или тарифом: говорит, что именно включить. */
export function NoAccess({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="nur-empty" role="status">
      <h3 className="nur-empty__title">{title}</h3>
      <p className="nur-empty__text">{text}</p>
    </div>
  );
}
