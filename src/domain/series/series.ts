import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Pure recurring-series expansion. A series is "every N weeks on weekday W at
 * wall time T" anchored at a start date. Occurrences are computed as SHOP-TZ
 * WALL TIMES and only then converted to UTC instants - never by adding
 * N*7*24h to an instant, which drifts across DST transitions.
 */

export interface SeriesSpec {
  /** First booked date of the series, YYYY-MM-DD in shop timezone. */
  readonly anchorDate: string;
  readonly cadenceWeeks: number;
  /** Minutes from shop-local midnight. */
  readonly timeMin: number;
}

export interface Occurrence {
  /** YYYY-MM-DD in shop timezone. */
  readonly date: string;
  readonly startUtc: Date;
}

/** Shop-local wall time (date + minutes) to a UTC instant. */
export function wallTimeToUtc(
  date: string,
  minutes: number,
  timezone: string,
): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${date} ${hh}:${mm}:00`, timezone);
}

/**
 * Expand occurrences with dates in (fromDate, horizonDate]. The anchor
 * occurrence itself is excluded (it is booked directly at series creation).
 */
export function expandSeries({
  spec,
  fromDate,
  horizonDate,
  timezone,
}: {
  spec: SeriesSpec;
  /** Exclusive lower bound, YYYY-MM-DD (usually today or the anchor). */
  fromDate: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  horizonDate: string;
  timezone: string;
}): Occurrence[] {
  const out: Occurrence[] = [];
  // Walk anchor + k*cadence weeks in CALENDAR days (DST-safe: date math only).
  const anchorNoon = new Date(`${spec.anchorDate}T12:00:00Z`);
  for (let k = 1; k < 1000; k++) {
    const date = format(addDays(anchorNoon, k * spec.cadenceWeeks * 7), "yyyy-MM-dd");
    if (date <= fromDate) continue;
    if (date > horizonDate) break;
    out.push({ date, startUtc: wallTimeToUtc(date, spec.timeMin, timezone) });
  }
  return out;
}

export interface BusyInterval {
  readonly startAt: Date;
  readonly endAt: Date;
}

/** True when [start, end) overlaps any busy interval. */
export function hasConflict(
  startUtc: Date,
  durationMin: number,
  busy: readonly BusyInterval[],
): boolean {
  const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
  return busy.some((b) => startUtc < b.endAt && b.startAt < endUtc);
}

/**
 * Nearest conflict-free start on the same day, searching outward from the
 * preferred time in `granularityMin` steps within [dayStartMin, dayEndMin].
 * Returns null when nothing fits.
 */
export function proposeAlternative({
  date,
  preferredMin,
  durationMin,
  granularityMin,
  dayStartMin,
  dayEndMin,
  busy,
  timezone,
}: {
  date: string;
  preferredMin: number;
  durationMin: number;
  granularityMin: number;
  dayStartMin: number;
  dayEndMin: number;
  busy: readonly BusyInterval[];
  timezone: string;
}): { startMin: number; startUtc: Date } | null {
  for (let step = 1; step < 200; step++) {
    for (const sign of [1, -1]) {
      const candidate = preferredMin + sign * step * granularityMin;
      if (candidate < dayStartMin || candidate + durationMin > dayEndMin) continue;
      const startUtc = wallTimeToUtc(date, candidate, timezone);
      if (!hasConflict(startUtc, durationMin, busy)) {
        return { startMin: candidate, startUtc };
      }
    }
    const lowExhausted = preferredMin - step * granularityMin < dayStartMin;
    const highExhausted =
      preferredMin + step * granularityMin + durationMin > dayEndMin;
    if (lowExhausted && highExhausted) break;
  }
  return null;
}
