export type DebtScheduleVersion = "v1" | "v2";

/** Это приложение — v2. v1 только если настройки явно говорят «v1». */
export const DEFAULT_DEBT_SCHEDULE_VERSION: DebtScheduleVersion = "v2";

export function parseDebtScheduleVersion(raw: unknown): DebtScheduleVersion {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "v1" || value === "1") return "v1";
  return "v2";
}

export function isDebtScheduleV2(version: unknown) {
  return parseDebtScheduleVersion(version) === "v2";
}
