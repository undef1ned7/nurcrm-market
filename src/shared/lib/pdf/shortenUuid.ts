const UUID_RE =
  /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/gi;

/** `4734b29a…0b23` — достаточно, чтобы найти продажу по префиксу id. */
export function shortenUuid(uuid: string) {
  const compact = String(uuid).replace(/-/g, "");
  if (compact.length < 12) return uuid;
  return `${compact.slice(0, 8)}…${compact.slice(-4)}`;
}

export function shortenUuidsInText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(UUID_RE, (match) => shortenUuid(match));
}
