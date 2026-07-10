import { ValidationError } from "@/domain/errors";

/** Shared weekly-hours parsing for the admin and barber-self-service editors. */

export interface WeeklyRule {
  readonly weekday: number;
  readonly startMin: number;
  readonly endMin: number;
}

/**
 * Parse the editor's pipe-separated payload (seven "H:MM-H:MM" fields keyed
 * Sun..Sat, blank = closed) into availability rules. Throws on a malformed
 * payload or an inverted range.
 */
export function parseWeeklyHours(hours: string): WeeklyRule[] {
  const dayFields = hours.split("|");
  if (dayFields.length !== 7) throw new ValidationError("Malformed hours payload.");

  const rules: WeeklyRule[] = [];
  dayFields.forEach((field, weekday) => {
    const trimmed = field.trim();
    if (!trimmed) return;
    const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!m) {
      throw new ValidationError(
        "Hours must look like 9:00-18:00 (or be blank for closed).",
      );
    }
    const startMin = Number(m[1]) * 60 + Number(m[2]);
    const endMin = Number(m[3]) * 60 + Number(m[4]);
    if (startMin > 24 * 60 || endMin > 24 * 60) {
      throw new ValidationError("Hours must be within a 24-hour day.");
    }
    if (endMin <= startMin) throw new ValidationError("End must be after start.");
    rules.push({ weekday, startMin, endMin });
  });
  return rules;
}
