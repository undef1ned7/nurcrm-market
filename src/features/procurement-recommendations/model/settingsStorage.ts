import {
  ANALYSIS_DAY_OPTIONS,
  COVERAGE_DAY_OPTIONS,
  DEFAULT_RECOMMENDATION_SETTINGS,
  SAFETY_DAY_OPTIONS,
  SETTINGS_STORAGE_KEY,
} from "./constants";
import type {
  AnalysisDays,
  CoverageDays,
  ProcurementRecommendationSettings,
  SafetyDays,
} from "./types";

function includes<T extends number>(list: readonly T[], value: number): value is T {
  return list.includes(value as T);
}

export function loadRecommendationSettings(): ProcurementRecommendationSettings {
  if (typeof window === "undefined") return DEFAULT_RECOMMENDATION_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_RECOMMENDATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ProcurementRecommendationSettings>;
    const analysisDays = Number(parsed.analysisDays);
    const coverageDays = Number(parsed.coverageDays);
    const safetyDays = Number(parsed.safetyDays);
    return {
      analysisDays: includes(ANALYSIS_DAY_OPTIONS, analysisDays)
        ? analysisDays
        : DEFAULT_RECOMMENDATION_SETTINGS.analysisDays,
      coverageDays: includes(COVERAGE_DAY_OPTIONS, coverageDays)
        ? coverageDays
        : DEFAULT_RECOMMENDATION_SETTINGS.coverageDays,
      safetyDays: includes(SAFETY_DAY_OPTIONS, safetyDays)
        ? safetyDays
        : DEFAULT_RECOMMENDATION_SETTINGS.safetyDays,
    };
  } catch {
    return DEFAULT_RECOMMENDATION_SETTINGS;
  }
}

export function saveRecommendationSettings(
  settings: ProcurementRecommendationSettings,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}
