/**
 * Pure reminder scheduling: given upcoming appointments and "now", decide
 * which (appointment, offset) reminders are due. A reminder at offset N is due
 * once the appointment start is within N minutes of now (and still future).
 * Dedup (send-once) is enforced separately by the reminder_log unique key, so
 * this stays a pure, cadence-independent decision.
 */

export const REMINDER_OFFSETS = [30, 15] as const;

export interface UpcomingAppointment {
  readonly id: string;
  readonly startAt: Date;
}

export interface DueReminder {
  readonly appointmentId: string;
  readonly offsetMinutes: number;
}

/** Offsets that have been "crossed" for a single appointment. */
export function dueOffsets(
  startAt: Date,
  now: Date,
  offsets: readonly number[] = REMINDER_OFFSETS,
): number[] {
  const msLeft = startAt.getTime() - now.getTime();
  if (msLeft <= 0) return [];
  return offsets.filter((o) => msLeft <= o * 60_000);
}

/** Flatten all due (appointment, offset) reminders across a set of appts. */
export function selectDueReminders(
  appointments: readonly UpcomingAppointment[],
  now: Date,
  offsets: readonly number[] = REMINDER_OFFSETS,
): DueReminder[] {
  const out: DueReminder[] = [];
  for (const appt of appointments) {
    for (const offsetMinutes of dueOffsets(appt.startAt, now, offsets)) {
      out.push({ appointmentId: appt.id, offsetMinutes });
    }
  }
  return out;
}
