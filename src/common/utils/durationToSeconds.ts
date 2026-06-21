/**
 * Parse a jsonwebtoken-style duration string ("8h", "7d", "30m", "120", "60s")
 * into seconds. Shared by users.service.ts (JWT signing) and
 * response.interceptor.ts (meta reported to the client) so the cookie maxAge,
 * the real JWT TTL, and the meta.accessTokenExpiresIn value always agree.
 *
 * Returns `fallbackSeconds` on bad/empty input.
 */
export function durationToSeconds(
  value: string | undefined,
  fallbackSeconds: number,
): number {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return fallbackSeconds;

  // Pure number → seconds (matches jsonwebtoken behavior).
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.floor(asNumber);

  const match = /^(\d+)\s*(ms|s|m|h|d|w|y)$/i.exec(raw);
  if (!match) return fallbackSeconds;

  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const SECOND = 1;
  const MINUTE = 60;
  const HOUR = 60 * 60;
  const DAY = 60 * 60 * 24;
  const WEEK = DAY * 7;
  const YEAR = DAY * 365;

  switch (unit) {
    case 'ms':
      return Math.max(1, Math.floor(n / 1000));
    case 's':
      return n * SECOND;
    case 'm':
      return n * MINUTE;
    case 'h':
      return n * HOUR;
    case 'd':
      return n * DAY;
    case 'w':
      return n * WEEK;
    case 'y':
      return n * YEAR;
    default:
      return fallbackSeconds;
  }
}
