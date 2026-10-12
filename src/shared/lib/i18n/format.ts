import { BUSINESS_TIMEZONE, toBcp47 } from "@shared/config/locale";

export function formatMoneyAmount(
  value: number,
  lng?: string | null,
): string {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(toBcp47(lng), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatInteger(value: number, lng?: string | null): string {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(toBcp47(lng), {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  isoOrDate: string | Date,
  lng?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TIMEZONE,
  },
): string {
  const date =
    isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(toBcp47(lng), options).format(date);
}
 