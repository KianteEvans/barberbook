import { fromZonedTime } from "date-fns-tz";

/**
 * Pure slot generation. All inputs are plain data so this is fully unit
 * testable: no DB, no clock, no globals.
 *
 * Availability rules are expressed in SHOP-LOCAL wall time (minutes from
 * midnight); each candidate slot is converted to a UTC instant via the shop's
 * IANA timezone, which makes DST handling automatic.
 */

export interface AvailabilityRule {
  readonly weekday: number; // 0 = Sunday
  readonly startMin: number;
  readonly endMin: number;
}

export interface AvailabilityException {
  readonly date: string; // YYYY-MM-DD in shop timezone
  readonly kind: "off" | "custom";
  readonly startMin: number | null;
  readonly endMin: number | null;
}

export interface BusyInterval {
  readonly startAt: Date;
  readonly endAt: Date;
}

export interface Slot {
  readonly startUtc: Date;
  readonly endUtc: Date;
}

export interface GenerateSlotsInput {
  /** Day to generate for, as YYYY-MM-DD in the SHOP timezone. */
  readonly date: string;
  readonly rules: readonly AvailabilityRule[];
  readonly exceptions: readonly AvailabilityException[];
  /** Existing live appointments (pending/confirmed) for the same barber. */
  readonly existing: readonly BusyInterval[];
  readonly serviceDurationMin: number;
  readonly bufferMin: number;
  readonly granularityMin: number;
  readonly timezone: string;
  /** Current instant; slots starting before this are dropped. */
  readonly now: Date;
}

/** Weekday (0-6, Sunday first) of a YYYY-MM-DD interpreted as a calendar date. */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  // Date.UTC avoids the local-machine timezone shifting the calendar day.
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Convert shop-local wall time (date + minutes) to a UTC instant. */
function wallTimeToUtc(date: string, minutes: number, timezone: string): Date {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return fromZonedTime(`${date} ${hh}:${mm}:00`, timezone);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate bookable slots for one barber on one shop-local calendar day.
 * A slot is emitted when the service (plus buffer) fits inside a working
 * window and does not overlap any existing live appointment.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const {
    date,
    rules,
    exceptions,
    existing,
    serviceDurationMin,
    bufferMin,
    granularityMin,
    timezone,
    now,
  } = input;

  // Resolve the day's working windows: exception wins over the weekly rule.
  const exception = exceptions.find((e) => e.date === date);
  let windows: Array<{ startMin: number; endMin: number }>;
  if (exception) {
    if (exception.kind === "off") return [];
    if (exception.startMin === null || exception.endMin === null) return [];
    windows = [{ startMin: exception.startMin, endMin: exception.endMin }];
  } else {
    const weekday = weekdayOf(date);
    windows = rules
      .filter((r) => r.weekday === weekday)
      .map((r) => ({ startMin: r.startMin, endMin: r.endMin }));
  }
  if (windows.length === 0) return [];

  const slots: Slot[] = [];
  const seen = new Set<number>();
  const blockMin = serviceDurationMin + bufferMin;

  for (const w of windows) {
    for (
      let startMin = w.startMin;
      startMin + blockMin <= w.endMin;
      startMin += granularityMin
    ) {
      const startUtc = wallTimeToUtc(date, startMin, timezone);
      // On the spring-forward DST day, nonexistent wall times (2:00-3:00)
      // resolve to the same instant as the post-jump hour - emit each instant
      // only once.
      if (seen.has(startUtc.getTime())) continue;
      seen.add(startUtc.getTime());
      const endUtc = wallTimeToUtc(date, startMin + serviceDurationMin, timezone);
      const blockEndUtc = wallTimeToUtc(date, startMin + blockMin, timezone);

      if (startUtc <= now) continue;
      const busy = existing.some((b) =>
        overlaps(startUtc, blockEndUtc, b.startAt, b.endAt),
      );
      if (busy) continue;

      slots.push({ startUtc, endUtc });
    }
  }

  return slots;
}
