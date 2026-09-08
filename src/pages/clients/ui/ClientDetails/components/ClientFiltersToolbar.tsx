import { useTranslation } from "react-i18next";

export interface ClientFiltersToolbarProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPreset: (preset: "today" | "week" | "month" | "clear") => void;
  filteredCount: number;
  totalCount: number;
}

export function ClientFiltersToolbar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onPreset,
  filteredCount,
  totalCount,
}: ClientFiltersToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="cdx__toolbar">
      <div className="cdx__toolbar-dates">
        <div className="cdx__field">
          <label className="cdx__field-label">
            {t("crm.clients.details.dateFromShort")}
          </label>
          <input
            className="cdx__input"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="cdx__field">
          <label className="cdx__field-label">
            {t("crm.clients.details.dateToShort")}
          </label>
          <input
            className="cdx__input"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>
      </div>

      <div className="cdx__toolbar-presets">
        <button
          type="button"
          className="cdx__chip"
          onClick={() => onPreset("today")}
        >
          {t("crm.clients.details.presetToday")}
        </button>
        <button
          type="button"
          className="cdx__chip"
          onClick={() => onPreset("week")}
        >
          {t("crm.clients.details.presetWeek")}
        </button>
        <button
          type="button"
          className="cdx__chip"
          onClick={() => onPreset("month")}
        >
          {t("crm.clients.details.presetMonth")}
        </button>
        <button
          type="button"
          className="cdx__chip cdx__chip--clear"
          onClick={() => onPreset("clear")}
        >
          {t("crm.clients.details.presetClear")}
        </button>
      </div>

      <div className="cdx__toolbar-info">
        {t("crm.clients.details.shown")}: <b>{filteredCount}</b>{" "}
        {t("crm.clients.details.ofCount")} {totalCount}
      </div>
    </div>
  );
}
