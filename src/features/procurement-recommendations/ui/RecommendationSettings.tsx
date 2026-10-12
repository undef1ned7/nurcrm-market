import {
  ANALYSIS_DAY_OPTIONS,
  COVERAGE_DAY_OPTIONS,
  SAFETY_DAY_OPTIONS,
} from "../model/constants";
import type { ProcurementRecommendationsVm } from "../model/useProcurementRecommendations";

type Props = {
  vm: ProcurementRecommendationsVm;
};

export function RecommendationSettings({ vm }: Props) {
  const { settings, updateSettings, settingsOpen } = vm;
  if (!settingsOpen) return null;

  return (
    <div className="procurement-recommendations__settings">
      <div className="procurement-recommendations__settings-grid">
        <label className="nur-label">
          Период анализа
          <select
            className="nur-input"
            value={settings.analysisDays}
            onChange={(e) =>
              updateSettings({
                analysisDays: Number(e.target.value) as typeof settings.analysisDays,
              })
            }
          >
            {ANALYSIS_DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} дн.
              </option>
            ))}
          </select>
        </label>
        <label className="nur-label">
          Запас до следующей закупки
          <select
            className="nur-input"
            value={settings.coverageDays}
            onChange={(e) =>
              updateSettings({
                coverageDays: Number(e.target.value) as typeof settings.coverageDays,
              })
            }
          >
            {COVERAGE_DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} дн.
              </option>
            ))}
          </select>
        </label>
        <label className="nur-label">
          Страховой запас
          <select
            className="nur-input"
            value={settings.safetyDays}
            onChange={(e) =>
              updateSettings({
                safetyDays: Number(e.target.value) as typeof settings.safetyDays,
              })
            }
          >
            {SAFETY_DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} дн.
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="procurement-recommendations__settings-hint">
        Рекомендация = продажи в день × (запас до закупки + страховой запас) −
        текущий остаток. Формула не заменяет проверку закупщика.
      </p>
    </div>
  );
}
