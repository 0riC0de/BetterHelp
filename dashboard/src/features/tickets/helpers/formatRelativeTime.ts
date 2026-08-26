export function formatRelativeTime(isoDate: string, now: number): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const intervals = [
    [60, "second"], [60, "minute"], [24, "hour"], [7, "day"],
    [4.345, "week"], [12, "month"], [Number.POSITIVE_INFINITY, "year"],
  ] as const;
  let value = Math.round((new Date(isoDate).getTime() - now) / 1_000);
  for (const [boundary, unit] of intervals) {
    if (Math.abs(value) < boundary) return formatter.format(Math.round(value), unit);
    value /= boundary;
  }
  return formatter.format(Math.round(value), "year");
}
