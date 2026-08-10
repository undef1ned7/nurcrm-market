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
  return (
    <div className="cdx__toolbar">
      <div className="cdx__toolbar-dates">
        <div className="cdx__field">
          <label className="cdx__field-label">Дата с</label>
          <input
            className="cdx__input"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="cdx__field">
          <label className="cdx__field-label">Дата по</label>
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
          Сегодня
        </button>
        <button
          type="button"
          className="cdx__chip"
          onClick={() => onPreset("week")}
        >
          Неделя
        </button>
        <button
          type="button"
          className="cdx__chip"
          onClick={() => onPreset("month")}
        >
          Месяц
        </button>
        <button
          type="button"
          className="cdx__chip cdx__chip--clear"
          onClick={() => onPreset("clear")}
        >
          Очистить
        </button>
      </div>

      <div className="cdx__toolbar-info">
        Показано: <b>{filteredCount}</b> из {totalCount}
      </div>
    </div>
  );
}
